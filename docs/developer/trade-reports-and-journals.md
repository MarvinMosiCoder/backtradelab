# Trade Reports and Journals

## Purpose

Closed simulated positions feed PnL summaries, a calendar, exports, snapshots, and editable journal fields.

| Route/file | Responsibility |
|---|---|
| `GET /market-backtest/report` | Filtered report JSON |
| `POST /market-backtest/report/export` | Queue a CSV/JSON export job |
| `GET /market-backtest/report/export/{export}/download` | Download a ready export |
| `PUT /market-backtest/trades/{position}/journal` | Journal update |
| `TradeReportPage.jsx` | Report page |
| `TradeReport.jsx` | Summaries, table, export trigger, journal UI |
| `TradeCalendar.jsx` | Daily result visualization |
| `MarketBacktestController.php` | Queries, ownership, export request/download, journal update |
| `MarketBacktestReportService.php` | Shared closed-position query + row serialization, used by the controller and the export job |
| `GenerateBacktestReportExport` (job) | Builds the CSV/JSON file and notifies the user |
| `MarketBacktestExport` (model) | Tracks one export request's lifecycle (`pending`→`processing`→`ready`/`failed`) |

## Flow

1. Report components request closed positions with date/session/market filters.
2. The controller scopes records through the authenticated account and uses report indexes.
3. Response data feeds summary cards, calendar aggregation, and rows.
4. Journal edits update setup/freeform tags, reason, mistake, emotion, and notes on the owned closed position.
5. Snapshot links use authorized routes/storage rather than exposing private paths.

## Export (queued)

Exporting up to 5,000 rows with per-row snapshot lookups was the heaviest synchronous operation on this controller, so it runs as a background job instead of streaming inline:

1. `TradeReport.jsx`'s CSV/JSON buttons `POST /market-backtest/report/export`, which creates a `MarketBacktestExport` row (`status = pending`) and dispatches `GenerateBacktestReportExport` — the response returns immediately, it does not carry the file.
2. The job (queue worker) loads the account's closed positions via `MarketBacktestReportService`, writes the CSV/JSON to the `public` disk under `market-backtest-exports/{user_id}/`, and marks the row `ready` (or `failed` with an `error` message).
3. Either outcome creates an `AdmNotifications` row (`source_type = market_backtest_export`, deduplicated on `source_id` like price alerts) whose `url` points at the download route, surfaced through the existing notification bell.
4. `GET /market-backtest/report/export/{export}/download` streams the stored file after checking `adm_user_id` ownership and `status = ready`.

The notification list (`Pages/AdmVram/NotificationsViewAll.jsx`) renders a notification with a `url` as a real `<a href>` — not an Inertia `<Link>` and not a client-side redirect — so the browser handles the `Content-Disposition: attachment` response as a normal file download without navigating away from the notifications page. `NotificationsController::viewAllNotification` must keep passing `url` through in its mapped response for this to work; it was previously dropped, which is why export-ready notifications were unclickable.

This requires a running queue worker (`QUEUE_CONNECTION=database`, `php artisan queue:work`, supervised in production — see [Deployment](deployment-and-production.md)). `MarketBacktestReportService` also backs the synchronous `report()` summary and the trade-journal response, so a report field added there is available to both the live summary and the export without duplicating serialization.

The closed-trades journal table supports client-side full-text search across symbols and journal content, symbol/side/result/journal-status filters, selectable page sizes, and numbered pagination. Filtering resets to the first page and does not change the account-wide summary cards or export contents.

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
- Search and combined filters, empty filtered results, page-size changes, and pagination boundaries.
- Export request creates a `pending` row and returns immediately; a queue worker processing it flips it to `ready` (or `failed`) and produces a notification; the download route rejects other users' export IDs.

Related: [Backtesting](backtesting-and-orders.md), [Testing](testing-guide.md).
