<?php

namespace App\Services;

use App\Models\MarketBacktestPosition;
use Closure;
use Illuminate\Support\Collection;

class MarketBacktestInsightService
{
    public const MIN_TOTAL_TRADES = 30;

    private const MIN_GROUP_TRADES = 5;

    private const MIN_WIN_RATE_DEVIATION = 15.0;

    private const MAX_INSIGHTS = 3;

    public function build(Collection $positions): array
    {
        $total = $positions->count();

        if ($total < self::MIN_TOTAL_TRADES) {
            return [
                'eligible' => false,
                'requiredTrades' => self::MIN_TOTAL_TRADES,
                'currentTrades' => $total,
                'items' => [],
            ];
        }

        $items = collect([
            $this->riskRewardInsight($positions),
            $this->sideWinRateInsight($positions),
            $this->symbolWinRateInsight($positions),
            $this->holdingTimeInsight($positions),
            $this->setupTagInsight($positions),
        ])
            ->filter()
            ->sortByDesc('severity')
            ->take(self::MAX_INSIGHTS)
            ->values()
            ->map(fn (array $item) => collect($item)->except('severity')->all())
            ->all();

        return [
            'eligible' => true,
            'requiredTrades' => self::MIN_TOTAL_TRADES,
            'currentTrades' => $total,
            'items' => $items,
        ];
    }

    private function pnl(MarketBacktestPosition $position): float
    {
        return (float) $position->realized_pnl;
    }

    private function winRate(Collection $positions): float
    {
        $total = $positions->count();

        if ($total === 0) {
            return 0.0;
        }

        $wins = $positions->filter(fn (MarketBacktestPosition $position) => $this->pnl($position) > 0)->count();

        return round(($wins / $total) * 100, 2);
    }

    private function riskRewardInsight(Collection $positions): ?array
    {
        $wins = $positions->filter(fn (MarketBacktestPosition $position) => $this->pnl($position) > 0);
        $losses = $positions->filter(fn (MarketBacktestPosition $position) => $this->pnl($position) < 0);

        if ($wins->count() < self::MIN_GROUP_TRADES || $losses->count() < self::MIN_GROUP_TRADES) {
            return null;
        }

        $avgWin = $wins->avg(fn (MarketBacktestPosition $position) => $this->pnl($position));
        $avgLoss = abs($losses->avg(fn (MarketBacktestPosition $position) => $this->pnl($position)));

        if ($avgWin <= 0 || $avgLoss <= 0) {
            return null;
        }

        $ratio = $avgLoss / $avgWin;

        if ($ratio < 1.3) {
            return null;
        }

        return [
            'type' => 'risk_reward',
            'tone' => 'warning',
            'severity' => min($ratio / 3, 1.0),
            'title' => 'Average loss outweighs average win',
            'message' => sprintf(
                'Your average loss (%.2f) is %d%% larger than your average win (%.2f). Consider tightening stop-losses or letting winners run longer.',
                $avgLoss,
                round(($ratio - 1) * 100),
                $avgWin
            ),
        ];
    }

    private function sideWinRateInsight(Collection $positions): ?array
    {
        return $this->groupWinRateInsight(
            $positions,
            fn (MarketBacktestPosition $position) => $position->side ?: null,
            'side_win_rate',
            'side'
        );
    }

    private function symbolWinRateInsight(Collection $positions): ?array
    {
        return $this->groupWinRateInsight(
            $positions,
            fn (MarketBacktestPosition $position) => $position->symbol ?: null,
            'symbol_win_rate',
            'symbol'
        );
    }

    private function setupTagInsight(Collection $positions): ?array
    {
        return $this->groupWinRateInsight(
            $positions,
            function (MarketBacktestPosition $position) {
                $tag = trim((string) ($position->setup_tag ?? ''));

                return $tag === '' ? null : strtolower($tag);
            },
            'setup_tag_win_rate',
            'setup'
        );
    }

