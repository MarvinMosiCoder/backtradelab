<?php

namespace App\Services;

use App\Models\MarketBacktestPosition;
use App\Models\TrainingChallengeAttempt;

/**
 * Scores a training challenge attempt on demand by reading already-closed
 * MarketBacktestPosition rows for the attempt's account/time-window.
 *
 * This intentionally follows the same lazy, report-time analytics style used
 * throughout this app (MarketBacktestReportService, MarketBacktestAdvancedAnalyticsService,
 * MarketBacktestInsightService) rather than hooking into position-close — there are no
 * event hooks into position-close anywhere in this codebase, and this service must not
 * add any either. See docs/developer/training-challenges.md for the full rationale.
 */
class TrainingChallengeScoringService
{
    public function score(TrainingChallengeAttempt $attempt): array
    {
        $rules = $attempt->challenge->rules;
        $query = MarketBacktestPosition::query()
            ->where('market_backtest_account_id', $attempt->market_backtest_account_id)
            ->where('status', 'closed')
            ->where('closed_at_time', '>=', $attempt->started_at->timestamp);
        if ($attempt->status !== 'active' && $attempt->completed_at) {
            $query->where('closed_at_time', '<=', $attempt->completed_at->timestamp);
        }
        $positions = $query->orderBy('closed_at_time')->get();

        $violations = [];
        if (!empty($rules['maxRiskPercentPerTrade'])) {
            foreach ($positions as $position) {
                $riskAmount = $position->stop_loss !== null
                    ? abs((float) $position->entry_price - (float) $position->stop_loss) * (float) ($position->original_quantity ?? $position->quantity)
                    : (float) ($position->original_margin ?? $position->margin);
                $riskPercent = (float) $attempt->starting_balance_snapshot > 0
                    ? ($riskAmount / (float) $attempt->starting_balance_snapshot) * 100
                    : 0;
                if ($riskPercent > $rules['maxRiskPercentPerTrade']) {
                    $violations[] = ['type' => 'risk_percent', 'positionId' => $position->id, 'riskPercent' => round($riskPercent, 2)];
                }
            }
        }
        if (!empty($rules['requirePlaybookId'])) {
            foreach ($positions as $position) {
                if ($position->market_backtest_playbook_id === null) {
                    $violations[] = ['type' => 'missing_playbook', 'positionId' => $position->id];
                }
            }
        }
        $hardFailed = false;
        if (!empty($rules['maxConsecutiveLosses'])) {
            $streak = 0;
            $maxStreak = 0;
            foreach ($positions as $position) {
                if ((float) $position->realized_pnl < 0) {
                    $streak++;
                    $maxStreak = max($maxStreak, $streak);
                } else {
                    $streak = 0;
                }
            }
            if ($maxStreak > $rules['maxConsecutiveLosses']) {
                $violations[] = ['type' => 'loss_streak', 'streak' => $maxStreak];
                $hardFailed = true;
            }
        }

        $tradeCount = $positions->count();
        $requiredTrades = $rules['requiredTrades'] ?? null;

        return [
            'tradeCount' => $tradeCount,
            'requiredTrades' => $requiredTrades,
            'progressPercent' => $requiredTrades ? min(100, round($tradeCount / $requiredTrades * 100, 1)) : null,
            'violations' => $violations,
            'netPnl' => round($positions->sum('realized_pnl'), 8),
            'winRate' => $tradeCount ? round($positions->filter(fn ($p) => (float) $p->realized_pnl > 0)->count() / $tradeCount * 100, 2) : 0,
            'eligible' => $requiredTrades ? $tradeCount >= $requiredTrades : false,
            'passed' => empty($violations) && ($requiredTrades ? $tradeCount >= $requiredTrades : false),
            'hardFailed' => $hardFailed,
        ];
    }
}
