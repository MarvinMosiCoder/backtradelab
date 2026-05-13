<?php

namespace App\Http\Controllers;

use App\Models\MarketBacktestAccount;
use App\Models\MarketBacktestPosition;
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
            'price' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $account = $this->getOrCreateAccount($request);
        $symbol = isset($validated['symbol']) ? strtoupper($validated['symbol']) : null;
        $price = isset($validated['price']) ? (float) $validated['price'] : null;

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload($account, $symbol, $price),
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

    public function openPosition(Request $request)
    {
        $validated = $request->validate([
            'symbol' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9]+$/'],
            'side' => ['required', Rule::in(['long', 'short'])],
            'order_type' => ['nullable', Rule::in(['market', 'conditional'])],
            'notional' => ['required', 'numeric', 'min:1', 'max:1000000000'],
            'price' => ['required', 'numeric', 'gt:0'],
            'executed_at_time' => ['nullable', 'integer', 'min:0'],
            'stop_loss' => ['nullable', 'numeric', 'gt:0'],
            'take_profit' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $account = DB::transaction(function () use ($request, $validated) {
            $account = $this->getOrCreateAccount($request, true);
            $notional = round((float) $validated['notional'], 8);
            $price = (float) $validated['price'];
            $stopLoss = isset($validated['stop_loss']) ? (float) $validated['stop_loss'] : null;
            $takeProfit = isset($validated['take_profit']) ? (float) $validated['take_profit'] : null;
            $orderType = $validated['order_type'] ?? 'market';

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

            $entryFee = round($notional * self::FEE_RATE, 8);
            $requiredCash = $notional + $entryFee;

            if ((float) $account->cash_balance < $requiredCash) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'Insufficient paper balance for this position size.',
                ], 422));
            }

            $quantity = round($notional / $price, 10);

            $position = MarketBacktestPosition::query()->create([
                'market_backtest_account_id' => $account->id,
                'symbol' => strtoupper($validated['symbol']),
                'side' => $validated['side'],
                'quantity' => $quantity,
                'entry_price' => $price,
                'margin' => $notional,
                'entry_fee' => $entryFee,
                'opened_at_time' => $validated['executed_at_time'] ?? null,
                'stop_loss' => $stopLoss,
                'take_profit' => $takeProfit,
                'status' => $orderType === 'conditional' ? 'pending' : 'open',
            ]);

            if ($orderType === 'conditional') {
                return $account->fresh();
            }

            MarketBacktestTrade::query()->create([
                'market_backtest_account_id' => $account->id,
                'market_backtest_position_id' => $position->id,
                'symbol' => $position->symbol,
                'side' => $position->side,
                'action' => 'open',
                'quantity' => $quantity,
                'price' => $price,
                'notional' => $notional,
                'fee' => $entryFee,
                'executed_at_time' => $validated['executed_at_time'] ?? null,
            ]);

            $account->update([
                'cash_balance' => round((float) $account->cash_balance - $requiredCash, 8),
                'fees_paid' => round((float) $account->fees_paid + $entryFee, 8),
            ]);

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload(
                $account,
                strtoupper($validated['symbol']),
                (float) $validated['price']
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
            $notional = (float) $position->margin;
            $entryFee = round($notional * self::FEE_RATE, 8);
            $requiredCash = $notional + $entryFee;

            if ((float) $account->cash_balance < $requiredCash) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'Insufficient paper balance to trigger this pending entry.',
                ], 422));
            }

            $position->update([
                'entry_fee' => $entryFee,
                'opened_at_time' => $validated['executed_at_time'] ?? null,
                'status' => 'open',
            ]);

            MarketBacktestTrade::query()->create([
                'market_backtest_account_id' => $account->id,
                'market_backtest_position_id' => $position->id,
                'symbol' => $position->symbol,
                'side' => $position->side,
                'action' => 'open',
                'quantity' => (float) $position->quantity,
                'price' => $entryPrice,
                'notional' => $notional,
                'fee' => $entryFee,
                'executed_at_time' => $validated['executed_at_time'] ?? null,
            ]);

            $account->update([
                'cash_balance' => round((float) $account->cash_balance - $requiredCash, 8),
                'fees_paid' => round((float) $account->fees_paid + $entryFee, 8),
            ]);

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'account' => $this->buildPayload($account, $position->symbol, (float) $validated['price']),
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
            'account' => $this->buildPayload($account),
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
            'account' => $this->buildPayload($account, $position->symbol, (float) $validated['price']),
        ]);
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

    private function buildPayload(MarketBacktestAccount $account, ?string $symbol = null, ?float $price = null): array
    {
        $openPositions = $account->positions()
            ->where('status', 'open')
            ->orderByDesc('created_at')
            ->get();
        $pendingPositions = $account->positions()
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->get();
        $trades = $account->trades()
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
            'openPositions' => $openPositions->map(fn (MarketBacktestPosition $position) => [
                'id' => $position->id,
                'symbol' => $position->symbol,
                'side' => $position->side,
                'status' => $position->status,
                'quantity' => (float) $position->quantity,
                'entryPrice' => (float) $position->entry_price,
                'margin' => (float) $position->margin,
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
                'symbol' => $position->symbol,
                'side' => $position->side,
                'status' => $position->status,
                'quantity' => (float) $position->quantity,
                'entryPrice' => (float) $position->entry_price,
                'margin' => (float) $position->margin,
                'entryFee' => (float) $position->entry_fee,
                'openedAtTime' => $position->opened_at_time,
                'stopLoss' => $position->stop_loss !== null ? (float) $position->stop_loss : null,
                'takeProfit' => $position->take_profit !== null ? (float) $position->take_profit : null,
            ])->values(),
            'trades' => $trades->map(fn (MarketBacktestTrade $trade) => [
                'id' => $trade->id,
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
