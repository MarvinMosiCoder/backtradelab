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
| `ProcessPayMongoWebhookEvent` (job) | Applies a paid/refunded/dispute checkout event in the background |
| `SubscriptionPlan/Request/Message.php` | Plans and transaction/history records |
| `SubscriptionModal.jsx`, `Pages/Subscriptions/*` | User/admin UI |
| `SendSubscriptionRenewalReminders` (command) | Notifies users before paid access expires |

## Routes and flow

1. `GET /replay-access` returns trial/paid availability without starting the trial.
2. `POST /replay-trial/activate` atomically starts the one-time trial.
3. `POST /subscription-checkouts` validates a server-owned plan and UUID submission token.
4. The service snapshots amount, currency, duration, user, mode, and provider checkout identity.
5. PayMongo hosts payment. Return route/status polling may reconcile, but only verified provider-paid data activates access.
6. `POST /webhooks/paymongo` verifies the raw body signature, deduplicates on `provider_event_id`, and for a paid checkout event dispatches `ProcessPayMongoWebhookEvent` before acknowledging — the HTTP response no longer waits for `SubscriptionEntitlementService::activate` to run.
7. Paid duration extends from the later of current expiry or activation time.

The webhook only synchronously rejects an unusable/invalid payload, a duplicate already `processed`/`ignored`/`unhandled`, a livemode mismatch, or a failure to enqueue the job (any of these still return a non-200 so PayMongo retries). Once the job is enqueued the webhook always acknowledges `200`, even if the job itself later fails — a job failure marks the event `failed` and relies on the existing `payments:reconcile-paymongo` scheduler (every 5 minutes, polls PayMongo directly for `pending` payments) rather than PayMongo's own webhook retry to recover. This is safe because `SubscriptionEntitlementService::activate` is already idempotent (locks the row, short-circuits once `status === 'paid'`).

## Refunds, disputes, and access revocation

Money-correctness gap, closed: previously the webhook only ever processed `checkout_session.payment.paid` — a refund or chargeback happening in PayMongo produced zero effect in the app, and there was no code path anywhere (webhook, admin, or scheduled) that could shorten a user's already-granted `replay_access_ends_at`. A refunded/charged-back user kept full paid access for the entire original duration. This is now handled end to end:

