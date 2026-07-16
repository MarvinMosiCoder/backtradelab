# Trade Reports and Journals

## Purpose

Closed simulated positions feed PnL summaries, a calendar, exports, snapshots, and editable journal fields.

| Route/file | Responsibility |
|---|---|
| `GET /market-backtest/report` | Filtered report JSON |
| `GET /market-backtest/report/export` | Server export |
| `PUT /market-backtest/trades/{position}/journal` | Journal update |
| `TradeReportPage.jsx` | Report page |
| `TradeReport.jsx` | Summaries, table, client export, journal UI |
| `TradeCalendar.jsx` | Daily result visualization |
| `MarketBacktestController.php` | Queries, ownership, export/update |

## Flow

1. Report components request closed positions with date/session/market filters.
2. The controller scopes records through the authenticated account and uses report indexes.
3. Response data feeds summary cards, calendar aggregation, and rows.
4. Journal edits update setup/freeform tags, reason, mistake, emotion, and notes on the owned closed position.
5. Snapshot links use authorized routes/storage rather than exposing private paths.

## Maintenance

- Add a report field first to the authoritative query/serializer, then table/export/UI.
- Keep server and client exports consistent.
- Define whether a statistic groups by entry or close time; current reporting is close-oriented.
- Validate journal lengths/types and sanitize any rendered rich text.

## Verification

- Empty and populated account.
- Date/session/symbol filters and pagination.
- Timezone boundaries in calendar days.
- CSV/JSON/server export contents.
- Journal save/reload and cross-user denial.

Related: [Backtesting](backtesting-and-orders.md), [Testing](testing-guide.md).
