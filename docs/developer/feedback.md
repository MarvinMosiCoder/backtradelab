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
| `UserFeedback.php` | User/responder relationships |
| `Pages/Feedback/Index.jsx`, `AdminIndex.jsx` | User/admin UI |

## Flow

1. User submits category, subject/message and optional page URL.
2. Controller assigns the authenticated user and initial workflow values.
3. User history queries only that user's rows.
4. Admin index filters all rows and returns responder/user context.
5. Admin update stores status, priority, response, responder, and response time as implemented.

## Maintenance

- Do not accept `adm_user_id` or responder identity from normal users.
- Validate enum-like status/priority/category values and text lengths.
- Treat page URLs and user text as untrusted output.
- Add notifications deliberately if the response workflow later requires them.
- The admin overview summarizes lifetime, rolling-30-day, open, high-priority, and awaiting-response counts and limits its recent list to five requests.

## Verification

- Create validation and throttling.
- User sees only own history.
- Non-admin cannot reach admin data/actions.
- Search/filter/update and response persistence.

Related: [Roles](roles-privileges-menus.md), [Notifications](price-alerts-and-notifications.md).
# Support conversations

Payment and subscription feedback supports an asynchronous, text-only thread through `GET` and `POST /feedback/items/{feedback}/messages`. Access is limited to the ticket owner and active superadmins. Reading marks messages from the other party as read; sending is disabled for completed and declined tickets. Other categories continue to use the single admin-response field, and historical responses remain visible as legacy team responses. Open conversations poll every ten seconds only while the browser tab is visible.
