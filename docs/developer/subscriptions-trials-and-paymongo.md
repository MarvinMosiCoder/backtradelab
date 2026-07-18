# Subscriptions, Trials, and PayMongo

## Purpose

Replay/backtesting access comes from a one-time seven-day trial or paid duration. Paid checkout is hosted by PayMongo; browser redirects never grant entitlement by themselves.

| File | Responsibility |
|---|---|
| `ReplayAccessController.php` | Access, trial, plans, user/admin pages, checkout endpoints |
| `PayMongoCheckoutService.php` | Create/reconcile/process checkout |
| `PayMongoClient.php` | Provider HTTP API and availability gates |
| `PayMongoSignatureVerifier.php` | Webhook signature/timestamp validation |
| `SubscriptionEntitlementService.php` | Validate paid resource and extend access idempotently |
| `PayMongoWebhookController.php` | Public webhook handler |
| `SubscriptionPlan/Request/Message.php` | Plans and transaction/history records |
| `SubscriptionModal.jsx`, `Pages/Subscriptions/*` | User/admin UI |

## Routes and flow

1. `GET /replay-access` returns trial/paid availability without starting the trial.
2. `POST /replay-trial/activate` atomically starts the one-time trial.
3. `POST /subscription-checkouts` validates a server-owned plan and UUID submission token.
4. The service snapshots amount, currency, duration, user, mode, and provider checkout identity.
5. PayMongo hosts payment. Return route/status polling may reconcile, but only verified provider-paid data activates access.
6. `POST /webhooks/paymongo` verifies the raw body signature and processes events idempotently.
7. Paid duration extends from the later of current expiry or activation time.

Checkout creation is guarded by `PAYMONGO_ENABLED`, mode/key compatibility, eligible methods, and the explicit live-production gate.

For local development only, `PAYMONGO_TEST_BYPASS_CAPABILITIES=true` skips the merchant-capability lookup when `PAYMONGO_MODE=test` and the application environment is not production. Checkout still uses PayMongo's real test API, which may reject methods that the account cannot use. The bypass never applies to live mode or production and must be disabled after PayMongo enables the account capabilities.

## Data and security

- `subscription_plans`: server-controlled selectable products.
- `subscription_requests`: immutable transaction snapshot plus provider/status fields.
- `pay_mongo_webhook_events`: webhook deduplication/audit.
- `adm_users`: trial and paid access timestamps.
- Legacy proof/message download routes remain authorized for preserved historical data.

Never expose secret/webhook keys to React. Never trust amount, duration, paid status, or livemode from the browser.

Each subscription plan owns a display-only `features` JSON list. Administrators can add, remove, edit, and reorder up to eight feature labels; labels are trimmed, deduplicated case-insensitively, and limited to 80 characters. These labels describe the plan in the compact selection modal and do not alter Replay entitlement or PayMongo verification. The modal keeps plan features inside each plan card and uses a viewport-bounded scrolling fallback only when the available screen is too short.

## Verification

- Trial activates once under concurrent clicks.
- Weekly/monthly/yearly active and priced plans.
- Duplicate submission token returns the same transaction.
- Success, failure, abandonment, delayed/duplicate/missed webhook.
- Signature age/body validation and provider amount/currency/mode match.
- Test capability bypass is opt-in, avoids the capability request, and cannot activate in live mode or production.
- Admin reconciliation and scheduler command.

Related: [Replay](replay-and-progress.md), [Deployment](deployment-and-production.md).
# Active-access plan display

`/replay-access` returns `activeAccess` with `kind`, paid `plan` when applicable, and `endsAt`. An active trial or paid entitlement makes the plans modal read-only and the active trial/plan is highlighted. Checkout creation enforces the same rule with HTTP 409 until access expires. PayMongo verification, reconciliation, and webhook entitlement rules are unchanged.
