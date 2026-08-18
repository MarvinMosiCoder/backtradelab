# Backtesting and Orders

## Purpose

Backtesting maintains a simulated account, named sessions, pending/open/closed positions, risk levels, fees, PnL, snapshots, and trade records. It never places real exchange orders.

| Route group/file | Responsibility |
|---|---|
| `/market-backtest/account` | Account/session/position state |
| `/market-backtest/sessions*` | Start/end sessions |
| `/market-backtest/positions*` | Open, edit risk, trigger, cancel, close, snapshot |
| `/market-backtest/order-history` | Combined trade-fill + cancelled-order history for `PositionsPanel.jsx`'s Order History tab |
| `/market-backtest/reset` | Reset simulated account |
| `MarketBacktestController.php` | Validation, authorization, transactional calculations |
| `MarketBacktestAccount/Session/Position/Trade/Snapshot.php` | Domain records/relations |
| `MarketChart.jsx`, `ReplayPanel.jsx`, `TraderNavbar.jsx` | Entry and account UI |
| `PositionsPanel.jsx` | Positions/Open Orders table below the chart |

## Data flow

1. `GET /market-backtest/account` returns the authenticated user's active simulated account.
2. A session groups positions/trades for a replay exercise.
3. Position submission sends market identity, side, order type, quantity/risk, entry, leverage, stop loss, and take profit as applicable.
4. The controller validates access and uses database transactions/locking for balance and position mutations.
5. Pending orders trigger when replay price reaches their condition.
6. Closing writes realized results and trade history; snapshots use controlled file storage.

All state-changing routes require `replay.access` and named throttles. Every route-model-bound session/position must be checked against the authenticated account.

Chart position lines are draggable. Pending entries and every active SL/TP update use `PUT /market-backtest/positions/{position}/risk`. Repricing an open entry intentionally edits the simulated fill while preserving quantity: the server locks the account, position, and opening trade; recalculates notional, margin, entry fee, cash, fees, and PnL inputs; and rejects the complete transaction when funds or SL/TP ordering are invalid.

## Order ticket UI (`ReplayPanel.jsx`)

The "Enter Position" flyout uses underline-style tabs (not boxed buttons) for Market/Limit/Trigger, a taller (`h-10`) full-width Long/Short segmented toggle, and a 25/50/75/100% quick-select row under the margin/leverage inputs (`handleMarginPercentClick`, computed from `backtestMetrics.cashBalance * pct` converted to the display currency via `quoteToDisplayAmount`). The order-submit action is a single full-width `h-11` button at the bottom of the section (below the Est profit/loss row), labeled `Open Long`/`Open Short` or `Place Long/Short Order` for pending order types — it is no longer a small icon button embedded in the margin/leverage input row.

**Leverage modal.** Leverage is no longer a free-text input — clicking the leverage field (now a button showing e.g. `20x`) opens `LeverageModal` (defined just above the `ReplayPanel` export in the same file), a `createPortal`-into-`document.body` dialog with a −/+ stepper, a native `<input type="range">` (1x–125x, matching `isLeverageValid`'s existing validated ceiling — not the 150x some exchanges show, since 125x is this app's real cap), tick labels at 6 evenly-spaced points, an info list (max position size at the currently-dragged leverage, a note that changing it also affects open positions/orders, and a liquidation-risk warning), and a Confirm button. The modal holds its own local `draft` state and only calls `onConfirm(draft)` (which sets `orderLeverage` and closes the modal) on Confirm — dragging the slider or the stepper does not touch `orderLeverage` until confirmed. The Confirm button uses the app's theme blue (`#2962ff`, the same accent as the order-type tab underline), not the amber/yellow some reference exchange UIs use for this button.

## Positions panel (`PositionsPanel.jsx`)

