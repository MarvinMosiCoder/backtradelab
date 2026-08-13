<?php

namespace App\Services;

use App\Models\MarketBacktestAccount;
use App\Models\MarketBacktestPosition;
use App\Models\MarketBacktestRiskSetting;
use Carbon\CarbonImmutable;

class MarketBacktestRiskGuardrailService
{
    public function evaluate(MarketBacktestAccount $account, MarketBacktestRiskSetting $settings, ?int $replayTime): array
    {
        $timestamp = $replayTime ?: time();
        $day = CarbonImmutable::createFromTimestampUTC($timestamp);
        $start = $day->startOfDay()->timestamp;
        $end = $day->endOfDay()->timestamp;

        $dayPositions = $account->positions()
            ->whereBetween('opened_at_time', [$start, $end]);
        $closedToday = $account->positions()
            ->where('status', 'closed')
            ->whereBetween('closed_at_time', [$start, $end])
            ->get(['realized_pnl']);
        $dailyNetPnl = round($closedToday->sum(fn ($position) => (float) $position->realized_pnl), 8);
        $dailyLoss = max(0, -$dailyNetPnl);
        $tradesToday = (clone $dayPositions)->count();
        $concurrentPositions = $account->positions()->whereIn('status', ['pending', 'open'])->count();
        $consecutiveLosses = $this->consecutiveLosses($account, $timestamp);

        $limits = [
            ['key' => 'max_daily_loss', 'label' => 'Daily loss limit', 'value' => $dailyLoss, 'limit' => $settings->max_daily_loss !== null ? (float) $settings->max_daily_loss : null],
            ['key' => 'max_trades_per_day', 'label' => 'Daily trade limit', 'value' => $tradesToday, 'limit' => $settings->max_trades_per_day],
            ['key' => 'max_concurrent_positions', 'label' => 'Concurrent position limit', 'value' => $concurrentPositions, 'limit' => $settings->max_concurrent_positions],
            ['key' => 'max_consecutive_losses', 'label' => 'Consecutive loss limit', 'value' => $consecutiveLosses, 'limit' => $settings->max_consecutive_losses],
        ];

        $breaches = collect($limits)
            ->filter(fn ($item) => $item['limit'] !== null && $item['value'] >= $item['limit'])
            ->map(fn ($item) => [
                ...$item,
                'message' => "{$item['label']} reached ({$item['value']} / {$item['limit']}).",
            ])
            ->values()
            ->all();

        return [
            'enabled' => $settings->is_enabled,
            'mode' => $settings->mode,
            'replayDay' => $day->toDateString(),
            'metrics' => compact('dailyNetPnl', 'dailyLoss', 'tradesToday', 'concurrentPositions', 'consecutiveLosses'),
            'breaches' => $settings->is_enabled ? $breaches : [],
            'blocked' => $settings->is_enabled && $settings->mode === 'enforced' && count($breaches) > 0,
        ];
    }

    private function consecutiveLosses(MarketBacktestAccount $account, int $timestamp): int
    {
        $recent = $account->positions()
            ->where('status', 'closed')
            ->where('closed_at_time', '<=', $timestamp)
            ->orderByDesc('closed_at_time')
            ->orderByDesc('id')
            ->limit(100)
            ->get(['realized_pnl']);

        $count = 0;
        foreach ($recent as $position) {
            if ((float) $position->realized_pnl >= 0) break;
            $count++;
        }

        return $count;
    }
}
