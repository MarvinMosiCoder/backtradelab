# Price Alerts and Notifications

## Purpose

Users create directional market-price alerts. While the chart is open it checks current price, marks triggered alerts, creates notifications, and removes their chart lines.

| Route/file | Responsibility |
|---|---|
| `GET/POST /market-price-alerts` | List/create alerts |
| `POST /market-price-alerts/check` | Evaluate active alerts for a market price |
| `DELETE /market-price-alerts/{alert}` | Remove owned alert |
| `MarketPriceAlertController.php` | Validation, ownership, trigger processing |
| `MarketPriceAlert.php` | Alert record |
| `NotificationsController.php` / `AdmNotifications.php` | Notification UI/data |
| `TradingViewChart.jsx` | Alert line/modal/open-chart checks |

## Flow

1. Chart submits exchange/category/symbol, target price, direction, and last price.
2. Server stores an active user-owned alert.
3. Open chart periodically submits current price to `/check`.
4. `above` triggers on the intended upward crossing and `below` on downward crossing.
5. Triggered alerts become inactive/triggered and a notification is produced.

## Maintenance and limits

- Route-model-bound deletion must verify `adm_user_id`.
- Deactivation disables active alerts.
- Open-browser checks are not an offline alert service. Production offline delivery requires a scheduled/queued exchange-price worker.
- Make trigger processing idempotent so repeated prices do not duplicate notifications.

## Verification

- Rise/drop direction and crossing behavior.
- Reloaded active lines.
- Delete and trigger ownership.
- Duplicate check idempotency.
- Account deactivation disables alerts.

Related: [Live streaming](live-market-streaming.md), [Users](users-profiles-and-deactivation.md).
