<?php

namespace App\Http\Controllers;

use App\Models\MarketBacktestAccount;
use App\Models\TrainingChallenge;
use App\Models\TrainingChallengeAttempt;
use App\Services\TrainingChallengeScoringService;
use Illuminate\Http\Request;

class TrainingChallengeController extends Controller
{
    private const DEFAULT_BALANCE = 10000;

    public function __construct(private readonly TrainingChallengeScoringService $scoringService)
    {
    }

    /**
     * JSON catalog of active challenges plus the authenticated user's most recent
     * attempt summary for each (mounted at GET /training-challenges/catalog).
     */
    public function index(Request $request)
    {
        $challenges = TrainingChallenge::where('is_active', true)->get();

        $challengeIds = $challenges->pluck('id');
        $latestAttempts = TrainingChallengeAttempt::query()
            ->where('adm_user_id', $request->user()->id)
            ->whereIn('training_challenge_id', $challengeIds)
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('training_challenge_id')
            ->map(fn ($attempts) => $attempts->first());

        $catalog = $challenges->map(function (TrainingChallenge $challenge) use ($latestAttempts) {
            $attempt = $latestAttempts->get($challenge->id);
            $summary = null;

            if ($attempt) {
                $score = $attempt->status === 'active'
                    ? $this->scoringService->score($attempt)
                    : $attempt->result_snapshot;

                $summary = [
                    'attempt' => $this->serializeAttempt($attempt),
                    'score' => $score,
                ];
            }

            return [
                ...$this->serializeChallenge($challenge),
                'latestAttempt' => $summary,
            ];
        });

        return response()->json([
            'success' => true,
            'challenges' => $catalog,
        ]);
    }

    public function startAttempt(Request $request, TrainingChallenge $challenge)
    {
        $existingActive = TrainingChallengeAttempt::query()
            ->where('adm_user_id', $request->user()->id)
            ->where('training_challenge_id', $challenge->id)
            ->where('status', 'active')
            ->first();

        if ($existingActive) {
            return response()->json([
                'success' => false,
                'message' => 'You already have an active attempt for this challenge.',
            ], 422);
        }

        $account = $this->getOrCreateAccount($request);

        $attempt = TrainingChallengeAttempt::create([
            'adm_user_id' => $request->user()->id,
            'training_challenge_id' => $challenge->id,
            'market_backtest_account_id' => $account->id,
            'starting_balance_snapshot' => $account->cash_balance,
            'started_at' => now(),
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'attempt' => $this->serializeAttempt($attempt),
        ], 201);
    }

    public function showAttempt(Request $request, TrainingChallengeAttempt $attempt)
    {
        $attempt = $this->owned($request, $attempt);

        if ($attempt->status === 'active') {
            $score = $this->scoringService->score($attempt);

            if ($score['passed']) {
                $attempt->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                    'result_snapshot' => $score,
                ]);
            } elseif ($score['hardFailed']) {
                $attempt->update([
                    'status' => 'failed',
                    'completed_at' => now(),
                    'result_snapshot' => $score,
                ]);
            }
        } else {
            // Non-active attempts are frozen at their transition point; reuse the
            // stored snapshot rather than rescoring so a completed/failed/abandoned
            // attempt's result never drifts after the fact.
            $score = $attempt->result_snapshot ?? $this->scoringService->score($attempt);
        }

        return response()->json([
            'success' => true,
            'attempt' => $this->serializeAttempt($attempt->fresh()),
            'score' => $score,
        ]);
    }

    public function listMyAttempts(Request $request)
    {
        $attempts = TrainingChallengeAttempt::query()
            ->where('adm_user_id', $request->user()->id)
            ->with('challenge')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (TrainingChallengeAttempt $attempt) => [
                ...$this->serializeAttempt($attempt),
                'challenge' => $attempt->challenge ? $this->serializeChallenge($attempt->challenge) : null,
            ]);

        return response()->json([
            'success' => true,
            'attempts' => $attempts,
        ]);
    }

    public function abandonAttempt(Request $request, TrainingChallengeAttempt $attempt)
    {
        $attempt = $this->owned($request, $attempt);

        if ($attempt->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Only an active attempt can be abandoned.',
            ], 422);
        }

        $attempt->update([
            'status' => 'abandoned',
            'completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'attempt' => $this->serializeAttempt($attempt->fresh()),
        ]);
    }

    private function owned(Request $request, TrainingChallengeAttempt $attempt): TrainingChallengeAttempt
    {
        abort_unless($attempt->adm_user_id === $request->user()->id, 404);

        return $attempt;
    }

    private function getOrCreateAccount(Request $request): MarketBacktestAccount
    {
        $account = MarketBacktestAccount::query()
            ->where('adm_user_id', $request->user()->id)
            ->where('is_active', true)
            ->first();

        if ($account) {
            return $account;
        }

        return MarketBacktestAccount::query()->create([
            'adm_user_id' => $request->user()->id,
            'name' => 'Demo Account',
            'quote_currency' => 'USDT',
            'starting_balance' => self::DEFAULT_BALANCE,
            'cash_balance' => self::DEFAULT_BALANCE,
            'realized_pnl' => 0,
            'fees_paid' => 0,
            'is_active' => true,
        ]);
    }

    private function serializeChallenge(TrainingChallenge $challenge): array
    {
        return [
            'id' => $challenge->id,
            'slug' => $challenge->slug,
            'name' => $challenge->name,
            'description' => $challenge->description,
            'rules' => $challenge->rules,
            'isActive' => $challenge->is_active,
        ];
    }

    private function serializeAttempt(TrainingChallengeAttempt $attempt): array
    {
        return [
            'id' => $attempt->id,
            'challengeId' => $attempt->training_challenge_id,
            'accountId' => $attempt->market_backtest_account_id,
            'startingBalanceSnapshot' => (float) $attempt->starting_balance_snapshot,
            'startedAt' => optional($attempt->started_at)->toIso8601String(),
            'status' => $attempt->status,
            'completedAt' => optional($attempt->completed_at)->toIso8601String(),
            'resultSnapshot' => $attempt->result_snapshot,
        ];
    }
}
