# Backtesting and Orders

## Purpose

Backtesting maintains a simulated account, named sessions, pending/open/closed positions, risk levels, fees, PnL, snapshots, and trade records. It never places real exchange orders.

| Route group/file | Responsibility |
|---|---|
| `/market-backtest/account` | Account/session/position state |
| `/market-backtest/sessions*` | Start/end sessions |
| `/market-backtest/positions*` | Open, edit risk, trigger, cancel, close, snapshot |
| `/market-backtest/reset` | Reset simulated account |
| `MarketBacktestController.php` | Validation, authorization, transactional calculations |
| `MarketBacktestAccount/Session/Position/Trade/Snapshot.php` | Domain records/relations |
| `TradingViewChart.jsx`, `ReplayPanel.jsx`, `TraderNavbar.jsx` | Entry and account UI |

## Data flow

1. `GET /market-backtest/account` returns the authenticated user's active simulated account.
2. A session groups positions/trades for a replay exercise.
3. Position submission sends market identity, side, order type, quantity/risk, entry, leverage, stop loss, and take profit as applicable.
4. The controller validates access and uses database transactions/locking for balance and position mutations.
5. Pending orders trigger when replay price reaches their condition.
6. Closing writes realized results and trade history; snapshots use controlled file storage.

All state-changing routes require `replay.access` and named throttles. Every route-model-bound session/position must be checked against the authenticated account.

## Maintenance

- Keep money/quantity calculations server authoritative.
- Define rounding, fee, margin, and PnL behavior in one backend path.
- Update account summaries and transaction history for every new state transition.
- Never describe simulated balances as deposited or custodied funds.

## Verification

- Market/limit/trigger long and short orders.
- SL/TP drag updates and automatic triggers.
- Insufficient balance, invalid leverage/quantity/price.
- Concurrent tabs/double submission.
- Cancel pending, close open, end session, reset.
- Cross-user record access returns not found/forbidden.

Related: [Reports](trade-reports-and-journals.md), [Replay](replay-and-progress.md).
# Custom demo balance

The trader Assets panel accepts a starting balance from `1` through `1,000,000,000`. Applying it uses the existing demo reset operation and requires confirmation because it deletes positions and demo trades and resets cash, realized PnL, and fees.
