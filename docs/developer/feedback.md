# Feedback

## Purpose

Traders submit categorized feedback and review their history. Superadmins search, prioritize, change workflow status, and respond.

| Route/file | Responsibility |
|---|---|
| `GET /feedback`, `/feedback/items` | User page/history |
| `POST /feedback/items` | Create feedback |
| `GET /admin/feedback*` | Admin inbox/data |
| `PUT /admin/feedback/items/{feedback}` | Admin workflow update |
| `UserFeedbackController.php` | Validation, ownership, admin enforcement |
| `UserFeedback.php` | User/responder/subscription-request relationships |
| `Pages/Feedback/Index.jsx`, `AdminIndex.jsx` | User/admin UI |
| `GET /subscription-requests/mine` | `ReplayAccessController::myRequests()` — the current user's own payment history for the picker below |

## Flow

1. `Pages/Feedback/Index.jsx` is a two-step form, not one long page: step 1 is the category grid; picking a card immediately advances to step 2 (title/details), with a "Change category" link back to step 1. This exists specifically so the page doesn't front-load every field at once — see [System error logs and payment activity](system-error-logs-and-payment-activity.md) for the related admin-side modules this ties into.
2. When the chosen category is `payment`, step 2 also shows two extra selects before the free-text fields: "Which payment is this about?" (fetched from `/subscription-requests/mine`, scoped to the authenticated user, excluding `creating`-status rows) and "What happened?" (`duplicate` / `payment_error` / `access_not_reflected` / `other`). Both are optional — a user unsure which transaction it was, or with no payment history yet, can still submit. Every other category skips these and only ever had Title + Details.
3. Controller assigns the authenticated user and initial workflow values; `subscription_request_id` is validated to belong to that same user (`Rule::exists(...)->where('adm_user_id', ...)`) and is forced to `null` server-side whenever the category isn't `payment`, so a crafted payload can't attach an unrelated category to a transaction.
4. User history queries only that user's rows, eager-loading a thin `subscriptionRequest` summary (id/plan/amount/currency/status) for display.
5. Admin index filters all rows and returns responder/user context, plus that same `subscriptionRequest` summary and `paymentReasonCode`; the admin detail pane surfaces both as a highlighted chip with a "View activity history" link straight into `/admin/payment-activity?subscription_request_id=...` (see [System error logs and payment activity](system-error-logs-and-payment-activity.md)), so an admin reviewing a refund request doesn't have to go hunting for the transaction manually.
6. Admin update stores status, priority, response, responder, and response time as implemented.
7. `adminIndex()` now returns `paginate(30)` instead of a flat `limit(250)->get()`, so the inbox no longer silently drops anything past the 250th matching ticket — `Pages/Feedback/AdminIndex.jsx` reads `feedback.data` plus `current_page`/`last_page`/`total` and shows a page-N-of-M footer under the inbox list once there's more than one page. The user-facing `index()` (a person's own submissions) intentionally stays a plain `limit(100)` — no admin needs to page through their own ticket history.

## Maintenance

- Do not accept `adm_user_id` or responder identity from normal users.
- Validate enum-like status/priority/category/payment-reason-code values and text lengths.
- Treat page URLs and user text as untrusted output.
- Add notifications deliberately if the response workflow later requires them.
- The admin overview summarizes lifetime, rolling-30-day, open, high-priority, and awaiting-response counts and limits its recent list to five requests.
- `subscription_request_id` ownership must always be re-validated server-side (never trust a user-supplied id belongs to them) — this is exactly the kind of field a malicious payload would try to point at someone else's transaction.

## Verification

- Create validation and throttling.
- User sees only own history.
- Non-admin cannot reach admin data/actions.
- Search/filter/update and response persistence.
- Step 1 → step 2 transition preserves the chosen category; "Change category" returns to step 1 without losing the ability to pick a different one.
- Selecting `payment` loads the user's own transactions only (not another user's); a `subscription_request_id` belonging to a different user is rejected by the `store` validation.
- Choosing a non-payment category ignores/clears any stray `subscription_request_id`/`payment_reason_code` in the payload.
- Admin inbox returns the standard paginator shape; non-superadmin requests are rejected before the query runs. Automated coverage: `tests/Feature/AdminFeedbackPaginationTest.php`.

Related: [Roles](roles-privileges-menus.md), [Notifications](price-alerts-and-notifications.md), [System error logs and payment activity](system-error-logs-and-payment-activity.md).
# Support conversations

Payment and subscription feedback supports an asynchronous, text-only thread through `GET` and `POST /feedback/items/{feedback}/messages`. Access is limited to the ticket owner and active superadmins. Reading marks messages from the other party as read; sending is disabled for completed and declined tickets. Other categories continue to use the single admin-response field, and historical responses remain visible as legacy team responses. Open conversations poll every ten seconds only while the browser tab is visible.
