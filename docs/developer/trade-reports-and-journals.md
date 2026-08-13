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
| `MarketBacktestController.php` | Queries, ownership, export request/download, journal update, insights |
| `MarketBacktestReportService.php` | Shared closed-position query + row serialization, used by the controller and the export job |
| `MarketBacktestInsightService.php` | Rule-based coaching tips computed from closed positions, shared by the report page and the dashboard widget |
| `GenerateBacktestReportExport` (job) | Builds the CSV/JSON file and notifies the user |
| `MarketBacktestExport` (model) | Tracks one export request's lifecycle (`pending`→`processing`→`ready`/`failed`) |
| `TradeInsightsWidget.jsx` | Compact single-tip teaser rendered on the trader dashboard workspace, links to the full report |

## Flow

1. Report components request closed positions with date/session/market filters.
2. The controller scopes records through the authenticated account and uses report indexes.
3. Response data feeds summary cards, calendar aggregation, and rows.
4. Journal edits update setup/freeform tags, reason, mistake, emotion, and notes on the owned closed position.
5. Snapshot links use authorized routes/storage rather than exposing private paths.

## Coaching insights

The report response also includes `playbookPerformance`, grouped from immutable position snapshots rather than the current editable playbook record. Each row contains trade count, wins, win rate, net PnL, and average PnL. Serialized trades include `playbook`, `checklistAnswers`, and `checklistComplete`; the existing `setupTag` remains populated with the selected playbook name for compatibility.

## Advanced analytics and Monte Carlo

`MarketBacktestAdvancedAnalyticsService` calculates expectancy, profit factor, maximum absolute/percentage drawdown, recovery factor, maximum win/loss streaks, equity-curve points, and weekday/hour UTC breakdowns from the owned closed-position collection. The Trade Report displays the headline statistics.

With at least five closed positions, the same response includes a 500-run bootstrap Monte Carlo simulation. Each run samples historical trade PnL with replacement for the original trade count and returns 10th/50th/90th-percentile ending balances, median/90th-percentile drawdown, and the percentage of runs that touched half the starting balance. This is a risk estimate from the user's sample, not a forecast or investment advice.

`MarketBacktestInsightService::build(Collection $positions)` turns a set of closed positions into up to 3 rule-based coaching tips, ranked by a per-heuristic severity score. It requires at least 10 closed positions in the set it's given (`MarketBacktestInsightService::MIN_TOTAL_TRADES`) before returning anything besides `{eligible: false, currentTrades, requiredTrades: 10}` — below that, per-heuristic breakdowns (e.g. win rate on a single symbol) are too noisy to be worth surfacing. At 10 trades, group-based heuristics (side/symbol/setup-tag win rate, each needing 5+ trades per group) can only realistically fire on a roughly even split, so early tips lean more on the risk-reward and holding-time heuristics, which don't need sub-grouping.

Four heuristics run, each returning `null` if it doesn't clear its own significance bar so it's silently excluded rather than shown as a weak/noisy tip:

- **Risk-reward imbalance** — average loss vs average win, fires when one exceeds the other by ≥30%.
- **Win rate by side / symbol** — groups closed positions by `side` and separately by `symbol` (min 5 trades/group), surfaces the single group whose win rate deviates ≥15 points from the overall rate.
- **Holding-time pattern** — compares average hold duration (`closed_at_time - opened_at_time`) of wins vs losses; fires at a ≥1.5x ratio either direction ("cutting winners early" or "holding winners too long").
- **Setup-tag win rate** — same grouping logic as side/symbol, but keyed on `setup_tag` normalized (trimmed, lowercased); blank tags are excluded from grouping. This one is inherently best-effort since `setup_tag` is freeform text a user may or may not tag consistently, not a fixed category.

`MarketBacktestController::report()` passes its already-loaded, filter-scoped `$positions` collection into the insight service and returns the result under an `insights` key — no extra query, and insights respect whatever `symbol`/`session_id` filters were passed to `report()`. **The Trade Report page's own symbol/side/result/journal-status/search filters are applied entirely client-side in `TradeReport.jsx`** (see Maintenance below) and are never sent to `report()`, so in practice today's UI only ever requests the account-wide set — the server-side `symbol`/`session_id` scoping exists and is exercised by tests, but isn't reachable from the current UI. Wire an actual filter control to those params if per-symbol/per-session insights are wanted later.

`GET /market-backtest/report/insights` (`MarketBacktestController::reportInsightsSummary`) is a second, lightweight entry point used only by the dashboard's `TradeInsightsWidget.jsx`: it queries the account's 300 most recent closed positions (unfiltered) via the same `MarketBacktestReportService::getReportPositions()` and returns just `{insights}`, not the full trade list, since the widget only ever renders the single highest-severity tip (`insights.items[0]`) as a dismissible one-line teaser above `WatchlistPanel` in the trading workspace, linking to `/trade-report` for the rest. Both entry points share one `MarketBacktestInsightService` instance so heuristic logic is never duplicated between the two surfaces.

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
- `TradeReport.jsx` fetches all (up to 500) closed positions once per `refreshKey` change and does symbol/side/result/journal-status/search filtering entirely client-side over that fetched set (`filteredTrades`) — it does not send `symbol`/`session_id` to `report()`, even though the endpoint supports both. Keep this in mind before assuming a UI filter narrows what the server (or the insight service) sees.
- Add a new coaching heuristic in `MarketBacktestInsightService` as another private `...Insight()` method returning `?array{type,tone,severity,title,message}` (or reusing `groupWinRateInsight()` for another grouping key), then add it to the `collect([...])` list in `build()`. Keep the per-heuristic significance thresholds (min group size, min deviation) — an insight that fires on noise erodes trust in the whole feature faster than one that stays silent.

## Verification

- Empty and populated account.
- Date/session/symbol filters and pagination.
- Timezone boundaries in calendar days.
- CSV/JSON/server export contents.
- Journal save/reload and cross-user denial.
- Search and combined filters, empty filtered results, page-size changes, and pagination boundaries.
- Export request creates a `pending` row and returns immediately; a queue worker processing it flips it to `ready` (or `failed`) and produces a notification; the download route rejects other users' export IDs.
- Insights: below/at/above the 10-trade threshold; each heuristic firing and not firing in isolation; more than 3 heuristics firing at once still caps at 3; `report()` and `report/insights` both reflect the same underlying data through the shared service.

Related: [Backtesting](backtesting-and-orders.md), [Testing](testing-guide.md).