A tabbed table renders below the chart (non-fullscreen only — gated on `!isFullscreen` where it's rendered in `MarketChart.jsx`, after the `ml-[52px]` chart wrapper closes but still inside the outer bordered chart frame, so it spans the full chart width). `TABS` in `PositionsPanel.jsx` has five tabs — Positions, Open Orders, Order History, Position History, Trade History — and **all five are now wired to real data**; the earlier "Coming soon" stub fallback (`!['positions', 'openOrders', 'orderHistory', 'tradeHistory', 'positionHistory'].includes(activeTab)`) is left in place only as a safety net for a future tab added without its own render branch, not because anything currently falls through to it. **Assets, Bots, and Transaction History were deliberately left out of `TABS` entirely** (not even as stubs) — they don't map to any concept this app already tracks here (bots don't exist at all; account balance/assets are shown elsewhere, e.g. the trader Assets panel referenced in `## Custom demo balance` below; transaction history wasn't wanted alongside the others). Add a tab back only once its underlying dataset actually exists somewhere in this app; if reintroducing Assets specifically, decide first whether it should link to/reuse the existing Assets panel rather than duplicating it here.

**Positions tab** lists `backtestAccount.openPositions` (all symbols, not filtered to the active chart's symbol — a real multi-position table, unlike the "Open Positions" list still inside `ReplayPanel.jsx`'s Enter Position flyout, which stays filtered to `position.symbol === symbol`). Columns: Symbol, Side, Size, Entry Price, Mark Price, PnL (ROI%), Margin, Liq. Price (est.), TP/SL, Close.

- **Mark Price / live PnL only exist for the currently active chart symbol.** This backtest engine only advances a live/replay price for whichever symbol is currently charted (`executionPrice`) — the account-refresh effect in `MarketChart.jsx` only recomputes `unrealizedPnl` for positions matching `symbol`, leaving other symbols' `unrealizedPnl` as `null` (see the effect right after `indicatorPaneTops`). `PositionsPanel` shows `---` for Mark Price and PnL/ROI on any row whose `position.symbol !== symbol`, rather than fabricating a stale or borrowed price.
- **Close is disabled for non-active-symbol rows** for the same reason: `handleCloseBacktestPosition` needs a real execution price for that position's own symbol, which only exists while that symbol is the active chart. The disabled button's `title` tells the user to switch symbol first, rather than silently no-opping or (worse) closing at the wrong symbol's price.
- **Liq. Price is a display-only estimate**, not an enforced value — this backtest engine has no liquidation logic anywhere (client or server); positions only close via explicit user action or SL/TP triggers. The estimate is a standard isolated-margin approximation (`entry * (1 ∓ 1/leverage)`) ignoring fees and maintenance margin, labeled "(est.)" so it isn't mistaken for a real, enforced figure.

**Open Orders tab** lists `backtestAccount.pendingPositions` (also all symbols). Columns: Symbol, Side, Trigger Price, Size, Margin, SL, TP, Cancel. Cancel has no symbol restriction — `handleCancelBacktestPosition` just removes the pending order server-side, no execution price needed.

Both tabs reuse the exact same `onClosePosition`/`onCancelOrder` handlers (`handleCloseBacktestPosition`/`handleCancelBacktestPosition` in `MarketChart.jsx`) already used by `ReplayPanel.jsx`'s flyout lists — this is a second render surface for the same account state and actions, not a parallel data path.

**Order History tab** fetches `GET /market-backtest/order-history` (`MarketBacktestController::orderHistory()`) lazily — only when the tab becomes active (`useEffect` keyed on `activeTab`/`activeSessionId` in `PositionsPanel.jsx`), scoped to the active session if one exists. This is a **new** endpoint and, unlike `buildPayload()`'s `trades` (last-30, all-symbols, used for chart trade markers), it exists specifically to answer "what happened to every order I placed", including ones that never filled:

- **Each row is one order-lifecycle event, not one position.** A single round-trip position produces two separate rows — an `open` trade and a `close` trade — matching the reference exchange's own history view (and `MarketBacktestTrade`'s existing one-row-per-fill shape). A pending order that got cancelled before it could fill produces one synthetic row built directly from the `MarketBacktestPosition` (`status = 'cancelled'`) instead, since **cancelled orders never create a `MarketBacktestTrade` row** (`cancelPosition()` only flips the position's status) — `orderHistory()` unions both sources in PHP (not a SQL `UNION`) and sorts by timestamp before truncating to `limit` (default 50, max 100).
- **`order_type` is a new column** (`market_backtest_positions.order_type`, migration `2026_08_12_000001_add_order_type_to_market_backtest_positions`, nullable string). Before this, `openPosition()` validated an incoming `order_type` request field (`market|conditional|limit|trigger`) but discarded it — it's now persisted on the position at creation. **Positions created before this migration have `order_type = null`**; both the controller (`?? 'market'` for trade rows, `?? 'limit'` for cancelled rows) and the frontend (`ORDER_TYPE_LABELS[order.orderType] ?? ORDER_TYPE_LABELS.market`) fall back sensibly rather than showing a blank Type column for old data.
- **Reduce Only is always `false`/`'No'`** and every position badge always reads **Isolated** — neither concept exists anywhere in this app's schema or engine (no partial/reduce-only close, no cross-margin mode), so these aren't real per-order flags, just fixed labels matching what the app actually does in every case. Don't read them as live data.
- **Type/Price display mirrors how fills actually work here**: `triggerPosition()` fills a pending limit/trigger order at exactly its stored `entry_price` (no slippage simulation), so a filled limit order's Avg Price and target Price columns are identical by construction — this isn't a coincidence in the data, it's how `MarketBacktestController::triggerPosition()` (`app/Http/Controllers/MarketBacktestController.php:573`) works. Market orders show `Market` in the second Price line (`order.targetPrice` is `null` whenever `orderType === 'market'`) instead of a target figure, since a market order has no separate trigger price.
- The Symbol cell's leverage/SL/TP badges are read straight off the position (`getPositionLeverage()`, `stop_loss`/`take_profit !== null`) — for trade rows this means eager-loading the trade's `position` relation (`->with('position:id,order_type,leverage,stop_loss,take_profit')`), since none of those fields live on `MarketBacktestTrade` itself.

**Trade History tab reuses the exact same `/market-backtest/order-history` fetch** as Order History — no second network call. `PositionsPanel.jsx`'s data-fetch `useEffect` triggers on either `activeTab === 'orderHistory' || activeTab === 'tradeHistory'`, and the Trade History table simply filters the already-fetched `orderHistory` list to `order.status !== 'cancelled'` at render time and shows a different column set (Futures, Date, Side, Average Price, Volume, Closed Value, Realized PnL, Fee, Taker/Maker — no Type/Expiration, Reduce Only, or Status column, since every row here is by definition a completed fill). Two derived-only values, computed client-side, not sent by the backend:

- **Volume's base-asset ticker** (`getBaseAsset`) strips the account's `quoteCurrency` suffix off the symbol (`SNDKUSDT` + `USDT` → `SNDK`) — a plain string-suffix strip, not a lookup against real per-symbol base/quote metadata (which this endpoint doesn't carry). Every symbol traded in this app is USDT-margined today, so this always resolves correctly in practice; if a non-USDT-quoted symbol is ever tradable here, this needs a real base-asset field from the backend instead.
- **Taker/Maker** (`getTakerOrMaker`) is inferred, not stored: `close` actions are always `Taker` (this engine has no resting/limit close order — `closePosition()` always executes immediately at the given price), `open` actions are `Taker` for market orders and `Maker` for limit/trigger orders (mirroring real-exchange semantics: a market order takes existing liquidity, a resting limit/trigger order that later fills provided it). This is a reasonable inference from `order_type` + `action`, not a literal maker/taker fee-tier distinction this app's engine actually implements (fees are always the same flat `FEE_RATE` regardless of this label).

**Position History tab reuses the existing `GET /market-backtest/report` endpoint** (`MarketBacktestReportService`, otherwise powering [Trade reports](trade-reports-and-journals.md)) instead of a new one — closed positions already carry every field this card view needs (`entryPrice`, `exitPrice`, `pnl`, `pnlPercent`, `openedAtTime`, `closedAtTime`, `quantity`, `leverage`). Rendered as a card list (not a table) to match the reference layout: a header row (symbol, side, Isolated/leverage badges, "Closed" status) over a 4-column detail grid (Time Opened/Closed, Entry/Close Price, Position PnL/ROI, Max held/Closed Qty.). **"Max held" and "Closed Qty." always show the identical value** (`position.quantity`) — this engine has no partial-close/scale-in mechanism, so a position's size never changes between open and close; there is no separate "peak size" to track. No Details link/drill-down page exists for either Order History, Trade History, or Position History rows — all three intentionally omit that column rather than link to nowhere.

## Chart order lines (`ChartStage.jsx`'s `BacktestOrderOverlay`)

Each backtest TP/SL/entry line on the chart renders as **two adjacent SVG badges** rather than one combined text string: a solid-colored price/kind badge (e.g. green `TP 64,949.77`) and, for TP/SL lines only, a separate dark PnL badge (e.g. `+4.60`, text colored green/red by sign) immediately to its left. This split is driven by `renderedBacktestOrders` in `MarketChart.jsx` (`buildLine`'s `pnlText`/`pnlPositive` fields, computed via `estimatePositionNetPnl` for live pending/open positions or passed explicitly for the draft preview's `estimatedProfit`/`estimatedLoss`) — `item.label` holds only the price/kind text now, PnL is never concatenated into it. Entry/trigger lines have no PnL badge (`pnlText` stays `null`).

The line itself spans the full overlay width (`x2 = overlaySize.width`, not stopped short of the price-scale gutter) with a thin (`strokeWidth={0.5}`) dashed or solid stroke. Badges stay anchored near the right edge, just left of the price-scale gutter and the cancel "x" hotspot (`groupRightEdge` reserves extra space when `item.canCancel` so the PnL/price badges never overlap the cancel box). Hovering the cancel hotspot shows a pointer cursor: `MarketChart.jsx`'s `handleMouseMove` runs `hitTestBacktestOrder` on every move (not just on click) and sets `isHoveringBacktestOrderCancel` state, which `ChartStage.jsx` reads to override its wrapper `cursor` style to `'pointer'` (ranked below the existing drag/space/tool cursor states, above the default crosshair/default cursor).

## Maintenance

- Keep money/quantity calculations server authoritative.
- Define rounding, fee, margin, and PnL behavior in one backend path.
- Update account summaries and transaction history for every new state transition.
- Never describe simulated balances as deposited or custodied funds.
- `MarketBacktestController.php` has no explicit `try`/`catch`/`report()` calls of its own; any exception here still reaches admins because it bubbles to Laravel's default exception handler, which now persists it to `system_error_logs` (area `backtest`) — see [System error logs and payment activity](system-error-logs-and-payment-activity.md). This is a safety net, not a substitute for validating inputs and handling expected failure modes explicitly in the controller.

## Verification

- Market/limit/trigger long and short orders.
- SL/TP drag updates and automatic triggers.
- Insufficient balance, invalid leverage/quantity/price.
- Concurrent tabs/double submission.
- Pending/open line dragging, opening-trade synchronization, insufficient-cash rollback, and invalid SL/TP rollback.
- Cancel pending, close open, end session, reset.
- Cross-user record access returns not found/forbidden.

Related: [Reports](trade-reports-and-journals.md), [Replay](replay-and-progress.md), [System error logs and payment activity](system-error-logs-and-payment-activity.md).
# Custom demo balance

## Strategy playbooks and pre-trade checklist

Authenticated traders manage owned strategy playbooks from the top of `/trade-report`. A playbook stores its name, description, entry/confirmation/invalidation/stop/target rules, up to 20 checklist items, and active/archive state.

| Route/file | Responsibility |
|---|---|
| `GET/POST /market-backtest/playbooks` | List and create the authenticated trader's playbooks |
| `PUT/DELETE /market-backtest/playbooks/{playbook}` | Update or archive an owned playbook |
| `MarketBacktestPlaybookController.php` | Validation, ownership, normalization, and serialization |
| `StrategyPlaybooks.jsx` | Playbook management UI on Trade Report |
| `ReplayPanel.jsx` | Optional playbook selection and required checklist during order entry |

When a playbook is selected, `POST /market-backtest/positions` verifies that it is active and owned by the authenticated user. Every checklist answer must be present and true. The created position stores both the nullable playbook foreign key and an immutable `playbook_snapshot` with the rules and checklist as they existed at entry, plus `checklist_answers`. Archiving or editing the source playbook therefore never changes historical trade evidence. The playbook name also seeds `setup_tag`, preserving compatibility with existing journal filters and coaching insights.

Playbooks are optional so existing untagged/free-form trading remains supported. Deleting from the UI archives rather than hard-deletes; archived playbooks disappear from order entry but remain visible in the management list.

## Replay-day risk guardrails

Traders configure optional guardrails on `/trade-report`. Limits include maximum realized loss per replay day, opened trades per replay day, concurrent pending/open positions, and consecutive closed losses. A replay day is the UTC calendar day containing the order's `executed_at_time`; this intentionally follows historical replay time instead of the user's real-world current date.

| Route/file | Responsibility |
|---|---|
| `GET/PUT /market-backtest/risk-settings` | Read and update the authenticated trader's single settings row |
| `MarketBacktestRiskSettingController.php` | Owned settings defaults and validation |
| `MarketBacktestRiskGuardrailService.php` | Replay-day metrics, loss-streak calculation, and breaches |
| `RiskGuardrailSettings.jsx` | Warning/enforced mode and limit configuration |

Warning mode returns current breaches after allowing a new order. Enforced mode rejects `POST /market-backtest/positions` with `422` before balance, position, or trade records change. Evaluation and position creation run in the same transaction, and the settings row is locked so concurrent order attempts use one consistent rule configuration. A configured maximum is considered reached when the current metric is greater than or equal to it: for example, a five-trade limit allows trades one through five and blocks the sixth.

Guardrails affect new entries only. They do not prevent closing or cancelling a position, because risk-reducing actions must remain available.

## Liquidation and managed exits

New positions persist an isolated-margin liquidation price using a 0.5% maintenance-margin approximation. Unlike the former display-only estimate, replay candles are processed by `POST /market-backtest/positions/{position}/process-candle`; crossing liquidation closes the position with `close_reason=liquidation`. Liquidation has priority over stop loss and take profit when one candle spans multiple levels.

Order entry can optionally configure:

- trailing-stop distance as a percentage; `favorable_price` records the best high for longs or best low for shorts and the stop only tightens;
- a favorable-move percentage that moves the stop to entry (break-even);
- a partial take-profit percentage (1–99) that closes that share when TP is first reached, clears the TP, and leaves the remainder open.

Partial exits proportionally release margin and allocate entry fees, append a close trade, accumulate realized PnL and exit fees, and preserve original quantity/margin/entry-fee fields for accurate final reporting. Closing snapshots continue to be captured for final exits. Manual, stop-loss, take-profit, liquidation, and partial-take-profit reasons are stored explicitly.

Each candle also updates `adverse_price`, a mirrored running-worst-price tracker seeded at entry and updated identically to `favorable_price` — the worst low for longs or worst high for shorts — except it only ever moves against the position. Neither field is touched by `closePosition()`, so both freeze at their last processed value once a position closes, and that frozen pair becomes the excursion data point the trade report's MAE/MFE analytics feed on.

The trader Assets panel accepts a starting balance from `1` through `1,000,000,000`. Applying it uses the existing demo reset operation and requires confirmation because it deletes positions and demo trades and resets cash, realized PnL, and fees.
