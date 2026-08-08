# System Error Logs and Payment Activity History

## Purpose

Two related but distinct admin modules, both added to close a gap where failures and payment
lifecycle events were only ever visible in `storage/logs/laravel.log` (or not recorded at all for
backtest/replay, which had no logging whatsoever) and nowhere queryable by an admin.

| File | Responsibility |
|---|---|
| `app/Services/SystemErrorLogger.php` | Persists a `Throwable` to `system_error_logs`, with dedup |
| `app/Exceptions/Handler.php` | Calls `SystemErrorLogger` from its `reportable()` hook |
| `SystemErrorLogController.php`, `Pages/SystemLogs/AdminIndex.jsx` | Admin error log browser |
| `app/Services/Payments/PaymentActivityLogger.php` | Persists one payment lifecycle entry |
| `PaymentActivityLogController.php`, `Pages/Subscriptions/ActivityLog.jsx` | Admin activity browser |

## System error logs

`SystemErrorLogger::log(Throwable $e, ?Request $request)` is called from a single place —
`Handler::register()`'s `reportable()` closure — so **every exception that reaches Laravel's
default exception reporting, app-wide, is captured automatically**, not just payments/backtest.
This works because:

- Laravel's own `report()`/exception pipeline already filters out routine noise (validation
  errors, 404s, auth failures, etc. — see `Handler`'s inherited `$dontReport`/internal list)
  *before* calling registered `reportable()` closures, so this callback only sees exceptions
  worth an admin's attention.
- Any explicit `report($exception)` call already scattered through the payment code
  (`PayMongoWebhookController`, `ReplayAccessController`, `ProcessPayMongoWebhookEvent`) routes
  through the same pipeline and is captured for free.
- Backtest/replay code (`MarketBacktestController`, `MarketReplayProgressController`, etc.) had
  **no logging at all** before this — any exception there was silently swallowed by Laravel's
  default handler into the log file only. Hooking the global handler captures these too, without
  needing to add try/catch blocks to that code.

Each row records the exception class, message, file/line, a truncated stack trace (20k chars),
the request URL/method/IP and authenticated user when available, and an `area` tag
(`payments` / `backtest` / `general`) inferred from the exception's originating file path via a
small keyword match (`SystemErrorLogger::AREA_KEYWORDS`) — good enough for admin filtering,
not meant to be a precise taxonomy.

**Dedup/throttle**: an unresolved log with the same exception class + file + line, created within
the last hour, has its `occurrences` counter incremented and `last_seen_at` bumped instead of
inserting a new row. This exists specifically so a hot-loop or recurring cron failure doesn't
flood the table — without it, a single misconfigured scheduled command could write thousands of
near-identical rows per day. A *resolved* log is excluded from the dedup match, so a recurrence
after an admin marked it resolved creates a fresh row rather than silently reopening the old one.

Logging is best-effort and swallows its own failures (falls back to `Log::error()`) — a broken
error-logging path must never turn one error into two.

Admin UI (`/admin/system-errors`, superadmin-only): master/detail list filterable by area,
resolved status, and free-text search (message/class/file/URL); detail pane shows full message,
file/line, user, method/URL/IP, and a collapsible stack trace; a "Mark resolved" / "Reopen"
toggle (`POST /admin/system-errors/{id}/resolve`) for triage — this is manual admin judgment,
not automatic.

## Payment activity history

`PaymentActivityLogger::log(?SubscriptionRequest $payment, ?AdmUser $user, string $action, string $description, array $context = [], string $actor = 'system')`
is called at each point in the payment lifecycle where the *outcome* is decided, not at every
intermediate step, to avoid duplicate entries for the same business event reached via different
trigger paths (webhook vs. manual reconcile vs. checkout return all funnel through the same
`SubscriptionEntitlementService` methods):

| Action | Where logged | Actor |
|---|---|---|
| `checkout_created` | `PayMongoCheckoutService::create()` on success | system |
| `checkout_failed` | `PayMongoCheckoutService::create()` on exception | system |
| `checkout_expired` / `checkout_failed` | `applyCheckoutResource()` when PayMongo reports the session expired/cancelled/failed | system |
| `payment_activated` | `SubscriptionEntitlementService::activate()` | system |
| `access_revoked` | `SubscriptionEntitlementService::revoke()` (refund or dispute) | `admin:{id}` when triggered by the admin refund route (`context['triggered_by']`), otherwise `system` (webhook-driven) |
| `access_restored` | `SubscriptionEntitlementService::restoreAccess()` | `admin:{id}` |
| `trial_activated` | `ReplayAccessController::activateTrial()` on success | system |

Trial activations have no `SubscriptionRequest` row (the trial is tracked purely on `AdmUser`),
so `subscription_request_id` is null for those entries; `adm_user_id` is still recorded directly.
Webhook receipt itself is **not** duplicated here — `pay_mongo_webhook_events` (see
[Subscriptions and PayMongo](subscriptions-trials-and-paymongo.md)) already serves as the raw
webhook audit trail; this table is the higher-level business narrative built on top of it.

Like `SystemErrorLogger`, logging is best-effort (`report()`s and swallows its own failures) and
is written inside the same DB transaction as the state change it describes, so a rolled-back
transaction doesn't leave an orphaned activity entry.

Admin UI (`/admin/payment-activity`, superadmin-only): reverse-chronological list filterable by
action and free-text search, with a `?subscription_request_id=` query param that pre-filters to
one transaction's full story — `Pages/Subscriptions/AdminIndex.jsx` links to this from a
"History" button on every row, so an admin investigating one payment (e.g. a double-payment
dispute) can see its entire lifecycle in one place.

## Verification

- A non-superadmin request to either module's routes is rejected before reaching the service.
- `SystemErrorLogger`: an exception is persisted with the correct classified `area`; a repeated
  identical exception within the dedup window increments `occurrences` instead of inserting a
  new row; a *resolved* log does not absorb a recurrence (a fresh row is created instead);
  logging never throws even when persistence itself is impossible.
- `PaymentActivityLogger`: an entry records the correct `subscription_request_id`/`adm_user_id`;
  `adm_user_id` falls back to the payment's own owner when no explicit user is passed; a
  trial-activation entry is supported with a null `subscription_request_id`; logging never throws
  even when persistence itself is impossible.
- Automated coverage: `tests/Unit/SystemErrorLoggerTest.php`, `tests/Unit/PaymentActivityLoggerTest.php`,
  `tests/Feature/SystemErrorLogRouteTest.php`, `tests/Feature/PaymentActivityLogRouteTest.php`.
  Same in-memory SQLite convention as the rest of this codebase's DB-isolated tests; self-skip
  where `pdo_sqlite` isn't installed.

Related: [Subscriptions and PayMongo](subscriptions-trials-and-paymongo.md), [Backtesting](backtesting-and-orders.md), [Replay](replay-and-progress.md).
