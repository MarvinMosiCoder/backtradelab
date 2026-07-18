# File Reference

Use this index to find the feature owner of a source file. Detailed behavior belongs in the linked guide.

| Source path | Feature guide |
|---|---|
| `routes/web.php`, `routes/api.php` | [Architecture](02-project-architecture.md) and linked route owner |
| `resources/js/app.jsx`, `AppInitializer.jsx` | [Architecture](02-project-architecture.md) |
| `app/Http/Controllers/Auth/*` | [Authentication](authentication-and-oauth.md) |
| `app/Http/Controllers/Users/*`, `AccountDeactivationService.php` | [Users and profiles](users-profiles-and-deactivation.md) |
| `AdminUsersController.php`, `PrivilegesController.php`, `MenusController.php`, `ModulsController.php` | [Roles and menus](roles-privileges-menus.md) |
| `DashboardController.php`, `Pages/Dashboard/*`, `Layouts/*` | [Dashboard and layouts](dashboard-and-layouts.md) |
| `Pages/Public/*`, `CookieNotice.jsx`, `config/legal.php` | [Public and legal](public-and-legal-pages.md) |
| `MarketDataController.php`, `MarketMetadataService.php`, `MarketOverviewController.php`, `MarketOverviewService.php`, `MarketSymbol.php` | [Market data](market-data-and-symbols.md) |
| `Components/Market/TradingViewChart*` | [Trading chart](trading-chart.md) |
| `MarketDrawingController.php`, `MarketToolSettingController.php` | [Drawings and settings](chart-drawings-and-settings.md) |
| `liveCandleStream.js` | [Live streaming](live-market-streaming.md) |
| `MarketReplayProgressController.php`, `MarketReplayProgress.php` | [Replay](replay-and-progress.md) |
| `MarketBacktestController.php`, `MarketBacktest*.php` | [Backtesting](backtesting-and-orders.md) and [Reports](trade-reports-and-journals.md) |
| `MarketPriceAlertController.php`, `NotificationsController.php` | [Alerts and notifications](price-alerts-and-notifications.md) |
| `ReplayAccessController.php`, `Services/Payments/*`, `PayMongoWebhookController.php` | [Subscriptions and PayMongo](subscriptions-trials-and-paymongo.md) |
| `UserFeedbackController.php`, `Pages/Feedback/*` | [Feedback](feedback.md) |
| `AnnouncementsController.php`, `Announcement.php` | [Announcements](announcements.md) |
| `AdminApiController.php`, `Api/ApiController.php`, `Models/AdmModels/Api*` | [Admin API generator](admin-api-generator.md) |
| `SettingsController.php`, `Components/SystemSettings/*` | [System settings](system-settings.md) |
| `database/migrations/*` | The feature guide for the table being changed |
| `tests/*` | [Testing guide](testing-guide.md) |

## Route coverage ownership

Shared authentication/profile/market/subscription/feedback/admin routes are covered by their guides. Notification/filter/export and database-generated controller routes are legacy admin infrastructure covered by [Roles and menus](roles-privileges-menus.md), [Announcements](announcements.md), [Admin API generator](admin-api-generator.md), or [System settings](system-settings.md). `routes/channels.php` and `routes/console.php` are framework/operations entry points; document new channel or scheduled-command behavior in the owning feature guide.
