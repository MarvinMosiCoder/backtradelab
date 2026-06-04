<?php

namespace App\Http\Controllers;

use App\Models\MarketBacktestAccount;
use App\Models\MarketBacktestPosition;
use App\Models\MarketBacktestSession;
use App\Models\MarketBacktestSnapshot;
use App\Models\MarketBacktestTrade;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MarketBacktestController extends Controller
{
    private const DEFAULT_BALANCE = 10000;
    private const FEE_RATE = 0.0004;

    public function show(Request $request)
    {
        $validated = $request->validate([
            'symbol' => ['nullable', 'string', 'max:32', 'regex:/^[A-Za-z0-9]+$/'],
            'exchange' => ['nullable', 'string', 'max:32'],
            'category' => ['nullable', 'string', 'max:32'],
            'timeframe' => ['nullable', 'string', 'max:16'],
            'price' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $account = $this->getOrCreateAccount($request);
        $symbol = isset($validated['symbol']) ? strtoupper($validated['symbol']) : null;
        $price = isset($validated['price']) ? (float) $validated['price'] : null;
        $session = $this->getActiveSession($request, $account);

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload($account, $symbol, $price, $session),
        ]);
    }

    public function startSession(Request $request)
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'symbol' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9]+$/'],
            'exchange' => ['nullable', 'string', 'max:32'],
            'category' => ['nullable', 'string', 'max:32'],
            'timeframe' => ['nullable', 'string', 'max:16'],
            'started_at_time' => ['nullable', 'integer', 'min:0'],
        ]);

        $account = DB::transaction(function () use ($request, $validated) {
            $account = $this->getOrCreateAccount($request, true);

            $this->endActiveSessions($request, $account, $validated['started_at_time'] ?? null);
            $this->createSession($request, $account, $validated);

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload($account, strtoupper($validated['symbol']), null, $this->getActiveSession($request, $account)),
        ]);
    }

    public function endSession(Request $request, MarketBacktestSession $session)
    {
        $validated = $request->validate([
            'ended_at_time' => ['nullable', 'integer', 'min:0'],
        ]);

        $account = DB::transaction(function () use ($request, $session, $validated) {
            $account = $this->getOrCreateAccount($request, true);

            $session = MarketBacktestSession::query()
                ->where('id', $session->id)
                ->where('adm_user_id', $request->user()->id)
                ->where('market_backtest_account_id', $account->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($session->status === 'active') {
                $session->update([
                    'status' => 'ended',
                    'ended_at_time' => $validated['ended_at_time'] ?? time(),
                ]);
            }

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload($account, null, null, $this->getActiveSession($request, $account)),
        ]);
    }

    public function reset(Request $request)
    {
        $validated = $request->validate([
            'starting_balance' => ['nullable', 'numeric', 'min:1', 'max:1000000000'],
        ]);

        $account = DB::transaction(function () use ($request, $validated) {
            $account = $this->getOrCreateAccount($request, true);
            $startingBalance = (float) ($validated['starting_balance'] ?? self::DEFAULT_BALANCE);

            $account->positions()->delete();
            $account->trades()->delete();
            $account->update([
                'starting_balance' => $startingBalance,
                'cash_balance' => $startingBalance,
                'realized_pnl' => 0,
                'fees_paid' => 0,
            ]);

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload($account),
        ]);
    }

    public function report(Request $request)
    {
        $validated = $request->validate([
            'symbol' => ['nullable', 'string', 'max:32', 'regex:/^[A-Za-z0-9]+$/'],
            'session_id' => ['nullable', 'integer', 'min:1'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ]);

        $account = $this->getOrCreateAccount($request);
        $symbol = isset($validated['symbol']) ? strtoupper($validated['symbol']) : null;
        $sessionId = $validated['session_id'] ?? null;
        $limit = (int) ($validated['limit'] ?? 500);

        $positions = $this->getReportPositions($account, $symbol, $sessionId, $limit);

        $totalTrades = $positions->count();
        $wins = $positions->filter(fn (MarketBacktestPosition $position) => (float) $position->realized_pnl > 0);
        $losses = $positions->filter(fn (MarketBacktestPosition $position) => (float) $position->realized_pnl < 0);
        $breakeven = $positions->filter(fn (MarketBacktestPosition $position) => (float) $position->realized_pnl === 0.0);
        $netPnl = round($positions->sum(fn (MarketBacktestPosition $position) => (float) $position->realized_pnl), 8);
        $grossProfit = round($wins->sum(fn (MarketBacktestPosition $position) => (float) $position->realized_pnl), 8);
        $grossLoss = round($losses->sum(fn (MarketBacktestPosition $position) => (float) $position->realized_pnl), 8);
        $lossNetPnl = $grossLoss;
        $fees = round($positions->sum(fn (MarketBacktestPosition $position) => (float) $position->entry_fee + (float) $position->exit_fee), 8);

        return response()->json([
            'success' => true,
            'account' => [
                'id' => $account->id,
                'name' => $account->name,
                'quoteCurrency' => $account->quote_currency,
            ],
            'summary' => [
                'totalTrades' => $totalTrades,
                'wins' => $wins->count(),
                'losses' => $losses->count(),
                'breakeven' => $breakeven->count(),
                'winRate' => $totalTrades ? round(($wins->count() / $totalTrades) * 100, 2) : 0,
                'netPnl' => $netPnl,
                'grossProfit' => $grossProfit,
                'grossLoss' => $grossLoss,
                'lossNetPnl' => $lossNetPnl,
                'fees' => $fees,
                'averageWin' => $wins->count() ? round($grossProfit / $wins->count(), 8) : 0,
                'averageLoss' => $losses->count() ? round($grossLoss / $losses->count(), 8) : 0,
                'largestWin' => $wins->count() ? round($wins->max(fn (MarketBacktestPosition $position) => (float) $position->realized_pnl), 8) : 0,
                'largestLoss' => $losses->count() ? round($losses->min(fn (MarketBacktestPosition $position) => (float) $position->realized_pnl), 8) : 0,
            ],
            'trades' => $positions->map(fn (MarketBacktestPosition $position) => $this->serializeReportPosition($position))->values(),
        ]);
    }

    public function exportReport(Request $request)
    {
        $validated = $request->validate([
            'format' => ['nullable', Rule::in(['csv', 'json'])],
            'symbol' => ['nullable', 'string', 'max:32', 'regex:/^[A-Za-z0-9]+$/'],
            'session_id' => ['nullable', 'integer', 'min:1'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:5000'],
        ]);

        $account = $this->getOrCreateAccount($request);
        $format = $validated['format'] ?? 'csv';
        $symbol = isset($validated['symbol']) ? strtoupper($validated['symbol']) : null;
        $positions = $this->getReportPositions(
            $account,
            $symbol,
            $validated['session_id'] ?? null,
            (int) ($validated['limit'] ?? 5000)
        );
        $rows = $positions->map(fn (MarketBacktestPosition $position) => $this->serializeReportPosition($position))->values();
        $filename = 'backtest-trades-' . now()->format('Ymd-His') . '.' . $format;

        if ($format === 'json') {
            return response()->streamDownload(function () use ($rows) {
                echo json_encode($rows, JSON_PRETTY_PRINT);
            }, $filename, [
                'Content-Type' => 'application/json',
            ]);
        }

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'id',
                'session_id',
                'symbol',
                'side',
                'entry_price',
                'exit_price',
                'leverage',
                'margin',
                'notional',
                'fee',
                'pnl',
                'pnl_percent',
                'result',
                'setup_tag',
                'tags',
                'emotion',
                'entry_reason',
                'exit_reason',
                'mistake',
                'journal_notes',
                'entry_snapshot',
                'exit_snapshot',
                'opened_at_time',
                'closed_at_time',
            ]);

            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row['id'],
                    $row['sessionId'],
                    $row['symbol'],
                    $row['side'],
                    $row['entryPrice'],
                    $row['exitPrice'],
                    $row['leverage'],
                    $row['margin'],
                    $row['notional'],
                    $row['fee'],
                    $row['pnl'],
                    $row['pnlPercent'],
                    $row['result'],
                    $row['setupTag'],
                    implode('|', $row['tags'] ?? []),
                    $row['emotion'],
                    $row['entryReason'],
                    $row['exitReason'],
                    $row['mistake'],
                    $row['journalNotes'],
                    $row['entrySnapshotUrl'],
                    $row['exitSnapshotUrl'],
                    $row['openedAtTime'],
                    $row['closedAtTime'],
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function updateTradeJournal(Request $request, MarketBacktestPosition $position)
    {
        $validated = $request->validate([
            'setup_tag' => ['nullable', 'string', 'max:80'],
            'tags' => ['nullable', 'array', 'max:12'],
            'tags.*' => ['string', 'max:40'],
            'entry_reason' => ['nullable', 'string', 'max:2000'],
            'exit_reason' => ['nullable', 'string', 'max:2000'],
            'mistake' => ['nullable', 'string', 'max:2000'],
            'emotion' => ['nullable', 'string', 'max:80'],
            'journal_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $account = $this->getOrCreateAccount($request);

        $position = MarketBacktestPosition::query()
            ->where('id', $position->id)
            ->where('market_backtest_account_id', $account->id)
            ->where('status', 'closed')
            ->firstOrFail();

        $tags = collect($validated['tags'] ?? [])
            ->map(fn ($tag) => trim((string) $tag))
            ->filter()
            ->unique(fn ($tag) => strtolower($tag))
            ->take(12)
            ->values()
            ->all();

        $position->update([
            'setup_tag' => $this->nullableTrim($validated['setup_tag'] ?? null),
            'tags' => $tags,
            'entry_reason' => $this->nullableTrim($validated['entry_reason'] ?? null),
            'exit_reason' => $this->nullableTrim($validated['exit_reason'] ?? null),
            'mistake' => $this->nullableTrim($validated['mistake'] ?? null),
            'emotion' => $this->nullableTrim($validated['emotion'] ?? null),
            'journal_notes' => $this->nullableTrim($validated['journal_notes'] ?? null),
        ]);

        return response()->json([
            'success' => true,
            'trade' => $this->serializeReportPosition($position->fresh()),
        ]);
    }

    public function uploadPositionSnapshot(Request $request, MarketBacktestPosition $position)
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['entry', 'exit'])],
            'snapshot' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg', 'max:4096'],
            'captured_at_time' => ['nullable', 'integer', 'min:0'],
        ]);

        $account = $this->getOrCreateAccount($request);

        $position = MarketBacktestPosition::query()
            ->where('id', $position->id)
            ->where('market_backtest_account_id', $account->id)
            ->firstOrFail();

        $path = $request->file('snapshot')->store('market-backtest-snapshots', 'public');
        $url = $this->buildPublicStorageUrl($path);

        $snapshot = MarketBacktestSnapshot::query()->create([
            'market_backtest_account_id' => $account->id,
            'market_backtest_session_id' => $position->market_backtest_session_id,
            'market_backtest_position_id' => $position->id,
            'type' => $validated['type'],
            'path' => $path,
            'url' => $url,
            'captured_at_time' => $validated['captured_at_time'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'snapshot' => [
                'id' => $snapshot->id,
                'type' => $snapshot->type,
                'url' => $this->buildPublicStorageUrl($snapshot->path),
                'capturedAtTime' => $snapshot->captured_at_time,
            ],
        ]);
    }

    public function openPosition(Request $request)
    {
        $validated = $request->validate([
            'symbol' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9]+$/'],
            'side' => ['required', Rule::in(['long', 'short'])],
            'order_type' => ['nullable', Rule::in(['market', 'conditional', 'limit', 'trigger'])],
            'session_id' => ['nullable', 'integer', 'min:1'],
            'exchange' => ['nullable', 'string', 'max:32'],
            'category' => ['nullable', 'string', 'max:32'],
            'timeframe' => ['nullable', 'string', 'max:16'],
            'notional' => ['required', 'numeric', 'min:1', 'max:1000000000'],
            'leverage' => ['nullable', 'numeric', 'min:1', 'max:125'],
            'price' => ['required', 'numeric', 'gt:0'],
            'executed_at_time' => ['nullable', 'integer', 'min:0'],
            'stop_loss' => ['nullable', 'numeric', 'gt:0'],
            'take_profit' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $account = DB::transaction(function () use ($request, $validated) {
            $account = $this->getOrCreateAccount($request, true);
            $session = $this->resolveSessionForTrade($request, $account, $validated);
            $requestedMargin = round((float) $validated['notional'], 8);
            $leverage = round((float) ($validated['leverage'] ?? 1), 2);
            $price = (float) $validated['price'];
            $stopLoss = isset($validated['stop_loss']) ? (float) $validated['stop_loss'] : null;
            $takeProfit = isset($validated['take_profit']) ? (float) $validated['take_profit'] : null;
            $orderType = $validated['order_type'] ?? 'market';
            $isPendingOrder = in_array($orderType, ['conditional', 'limit', 'trigger'], true);

            if ($validated['side'] === 'long') {
                if ($stopLoss !== null && $stopLoss >= $price) {
                    abort(response()->json([
                        'success' => false,
                        'message' => 'Long stop loss must be below entry price.',
                    ], 422));
                }

                if ($takeProfit !== null && $takeProfit <= $price) {
                    abort(response()->json([
                        'success' => false,
                        'message' => 'Long take profit must be above entry price.',
                    ], 422));
                }
            }

            if ($validated['side'] === 'short') {
                if ($stopLoss !== null && $stopLoss <= $price) {
                    abort(response()->json([
                        'success' => false,
                        'message' => 'Short stop loss must be above entry price.',
                    ], 422));
                }

                if ($takeProfit !== null && $takeProfit >= $price) {
                    abort(response()->json([
                        'success' => false,
                        'message' => 'Short take profit must be below entry price.',
                    ], 422));
                }
            }

            $sizing = $this->resolveEntrySizing(
                $requestedMargin,
                $leverage,
                $price,
                (float) $account->cash_balance
            );

            if (!$sizing) {
                $entryFee = round($requestedMargin * $leverage * self::FEE_RATE, 8);
                $requiredCash = round($requestedMargin + $entryFee, 8);

                abort(response()->json([
                    'success' => false,
                    'message' => "Insufficient paper balance. Cash: {$account->cash_balance}, margin: {$requestedMargin}, entry fee: {$entryFee}, required: {$requiredCash}.",
                ], 422));
            }

            $position = MarketBacktestPosition::query()->create([
                'market_backtest_account_id' => $account->id,
                'market_backtest_session_id' => $session?->id,
                'symbol' => strtoupper($validated['symbol']),
                'side' => $validated['side'],
                'quantity' => $sizing['quantity'],
                'entry_price' => $price,
                'margin' => $sizing['margin'],
                'leverage' => $leverage,
                'entry_fee' => $sizing['entryFee'],
                'opened_at_time' => $validated['executed_at_time'] ?? null,
                'stop_loss' => $stopLoss,
                'take_profit' => $takeProfit,
                'status' => $isPendingOrder ? 'pending' : 'open',
            ]);

            if ($isPendingOrder) {
                return $account->fresh();
            }

            MarketBacktestTrade::query()->create([
                'market_backtest_account_id' => $account->id,
                'market_backtest_session_id' => $session?->id,
                'market_backtest_position_id' => $position->id,
                'symbol' => $position->symbol,
                'side' => $position->side,
                'action' => 'open',
                'quantity' => $sizing['quantity'],
                'price' => $price,
                'notional' => $sizing['positionNotional'],
                'fee' => $sizing['entryFee'],
                'executed_at_time' => $validated['executed_at_time'] ?? null,
            ]);

            $account->update([
                'cash_balance' => round((float) $account->cash_balance - $sizing['requiredCash'], 8),
                'fees_paid' => round((float) $account->fees_paid + $sizing['entryFee'], 8),
            ]);

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload(
                $account,
                strtoupper($validated['symbol']),
                (float) $validated['price'],
                $this->getActiveSession($request, $account)
            ),
        ]);
    }

    public function updatePositionRisk(Request $request, MarketBacktestPosition $position)
    {
        $validated = $request->validate([
            'entry_price' => ['nullable', 'numeric', 'gt:0'],
            'stop_loss' => ['nullable', 'numeric', 'gt:0'],
            'take_profit' => ['nullable', 'numeric', 'gt:0'],
            'price' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $account = DB::transaction(function () use ($request, $position, $validated) {
            $account = $this->getOrCreateAccount($request, true);

            $position = MarketBacktestPosition::query()
                ->where('id', $position->id)
                ->where('market_backtest_account_id', $account->id)
                ->whereIn('status', ['pending', 'open'])
                ->lockForUpdate()
                ->firstOrFail();

            $entryPrice = $position->status === 'pending' && isset($validated['entry_price'])
                ? (float) $validated['entry_price']
                : (float) $position->entry_price;
            $stopLoss = array_key_exists('stop_loss', $validated)
                ? (float) $validated['stop_loss']
                : ($position->stop_loss !== null ? (float) $position->stop_loss : null);
            $takeProfit = array_key_exists('take_profit', $validated)
                ? (float) $validated['take_profit']
                : ($position->take_profit !== null ? (float) $position->take_profit : null);

            if ($position->side === 'long') {
                if ($stopLoss !== null && $stopLoss >= $entryPrice) {
                    abort(response()->json([
                        'success' => false,
                        'message' => 'Long stop loss must be below entry price.',
                    ], 422));
                }

                if ($takeProfit !== null && $takeProfit <= $entryPrice) {
                    abort(response()->json([
                        'success' => false,
                        'message' => 'Long take profit must be above entry price.',
                    ], 422));
                }
            }

            if ($position->side === 'short') {
                if ($stopLoss !== null && $stopLoss <= $entryPrice) {
                    abort(response()->json([
                        'success' => false,
                        'message' => 'Short stop loss must be above entry price.',
                    ], 422));
                }

                if ($takeProfit !== null && $takeProfit >= $entryPrice) {
                    abort(response()->json([
                        'success' => false,
                        'message' => 'Short take profit must be below entry price.',
                    ], 422));
                }
            }

            $updates = [
                'stop_loss' => $stopLoss,
                'take_profit' => $takeProfit,
            ];

            if ($position->status === 'pending' && isset($validated['entry_price'])) {
                $updates['entry_price'] = $entryPrice;
            }

            $position->update($updates);

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload(
                $account,
                $position->symbol,
                isset($validated['price']) ? (float) $validated['price'] : null,
                $this->getActiveSession($request, $account)
            ),
        ]);
    }

    public function triggerPosition(Request $request, MarketBacktestPosition $position)
    {
        $validated = $request->validate([
            'price' => ['required', 'numeric', 'gt:0'],
            'executed_at_time' => ['nullable', 'integer', 'min:0'],
        ]);

        $account = DB::transaction(function () use ($request, $position, $validated) {
            $account = $this->getOrCreateAccount($request, true);

            $position = MarketBacktestPosition::query()
                ->where('id', $position->id)
                ->where('market_backtest_account_id', $account->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($position->status !== 'pending') {
                return $account->fresh();
            }

            $entryPrice = (float) $position->entry_price;
            $leverage = $this->getPositionLeverage($position);
            $sizing = $this->resolveEntrySizing(
                (float) $position->margin,
                $leverage,
                $entryPrice,
                (float) $account->cash_balance
            );

            if (!$sizing) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'Insufficient paper balance to trigger this pending entry.',
                ], 422));
            }

            $position->update([
                'quantity' => $sizing['quantity'],
                'margin' => $sizing['margin'],
                'entry_fee' => $sizing['entryFee'],
                'opened_at_time' => $validated['executed_at_time'] ?? null,
                'status' => 'open',
            ]);

            MarketBacktestTrade::query()->create([
                'market_backtest_account_id' => $account->id,
                'market_backtest_session_id' => $position->market_backtest_session_id,
                'market_backtest_position_id' => $position->id,
                'symbol' => $position->symbol,
                'side' => $position->side,
                'action' => 'open',
                'quantity' => $sizing['quantity'],
                'price' => $entryPrice,
                'notional' => $sizing['positionNotional'],
                'fee' => $sizing['entryFee'],
                'executed_at_time' => $validated['executed_at_time'] ?? null,
            ]);

            $account->update([
                'cash_balance' => round((float) $account->cash_balance - $sizing['requiredCash'], 8),
                'fees_paid' => round((float) $account->fees_paid + $sizing['entryFee'], 8),
            ]);

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload($account, $position->symbol, (float) $validated['price'], $this->getActiveSession($request, $account)),
        ]);
    }

    public function cancelPosition(Request $request, MarketBacktestPosition $position)
    {
        $account = DB::transaction(function () use ($request, $position) {
            $account = $this->getOrCreateAccount($request, true);

            $position = MarketBacktestPosition::query()
                ->where('id', $position->id)
                ->where('market_backtest_account_id', $account->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($position->status === 'pending') {
                $position->update(['status' => 'cancelled']);
            }

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload($account, null, null, $this->getActiveSession($request, $account)),
        ]);
    }

    public function closePosition(Request $request, MarketBacktestPosition $position)
    {
        $validated = $request->validate([
            'price' => ['required', 'numeric', 'gt:0'],
            'executed_at_time' => ['nullable', 'integer', 'min:0'],
        ]);

        $account = DB::transaction(function () use ($request, $position, $validated) {
            $account = $this->getOrCreateAccount($request, true);

            $position = MarketBacktestPosition::query()
                ->where('id', $position->id)
                ->where('market_backtest_account_id', $account->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($position->status !== 'open') {
                return $account->fresh();
            }

            $exitPrice = (float) $validated['price'];
            $quantity = (float) $position->quantity;
            $exitNotional = round($quantity * $exitPrice, 8);
            $exitFee = round($exitNotional * self::FEE_RATE, 8);
            $grossPnl = $position->side === 'long'
                ? round(($exitPrice - (float) $position->entry_price) * $quantity, 8)
                : round(((float) $position->entry_price - $exitPrice) * $quantity, 8);
            $netPnl = round($grossPnl - (float) $position->entry_fee - $exitFee, 8);

            $position->update([
                'exit_price' => $exitPrice,
                'exit_fee' => $exitFee,
                'realized_pnl' => $netPnl,
                'closed_at_time' => $validated['executed_at_time'] ?? null,
                'status' => 'closed',
            ]);

            MarketBacktestTrade::query()->create([
                'market_backtest_account_id' => $account->id,
                'market_backtest_session_id' => $position->market_backtest_session_id,
                'market_backtest_position_id' => $position->id,
                'symbol' => $position->symbol,
                'side' => $position->side,
                'action' => 'close',
                'quantity' => $quantity,
                'price' => $exitPrice,
                'notional' => $exitNotional,
                'fee' => $exitFee,
                'pnl' => $netPnl,
                'executed_at_time' => $validated['executed_at_time'] ?? null,
            ]);

            $account->update([
                'cash_balance' => round((float) $account->cash_balance + (float) $position->margin + $grossPnl - $exitFee, 8),
                'realized_pnl' => round((float) $account->realized_pnl + $netPnl, 8),
                'fees_paid' => round((float) $account->fees_paid + $exitFee, 8),
            ]);

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload($account, $position->symbol, (float) $validated['price'], $this->getActiveSession($request, $account)),
        ]);
    }

    private function getActiveSession(Request $request, MarketBacktestAccount $account): ?MarketBacktestSession
    {
        return MarketBacktestSession::query()
            ->where('adm_user_id', $request->user()->id)
            ->where('market_backtest_account_id', $account->id)
            ->where('status', 'active')
            ->latest()
            ->first();
    }

    private function getOrCreateActiveSession(Request $request, MarketBacktestAccount $account, array $data): MarketBacktestSession
    {
        $session = $this->getActiveSession($request, $account);

        if ($session) {
            return $session;
        }

        return $this->createSession($request, $account, $data);
    }

    private function resolveSessionForTrade(Request $request, MarketBacktestAccount $account, array $data): ?MarketBacktestSession
    {
        if (!empty($data['session_id'])) {
            return MarketBacktestSession::query()
                ->where('id', $data['session_id'])
                ->where('adm_user_id', $request->user()->id)
                ->where('market_backtest_account_id', $account->id)
                ->where('status', 'active')
                ->first();
        }

        return $this->getOrCreateActiveSession($request, $account, $data);
    }

    private function createSession(Request $request, MarketBacktestAccount $account, array $data): MarketBacktestSession
    {
        $symbol = strtoupper($data['symbol']);
        $timeframe = $data['timeframe'] ?? '15m';
        $name = trim((string) ($data['name'] ?? ''));

        return MarketBacktestSession::query()->create([
            'market_backtest_account_id' => $account->id,
            'adm_user_id' => $request->user()->id,
            'name' => $name !== '' ? $name : "{$symbol} {$timeframe} Session",
            'symbol' => $symbol,
            'exchange' => $data['exchange'] ?? 'bybit',
            'market_category' => $data['category'] ?? 'spot',
            'timeframe' => $timeframe,
            'starting_balance' => (float) $account->starting_balance,
            'started_at_time' => $data['started_at_time'] ?? null,
            'status' => 'active',
        ]);
    }

    private function endActiveSessions(Request $request, MarketBacktestAccount $account, ?int $endedAtTime = null): void
    {
        MarketBacktestSession::query()
            ->where('adm_user_id', $request->user()->id)
            ->where('market_backtest_account_id', $account->id)
            ->where('status', 'active')
            ->update([
                'status' => 'ended',
                'ended_at_time' => $endedAtTime ?? time(),
            ]);
    }

    private function nullableTrim(?string $value): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function serializeReportPosition(MarketBacktestPosition $position): array
    {
        $pnl = (float) $position->realized_pnl;
        $margin = (float) $position->margin;
        $leverage = $this->getPositionLeverage($position);
        $snapshots = $position->relationLoaded('snapshots')
            ? $position->snapshots
            : $position->snapshots()->get();
        $entrySnapshot = $snapshots->where('type', 'entry')->sortByDesc('created_at')->first();
        $exitSnapshot = $snapshots->where('type', 'exit')->sortByDesc('created_at')->first();

        return [
            'id' => $position->id,
            'sessionId' => $position->market_backtest_session_id,
            'symbol' => $position->symbol,
            'side' => $position->side,
            'quantity' => (float) $position->quantity,
            'margin' => $margin,
            'leverage' => $leverage,
            'notional' => $this->getPositionNotional($position),
            'entryPrice' => (float) $position->entry_price,
            'exitPrice' => $position->exit_price !== null ? (float) $position->exit_price : null,
            'entryFee' => (float) $position->entry_fee,
            'exitFee' => (float) $position->exit_fee,
            'fee' => round((float) $position->entry_fee + (float) $position->exit_fee, 8),
            'pnl' => $pnl,
            'pnlPercent' => $margin > 0 ? round(($pnl / $margin) * 100, 4) : 0,
            'result' => $pnl > 0 ? 'win' : ($pnl < 0 ? 'loss' : 'breakeven'),
            'setupTag' => $position->setup_tag,
            'tags' => array_values($position->tags ?? []),
            'entryReason' => $position->entry_reason,
            'exitReason' => $position->exit_reason,
            'mistake' => $position->mistake,
            'emotion' => $position->emotion,
            'journalNotes' => $position->journal_notes,
            'entrySnapshotUrl' => $this->getSnapshotUrl($entrySnapshot),
            'exitSnapshotUrl' => $this->getSnapshotUrl($exitSnapshot),
            'openedAtTime' => $position->opened_at_time,
            'closedAtTime' => $position->closed_at_time,
            'createdAt' => optional($position->created_at)->toIso8601String(),
            'updatedAt' => optional($position->updated_at)->toIso8601String(),
        ];
    }

    private function getReportPositions(
        MarketBacktestAccount $account,
        ?string $symbol = null,
        ?int $sessionId = null,
        int $limit = 500
    ) {
        return $account->positions()
            ->with('snapshots')
            ->where('status', 'closed')
            ->when($symbol, fn ($query) => $query->where('symbol', $symbol))
            ->when($sessionId, fn ($query) => $query->where('market_backtest_session_id', $sessionId))
            ->orderByDesc('closed_at_time')
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get();
    }

    private function getSnapshotUrl(?MarketBacktestSnapshot $snapshot): ?string
    {
        if (!$snapshot) {
            return null;
        }

        if ($snapshot->path) {
            return $this->buildPublicStorageUrl($snapshot->path);
        }

        return $snapshot->url;
    }

    private function buildPublicStorageUrl(string $path): string
    {
        return url('storage/' . ltrim($path, '/'));
    }

    private function getOrCreateAccount(Request $request, bool $lock = false): MarketBacktestAccount
    {
        $query = MarketBacktestAccount::query()
            ->where('adm_user_id', $request->user()->id)
            ->where('is_active', true);

        if ($lock) {
            $query->lockForUpdate();
        }

        $account = $query->first();

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

    private function getPositionLeverage(MarketBacktestPosition $position): float
    {
        $leverage = (float) ($position->leverage ?? 1);

        return $leverage > 0 ? $leverage : 1;
    }

    private function getPositionNotional(MarketBacktestPosition $position): float
    {
        return round((float) $position->margin * $this->getPositionLeverage($position), 8);
    }

    private function resolveEntrySizing(float $requestedMargin, float $leverage, float $price, float $cashBalance): ?array
    {
        $margin = round($requestedMargin, 8);
        $leverage = round(max($leverage, 1), 2);

        if ($margin <= 0 || $price <= 0 || $cashBalance <= 0) {
            return null;
        }

        $positionNotional = round($margin * $leverage, 8);
        $entryFee = round($positionNotional * self::FEE_RATE, 8);
        $requiredCash = round($margin + $entryFee, 8);

        if ($cashBalance < $requiredCash) {
            if ($margin > $cashBalance) {
                return null;
            }

            $margin = round($cashBalance / (1 + ($leverage * self::FEE_RATE)), 8);
            $positionNotional = round($margin * $leverage, 8);
            $entryFee = round($positionNotional * self::FEE_RATE, 8);
            $requiredCash = round($margin + $entryFee, 8);
        }

        if ($margin < 1 || $cashBalance < $requiredCash) {
            return null;
        }

        return [
            'margin' => $margin,
            'positionNotional' => $positionNotional,
            'entryFee' => $entryFee,
            'requiredCash' => $requiredCash,
            'quantity' => round($positionNotional / $price, 10),
        ];
    }

    private function buildPayload(
        MarketBacktestAccount $account,
        ?string $symbol = null,
        ?float $price = null,
        ?MarketBacktestSession $session = null
    ): array
    {
        $openPositions = $account->positions()
            ->where('status', 'open')
            ->when($session, fn ($query) => $query->where('market_backtest_session_id', $session->id))
            ->orderByDesc('created_at')
            ->get();
        $pendingPositions = $account->positions()
            ->where('status', 'pending')
            ->when($session, fn ($query) => $query->where('market_backtest_session_id', $session->id))
            ->orderByDesc('created_at')
            ->get();
        $trades = $account->trades()
            ->when($session, fn ($query) => $query->where('market_backtest_session_id', $session->id))
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();

        $unrealizedPnl = $openPositions->sum(function (MarketBacktestPosition $position) use ($symbol, $price) {
            if (!$price || !$symbol || $position->symbol !== $symbol) {
                return 0;
            }

            $quantity = (float) $position->quantity;
            return $position->side === 'long'
                ? (($price - (float) $position->entry_price) * $quantity)
                : (((float) $position->entry_price - $price) * $quantity);
        });
        $lockedMargin = $openPositions->sum(fn (MarketBacktestPosition $position) => (float) $position->margin);
        $equity = (float) $account->cash_balance + $lockedMargin + $unrealizedPnl;

        return [
            'id' => $account->id,
            'name' => $account->name,
            'quoteCurrency' => $account->quote_currency,
            'startingBalance' => (float) $account->starting_balance,
            'cashBalance' => (float) $account->cash_balance,
            'lockedMargin' => round($lockedMargin, 8),
            'equity' => round($equity, 8),
            'unrealizedPnl' => round($unrealizedPnl, 8),
            'realizedPnl' => (float) $account->realized_pnl,
            'feesPaid' => (float) $account->fees_paid,
            'feeRate' => self::FEE_RATE,
            'activeSession' => $session ? [
                'id' => $session->id,
                'name' => $session->name,
                'symbol' => $session->symbol,
                'exchange' => $session->exchange,
                'marketCategory' => $session->market_category,
                'timeframe' => $session->timeframe,
                'startingBalance' => (float) $session->starting_balance,
                'startedAtTime' => $session->started_at_time,
                'endedAtTime' => $session->ended_at_time,
                'status' => $session->status,
            ] : null,
            'openPositions' => $openPositions->map(fn (MarketBacktestPosition $position) => [
                'id' => $position->id,
                'sessionId' => $position->market_backtest_session_id,
                'symbol' => $position->symbol,
                'side' => $position->side,
                'status' => $position->status,
                'quantity' => (float) $position->quantity,
                'entryPrice' => (float) $position->entry_price,
                'margin' => (float) $position->margin,
                'leverage' => $this->getPositionLeverage($position),
                'notional' => $this->getPositionNotional($position),
                'entryFee' => (float) $position->entry_fee,
                'openedAtTime' => $position->opened_at_time,
                'stopLoss' => $position->stop_loss !== null ? (float) $position->stop_loss : null,
                'takeProfit' => $position->take_profit !== null ? (float) $position->take_profit : null,
                'unrealizedPnl' => $price && $symbol === $position->symbol
                    ? round($position->side === 'long'
                        ? ($price - (float) $position->entry_price) * (float) $position->quantity
                        : ((float) $position->entry_price - $price) * (float) $position->quantity, 8)
                    : null,
            ])->values(),
            'pendingPositions' => $pendingPositions->map(fn (MarketBacktestPosition $position) => [
                'id' => $position->id,
                'sessionId' => $position->market_backtest_session_id,
                'symbol' => $position->symbol,
                'side' => $position->side,
                'status' => $position->status,
                'quantity' => (float) $position->quantity,
                'entryPrice' => (float) $position->entry_price,
                'margin' => (float) $position->margin,
                'leverage' => $this->getPositionLeverage($position),
                'notional' => $this->getPositionNotional($position),
                'entryFee' => (float) $position->entry_fee,
                'openedAtTime' => $position->opened_at_time,
                'stopLoss' => $position->stop_loss !== null ? (float) $position->stop_loss : null,
                'takeProfit' => $position->take_profit !== null ? (float) $position->take_profit : null,
            ])->values(),
            'trades' => $trades->map(fn (MarketBacktestTrade $trade) => [
                'id' => $trade->id,
                'sessionId' => $trade->market_backtest_session_id,
                'positionId' => $trade->market_backtest_position_id,
                'symbol' => $trade->symbol,
                'side' => $trade->side,
                'action' => $trade->action,
                'quantity' => (float) $trade->quantity,
                'price' => (float) $trade->price,
                'notional' => (float) $trade->notional,
                'fee' => (float) $trade->fee,
                'pnl' => $trade->pnl !== null ? (float) $trade->pnl : null,
                'executedAtTime' => $trade->executed_at_time,
            ])->values(),
        ];
    }
}
