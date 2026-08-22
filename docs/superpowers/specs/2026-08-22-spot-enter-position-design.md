# Spot "Enter Position" support

## Purpose

The chart's "Enter Position" order-entry panel only works correctly for Futures (linear/inverse) markets today. For Spot it renders the exact same futures-shaped ticket — Long/Short toggle, Isolated margin-mode pill, leverage pill/modal, liquidation price — and the backend accepts a `category` field but never branches on it, so a "spot" order is silently accepted and mis-booked as a leveraged, liquidatable, potentially short position, none of which is valid for real spot trading.

Trigger: user asked to add real Spot support, framing it as "spot is simple and different [from] futures — just buy and sell": no leverage, no margin, no shorting, no liquidation.

## Scope

**In scope:**
- Spot positions are buy-only (no shorting) — real spot trading has no short-selling without a separate margin product, which this feature doesn't add.
- No leverage, no margin mode, no liquidation price for spot positions.
- TP/SL and managed-exit features (trailing stop, break-even, partial take-profit) remain available for spot, unchanged from futures.
- Spot positions display as "Buy" everywhere the app currently shows "Long"/"Short" for a position — entry ticket, positions panel, trade journal, order history.
- Backend rejects an explicit `side: 'short'` or `leverage > 1` on a spot order with a clear 422, rather than silently coercing it.

**Explicitly out of scope:**
- Spot margin/borrow trading (shorting spot via borrowed assets) — a genuinely different, more complex product real exchanges offer separately from plain spot.
- Any change to Futures behavior — Long/Short, leverage, margin mode, and liquidation are untouched for linear/inverse positions.
- Backfilling or reinterpreting existing historical positions beyond a safe default (see Data model below).

## Current state (for context)

- `ReplayPanel.jsx` has zero category-awareness today — no `category`/`marketCategory`/`isSpot` reference anywhere in the file. `MarketChart.jsx` doesn't even pass `marketCategory` into it as a prop, despite already holding that state and already sending `category: marketCategory` to the backend on submit (`MarketChart.jsx:6122`).
- `MarketBacktestController::openPosition` validates `category` as an accepted nullable string but never reads it again. `side` is restricted to `long`/`short` only. `leverage` defaults to 1 and is always applied via `resolveEntrySizing()`. `liquidationPrice()` is called unconditionally for every position, computing an isolated-margin liquidation price even at 1x leverage.
- `MarketBacktestPosition` has no `category` column. `MarketBacktestSession` does have a `market_category` column, but it can't stand in for a per-position category: `getActiveSession()` picks the account's latest active session regardless of symbol or category, so a session can span mixed categories across trades — a position's own category has to be recorded on the position itself.
- `closePosition()`, `processPositionCandle()` (TP/SL, trailing stop, break-even, liquidation checks) already operate purely on price levels and `side === 'long'` comparisons, with no leverage-specific branching — verified they already degrade correctly at `leverage=1`, `side='long'`, `liquidation_price=null`. No changes needed there.
- `docs/developer/backtesting-and-orders.md` never mentions spot in its ~195 lines describing the order-entry engine — this was designed futures-only from the start, not a partially-broken spot implementation.

## Design

### Data model

Add a `category` column to `market_backtest_positions` (nullable string, mirrors the `category` value already sent by the frontend and already validated — just not persisted today). Existing rows backfill to `'linear'`: since spot never actually worked before this feature, nothing meaningful was ever genuinely entered as a spot trade, so defaulting historical rows to futures is the safe, honest choice.

### Backend (`MarketBacktestController::openPosition`)

When the validated `category === 'spot'`:
- Reject `side: 'short'` with a 422 ("Spot positions can't be shorted").
- Reject any `leverage` value greater than `1` with a 422, rather than silently clamping it — a stale or buggy frontend request should fail loudly, not quietly mis-book a trade. `leverage` is otherwise forced/defaulted to `1`.
- Skip `liquidationPrice()` — persist `liquidation_price` as `null`.
- Persist `category` on the created position.

No other change to `openPosition()`'s sizing, fee, or TP/SL-by-price-or-PnL% logic — all of it already produces correct results at `leverage=1`. No change at all to `closePosition()` or `processPositionCandle()` — both are already category-agnostic and correct for a long-only, non-liquidatable position once `liquidation_price` is `null`.

### Frontend

`MarketChart.jsx` passes its existing `marketCategory` state into `ReplayPanel.jsx` as a new prop. Inside `ReplayPanel.jsx`, when `marketCategory === 'spot'`:
- The Long/Short toggle is replaced with a single "Buy" indicator — there's only one side, so no toggle is needed.
- The margin-mode pill and leverage pill/modal are hidden entirely.
- The notional input is relabeled from "Margin" to "Amount to buy"; the existing 25/50/75/100%-of-cash quick-select buttons are unchanged (same math — no leverage multiplier involved either way).
- The submit button reads "Buy" instead of "Open Long/Short".
- TP/SL and managed-exit controls (trailing stop, break-even, partial take-profit) remain visible and functional, unchanged from the futures ticket.

Everywhere else in the app that renders `side === 'short' ? 'Short' : 'Long'` for a position — `PositionsPanel.jsx` (several render sites: open positions list, closed positions list, order history rows) and `TradeReportPage.jsx`'s journal/order-history tables — gains a spot-aware variant that shows "Buy" instead of "Long" specifically for positions whose `category` is `'spot'`. Futures positions keep showing "Long"/"Short" exactly as today; this only changes the label used for the (always-long) spot case.

### Error handling

A spot order that explicitly requests `side: 'short'` or `leverage > 1` is rejected with a 422 and a specific message, rather than being silently coerced into a valid spot order — this surfaces a frontend bug immediately instead of producing a subtly wrong journal entry.

## Testing

Manual, matching how the rest of this feature area is tested (no automated coverage exists for the order-entry engine today):

- Open a spot symbol, submit a Buy with TP/SL and a trailing stop set — confirm it fills at 1x, shows no leverage/margin-mode/liquidation UI, and shows as "Buy" in the positions panel.
- Let price move through the take-profit level during replay — confirm it closes automatically with correct PnL (no liquidation check ever fires).
- Close a spot position manually — confirm cash-balance and PnL math matches a hand calculation (entry notional back, plus/minus price move, minus fees).
- Check the trade journal / order history for that spot trade — confirm it reads "Buy", not "Long".
- Repeat the full flow on a futures symbol (Long and Short) — confirm leverage, margin mode, and liquidation still work exactly as before, and journal entries still read "Long"/"Short".
- Attempt to submit `side: 'short'` or `leverage: 5` directly against a spot session (e.g. via devtools) — confirm the backend rejects it with a 422 rather than accepting it.