    private function groupWinRateInsight(Collection $positions, Closure $keyFn, string $type, string $noun): ?array
    {
        $overallWinRate = $this->winRate($positions);

        $groups = $positions
            ->filter(fn (MarketBacktestPosition $position) => $keyFn($position) !== null)
            ->groupBy($keyFn)
            ->filter(fn (Collection $group) => $group->count() >= self::MIN_GROUP_TRADES);

        if ($groups->isEmpty()) {
            return null;
        }

        $best = null;

        foreach ($groups as $key => $group) {
            $rate = $this->winRate($group);
            $deviation = $rate - $overallWinRate;

            if ($best === null || abs($deviation) > abs($best['deviation'])) {
                $best = ['key' => (string) $key, 'rate' => $rate, 'deviation' => $deviation, 'count' => $group->count()];
            }
        }

        if (abs($best['deviation']) < self::MIN_WIN_RATE_DEVIATION) {
            return null;
        }

        $isStrength = $best['deviation'] > 0;
        $label = ucfirst($best['key']);

        return [
            'type' => $type,
            'tone' => $isStrength ? 'positive' : 'warning',
            'severity' => min(abs($best['deviation']) / 50, 1.0),
            'title' => $isStrength
                ? sprintf('Strength: %s "%s"', $noun, $label)
                : sprintf('Weak spot: %s "%s"', $noun, $label),
            'message' => sprintf(
                'Your win rate on %s "%s" is %.0f%%, %s your overall %.0f%% win rate by %.0f points (%d trades).',
                $noun,
                $label,
                $best['rate'],
                $isStrength ? 'above' : 'below',
                $overallWinRate,
                abs($best['deviation']),
                $best['count']
            ),
        ];
    }

    private function holdingTimeInsight(Collection $positions): ?array
    {
        $durationsFor = fn (Collection $group) => $group
            ->filter(fn (MarketBacktestPosition $position) => $position->opened_at_time && $position->closed_at_time
                && (int) $position->closed_at_time > (int) $position->opened_at_time)
            ->map(fn (MarketBacktestPosition $position) => (int) $position->closed_at_time - (int) $position->opened_at_time);

        $winDurations = $durationsFor($positions->filter(fn (MarketBacktestPosition $position) => $this->pnl($position) > 0));
        $lossDurations = $durationsFor($positions->filter(fn (MarketBacktestPosition $position) => $this->pnl($position) < 0));

        if ($winDurations->count() < self::MIN_GROUP_TRADES || $lossDurations->count() < self::MIN_GROUP_TRADES) {
            return null;
        }

        $avgWinDuration = $winDurations->avg();
        $avgLossDuration = $lossDurations->avg();

        if ($avgWinDuration <= 0 || $avgLossDuration <= 0) {
            return null;
        }

        $ratio = max($avgWinDuration, $avgLossDuration) / min($avgWinDuration, $avgLossDuration);

        if ($ratio < 1.5) {
            return null;
        }

        $cuttingWinnersEarly = $avgLossDuration > $avgWinDuration;

        return [
            'type' => 'holding_time',
            'tone' => 'warning',
            'severity' => min($ratio / 4, 1.0),
            'title' => $cuttingWinnersEarly ? 'You may be cutting winners early' : 'You may be holding winners too long',
            'message' => $cuttingWinnersEarly
                ? sprintf(
                    'You hold losing trades %.1fx longer than winning trades on average (%s vs %s). This can be a sign of cutting winners early and letting losers run.',
                    $ratio,
                    $this->formatDuration($avgLossDuration),
                    $this->formatDuration($avgWinDuration)
                )
                : sprintf(
                    'You hold winning trades %.1fx longer than losing trades on average (%s vs %s).',
                    $ratio,
                    $this->formatDuration($avgWinDuration),
                    $this->formatDuration($avgLossDuration)
                ),
        ];
    }

    private function formatDuration(float $seconds): string
    {
        $minutes = $seconds / 60;

        if ($minutes < 60) {
            return round($minutes).'m';
        }

        $hours = $minutes / 60;

        if ($hours < 24) {
            return round($hours, 1).'h';
        }

        return round($hours / 24, 1).'d';
    }
}