- **Webhook**: `PayMongoWebhookController::SUPPORTED_EVENT_TYPES` also recognizes `payment.refunded` and `dispute.updated`, routed by `ProcessPayMongoWebhookEvent`'s `match` to `PayMongoCheckoutService::processRefundResource()` / `processDisputeResource()`. **The exact event-type strings are best-guess, not confirmed against PayMongo's live webhook catalog** (`payment.refunded` moderate confidence; `dispute.updated` low confidence — PayMongo may not expose chargebacks via webhook at all, only via its dashboard). Verify both against PayMongo's dashboard webhook-subscription UI or official API reference before relying on this in production. Any *other* webhook event type whose name matches `/refund|dispute|chargeback/i` is stored with `status = 'unhandled'` (distinct from the generic `'ignored'` bucket used for genuinely irrelevant event types) and reported via `report()`, so a wrong guess about the real event name produces a visible, queryable signal instead of silently never firing. If a real payload's resource shape doesn't match either of the two guessed shapes `extractPaymentId()` checks for (the resource itself being a `type: payment` object, or a `attributes.payment_id` field), the event fails cleanly with a legible `result_message` rather than mis-processing.
- **`SubscriptionEntitlementService::revoke()`**: the counterpart to `activate()`. It **fully clears** the user's `replay_access_ends_at` (sets it to a past instant) rather than subtracting the refunded purchase's `duration_days` from it. Reasoning: `activate()` maintains a single merged access cursor per user, not a per-purchase ledger, so if a user's purchases have a gap (one fully lapses, then a later unrelated purchase starts fresh), subtracting a duration can wrongly claw back a *different, unrefunded* purchase's legitimate remaining access — a full clear is pinned to the moment of revocation instead of arithmetic derived from a duration that may be unrelated to the current cursor. This intentionally over-revokes in the rare case another unrefunded purchase is still active; that case is logged (`Log::warning`, matched on "over-revoked") rather than silently accepted, so it surfaces for manual review. `revoke()` is idempotent (no-op if already `refunded`) and creates an `AdmNotifications` row the same way `activate()` does.
- **Admin-triggered refund**: `POST /admin/subscriptions/{subscriptionRequest}/refund` (superadmin-only, same middleware as the existing `reconcile` action) → `ReplayAccessController::adminRefund()` → `PayMongoCheckoutService::refund()`, which calls PayMongo's refund API (`PayMongoClient::refundPayment()`) and, on an accepted response (`pending` or `succeeded` — refunds may be asynchronous at the provider), calls `revoke()`. On any failure the transaction reverts to `status = 'paid'` with `provider_status_message` explaining what happened — it is never left stuck on the transient `'refunding'` lock status. **The refund request/response body shape and the accepted `reason` enum values are best-guess** (`duplicate | fraudulent | requested_by_customer | others`, mirroring Stripe's vocabulary PayMongo is known to follow) — confirm against PayMongo's live API reference or a real test-mode call before relying on this in production. Refunds are full-amount only; there is no partial-refund UI.
- **Admin UI**: `Pages/Subscriptions/AdminIndex.jsx` gained a status color badge (previously plain text — the color `tones` map, now shared via `Components/Subscriptions/statusTones.js` with `UserIndex.jsx`, includes a new `refunded` tone) and a "Refund" button, shown only on `provider === 'paymongo' && status === 'paid'` rows. It opens a SweetAlert2 confirmation (this codebase's existing destructive-action pattern, e.g. `Pages/AdmVram/Users.jsx`'s bulk activate/deactivate confirm — not the heavier `Modal.jsx` component) stating the exact amount and customer, requiring a reason code and a free-text internal note (minimum 10 characters, validated in `preConfirm`) before the real refund request fires. `Pages/Subscriptions/UserIndex.jsx` shows the same `refunded` badge and a "Refunded {date}" line; it deliberately does not show `refund_reason` (the admin's internal note) to the customer — `ReplayAccessController::paymentPayload()` only includes `refund_reason` when `$includeUser` is true (the admin payload), never in the user's own payload.
- **Dispute webhook revokes on any dispute-shaped event, not only a confirmed loss.** This is conservative by design (silently keeping a liability alive is worse than a visible, loggable over-revoke), but it means a merchant who *wins* a dispute currently has no admin action to restore the access that was pre-emptively revoked — there is no "grant N days" admin action in this codebase. That would need to be built separately if disputes-later-won turn out to be common.
- **A refunded row automatically drops out of revenue reporting with zero code change**: `DashboardController`'s lifetime/30-day revenue sums filter `where('status', 'paid')`, so a `refunded` status is excluded for free. Worth a manual smoke-test checkpoint after any real refund (lifetime/30-day revenue should visibly decrease by the refunded amount), not something to "fix" if seen — it's intended.

## Renewal reminders (no auto-renewal)

Every paid plan is a one-time purchase; there is no recurring charge and therefore nothing to "cancel" — access simply lapses at `replay_access_ends_at` unless the user manually checks out again. To reduce surprise lapses, `subscriptions:send-renewal-reminders` runs daily (`app/Console/Kernel.php`, `dailyAt('09:00')`, `withoutOverlapping()`) and finds users where `replay_access_ends_at` falls within the next `SUBSCRIPTION_RENEWAL_REMINDER_DAYS` days (default 3, `config('services.subscriptions.renewal_reminder_days')`) and `renewal_reminder_sent_at` is still null. For each match it creates an `AdmNotifications` row (`type => 'subscription_reminder'`, naming the user's most recently paid plan when known, linking to `/subscription`) and sets `renewal_reminder_sent_at`, so the same expiry cycle is never re-notified. `SubscriptionEntitlementService::activate` clears `renewal_reminder_sent_at` back to null whenever it extends access, so the next expiry cycle can remind again. This is in-app notification only — no email — since the app's only real email flow today is password reset (`App\Mail\Mailer`), and `.env.example` still points `MAIL_HOST` at a local dev catcher, not a confirmed production sender.

Checkout creation is guarded by `PAYMONGO_ENABLED`, mode/key compatibility, eligible methods, and the explicit live-production gate.

For local development only, `PAYMONGO_TEST_BYPASS_CAPABILITIES=true` skips the merchant-capability lookup when `PAYMONGO_MODE=test` and the application environment is not production. Checkout still uses PayMongo's real test API, which may reject methods that the account cannot use. The bypass never applies to live mode or production and must be disabled after PayMongo enables the account capabilities.

## Data and security

- `subscription_plans`: server-controlled selectable products.
- `subscription_requests`: immutable transaction snapshot plus provider/status fields. Also carries refund fields: `provider_refund_id`, `refunded_at`, `refund_amount`, `refund_status` (PayMongo's own pending/succeeded/failed, audit only), `refund_reason` (admin-only internal note, never sent to the user payload). `status` is an unconstrained string column (no DB enum/check constraint) — `'refunded'` and the short-lived transient lock state `'refunding'` are just new values, no migration was needed for the column itself.
- `pay_mongo_webhook_events`: webhook deduplication/audit; now also stores the raw `resource` payload (JSON) so the queued job can process it without needing the original HTTP request. `status` also accepts `'unhandled'` (a refund/dispute-shaped event type with no coded processor yet — distinct from `'ignored'`, which is for genuinely irrelevant event types).
- `adm_users`: trial and paid access timestamps, plus `renewal_reminder_sent_at` (cleared on each renewal so the reminder command fires again next cycle).
- Legacy proof/message download routes remain authorized for preserved historical data.

Never expose secret/webhook keys to React. Never trust amount, duration, paid status, or livemode from the browser.

Customer-facing copy (`SubscriptionModal.jsx`, `Pages/Subscriptions/UserIndex.jsx`, and the admin page's header text) intentionally avoids naming PayMongo — "secure checkout" / "payment provider" / "online" in place of the vendor name. This is deliberate, not an inconsistency: keep new user-facing strings in this area generic too. Privacy Policy and Terms of Service still name PayMongo explicitly, since disclosing the third party that processes payment data is a legal requirement there, not just UI copy — do not remove it from those two pages. The admin transactions table/filter (`AdminIndex.jsx`) still uses the literal `paymongo` value for filtering and the `provider` column, since that's an internal operational tool matching a real backend enum, not customer-facing branding.

The admin overview reports lifetime and rolling-30-day verified PHP revenue, paid counts, pending sessions, and failed/expired sessions. Revenue includes only `status=paid`, uses `paid_at` for the rolling window, and does not mix currencies.

Each subscription plan owns a display-only `features` JSON list. Administrators can add, remove, edit, and reorder up to eight feature labels; labels are trimmed, deduplicated case-insensitively, and limited to 80 characters. These labels describe the plan in the compact selection modal and do not alter Replay entitlement or PayMongo verification. The modal keeps plan features inside each plan card and uses a viewport-bounded scrolling fallback only when the available screen is too short.

The admin pricing editor follows the shared application theme for cards, fields, borders, actions, loading text, and save feedback in both dark and light modes.

## Verification

- Trial activates once under concurrent clicks.
- Weekly/monthly/yearly active and priced plans.
- Duplicate submission token returns the same transaction.
- Success, failure, abandonment, delayed/duplicate/missed webhook.
- A running queue worker is required for paid webhooks to actually apply — without one, `pay_mongo_webhook_events` rows stay `received` and only the 5-minute reconciliation command grants access.
- Signature age/body validation and provider amount/currency/mode match.
- Test capability bypass is opt-in, avoids the capability request, and cannot activate in live mode or production.
- Admin reconciliation and scheduler command.
- Renewal reminder fires once per expiry cycle inside the configured window, not before it and not again after renewal resets `renewal_reminder_sent_at`.
- Refund/dispute webhooks: a `payment.refunded`/`dispute.updated` event is recognized and queued (not `ignored`); an unrecognized-but-refund/dispute-shaped event type lands as `status = 'unhandled'`, not `'ignored'`; a genuinely irrelevant event type still lands as `'ignored'`; a duplicate delivery of any of these is not reprocessed.
- Admin refund: only appears on `paid` PayMongo rows; the confirmation dialog blocks submission under a 10-character reason; a successful refund calls `revoke()` (access cleared, notification created, admin dashboard revenue drops accordingly); a provider failure reverts the row to `status = 'paid'` with `provider_status_message` set and leaves access untouched — never stuck on `'refunding'`; a non-`paid` row is rejected before any PayMongo API call.
- `revoke()` is idempotent, and its "fully clear rather than subtract" behavior holds even when the refunded purchase's own window had already lapsed before a later, unrelated, still-active purchase was made.
- Non-superadmin requests to the refund route are rejected before reaching the service.
- Automated coverage lives in `tests/Unit/SubscriptionEntitlementServiceRevokeTest.php`, `tests/Unit/PayMongoCheckoutServiceRefundTest.php`, `tests/Feature/PayMongoWebhookEventTypesTest.php`, and `tests/Feature/AdminSubscriptionRefundRouteTest.php`. These build an isolated in-memory SQLite schema (same pattern as `AdminOperationsDashboardTest.php`) and require the `pdo_sqlite` PHP extension — they self-skip with a clear message where it isn't installed, matching this repo's existing convention for DB-isolated tests, rather than mutating the real configured database.

Related: [Replay](replay-and-progress.md), [Deployment](deployment-and-production.md).
# Active-access plan display

`/replay-access` returns `activeAccess` with `kind`, paid `plan` when applicable, and `endsAt`. An active trial or paid entitlement makes the plans modal read-only and the active trial/plan is highlighted. Checkout creation enforces the same rule with HTTP 409 until access expires. PayMongo verification, reconciliation, and webhook entitlement rules are unchanged.
