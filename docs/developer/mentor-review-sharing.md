# Shareable Mentor Review Links

## Purpose

A trader can generate a revocable, read-only **public** link (no login required) exposing a
chosen scope of their own closed trades — plus journal, snapshots, and analytics, each
independently toggleable — for an external mentor to review. This is the first signed/token-URL
pattern in this codebase; treat everything below as load-bearing, not stylistic.

| Route/file | Responsibility |
|---|---|
| `GET/POST /market-backtest/share-links` | List/create the authenticated trader's own share links |
| `DELETE /market-backtest/share-links/{shareLink}` | Revoke (soft) an owned share link |
| `GET /mentor-review/{token}` | Public, unauthenticated review page for a single link |
| `MarketBacktestShareLinkController.php` | Authenticated management: validation, ownership, token issuance |
| `MentorReviewController.php` | Public: token lookup, scope resolution, redaction, view counting |
| `MarketBacktestShareLink.php` | The share-link record (token stored hashed only) |
| `ShareLinkManager.jsx` | Create/list/revoke UI, mounted on `MentorReviewManagePage.jsx` |
| `Public/MentorReview.jsx` | The public page a mentor actually sees |

## Token generation and storage

`Str::random(48)` generates the plaintext token at creation time. Only its SHA-256 hash
(`hash('sha256', $plainToken)`, stored in `token_hash`, unique, 64 chars) is ever persisted. The
plaintext token exists in memory for exactly one request and appears in exactly one HTTP
response: the JSON returned by `store()`, as part of the full share URL
(`url('/mentor-review/'.$plainToken)`). It is not retrievable again afterward — there is no
"reveal token" endpoint, and `MarketBacktestShareLink` also hides `token_hash` from array/JSON
serialization (`$hidden`) as a second layer, independent of the controller's column selection.

Public lookup re-hashes the incoming URL token and matches on `token_hash`. This means a leaked
or logged `token_hash` value on its own is useless to reconstruct the plaintext — hashing is
one-way — the same reasoning as password storage, applied here to a bearer capability token
instead of a credential.

## One-time-reveal UX

`ShareLinkManager.jsx` shows the URL exactly once, immediately after `store()` succeeds, in a
dismissible banner with a copy-to-clipboard button and the explicit line: *"Save this link now —
it cannot be shown again. You can revoke it below at any time."* This mirrors how API keys /
webhook secrets are conventionally handled elsewhere (generate once, show once, store hashed) —
if the trader loses the link, the fix is to revoke it and create a new one, not to have the
server retain a way to show it again.

## Scope types and ownership checks

`store()` validates exactly one of three mutually exclusive scopes (`scope_type`):

- **`session`** — `session_id` must belong to a `MarketBacktestSession` owned by the requesting
  user (`adm_user_id`) on their own `market_backtest_account_id`. `MarketBacktestSession` stores
  `adm_user_id` directly on the row (confirmed by reading the model/migration before writing this
  feature) — no join through the account is required for the ownership check itself, though the
  account id is also checked to keep the query unambiguous.
- **`date_range`** — `range_start_time`/`range_end_time` (unix seconds) with
  `range_end_time > range_start_time`. These are compared against `closed_at_time`, matching the
  timestamp column trade reports already sort/filter on elsewhere in this app.
- **`trade_ids`** — an explicit array of position ids. The controller does a where-in +
  count-match check against the caller's own account, requiring `status = 'closed'` — if any
  submitted id doesn't belong to the caller or isn't closed, the whole request is rejected
  (nothing is silently dropped).

## Redaction rules

Every trade is built via the same `MarketBacktestReportService::serializeReportPosition()` used
by the authenticated trade report, then redacted in `MentorReviewController` based on the three
independent toggles stored on the share link:

- `include_journal = false` clears `entryReason`, `exitReason`, `mistake`, `emotion`,
  `journalNotes`, `tags`, `setupTag`.
- `include_snapshots = false` clears `entrySnapshotUrl`, `exitSnapshotUrl`.
- `include_analytics = false` omits the `analytics` prop entirely (`null`) rather than sending
  zeroed-out figures.

Redaction happens server-side, before the Inertia props are built. `Public/MentorReview.jsx`
never re-derives what it's allowed to show — it only renders what it was given, and a missing
field just renders as "Not shared".

Regardless of scope configuration, `MentorReviewController::resolveScopedPositions()` applies a
hard floor first — `market_backtest_account_id = $shareLink->market_backtest_account_id` and
`status = 'closed'` — and only then layers the scope-specific filter on top. A bug in a future
scope type, or a share link somehow created with an out-of-range id, still cannot surface another
account's data or an open/pending position. The account's email, cash balance, and
account-level realized PnL are never read or exposed by this controller at all.

## 404 vs 410

- **Unknown token** (`token_hash` matches no row) → `404 Not Found`. Indistinguishable from any
  other made-up URL — nothing here confirms whether a share link with that token ever existed.
- **Revoked or expired** (found the row, but `revoked_at !== null` or `expires_at` has passed)
  → `410 Gone`, with the message *"This share link has expired or been revoked."*

The distinction matters for the mentor's experience: 410 confirms "this used to work, ask the
trader for a fresh link", where a blanket 404 would be ambiguous between "never existed" and
"got revoked". It costs nothing security-wise to make that distinction here, because reaching a
410 already required possessing (or guessing) a specific 48-character token — the existence of
*a* share link isn't secret to someone who already holds its token, only its live/dead status
plus its content are gated.

## Rate limiting

The public `GET /mentor-review/{token}` route is expected to be wired to a
`mentor-review-public` named rate limiter (registered in `RouteServiceProvider.php`), keyed by IP
rather than user id since the route has no authenticated user. This endpoint has no login wall
and a brute-forceable-looking path parameter, so it needs its own throttle distinct from
`backtest-read`/`backtest-write` (which key by user id and assume an authenticated caller). The
authenticated management routes (`/market-backtest/share-links*`) reuse the existing
`backtest-read`/`backtest-write` limiters, consistent with the rest of `/market-backtest/*`.

## The `startingBalance = 0` analytics decision

When `include_analytics` is true, `MentorReviewController` calls
`MarketBacktestAdvancedAnalyticsService::build($positions, 0.0)` and `->monteCarlo($positions,
0.0)` — a starting balance of exactly `0`, never the account's real `starting_balance` or
`cash_balance`. Both services only use the starting balance as an additive offset for the equity
curve / drawdown / Monte Carlo simulation; feeding `0` still produces a correct, meaningful
*relative* trajectory (cumulative PnL path, drawdown depth and percentage, streaks, profit
factor, Monte Carlo spread) without ever anchoring a single number in the response to the
trader's real account size.

**Framing rule: never call these figures "account balance" or "ending balance" anywhere in
`Public/MentorReview.jsx`.** They are relative/cumulative PnL figures that happen to start at
zero. The page labels this section "Cumulative PnL Path (relative)" and each Monte Carlo stat
"cumulative PnL" (e.g. "Median cumulative PnL"), not "ending balance" — copy this framing if the
page is extended, and reject any change that reintroduces balance-sounding labels here.

## Critical gotcha: `Public/` pages have no theme

`resources/js/app.jsx`'s Inertia `resolve()` gives every page component whose name starts with
`"Public/"` (or `"Auth/"`) **no layout wrapper at all** — no `<Layout>`, and critically, **no
`<ThemeProvider>`**. `ThemeContext` is created via plain `createContext()` with no default value,
so `useTheme()` called outside a provider returns `undefined`, and destructuring `{ theme }`
from that throws immediately, breaking the entire public page for the mentor.

`Public/MentorReview.jsx` therefore must **never** import or call `useTheme()` /
`ThemeContext` — verified for this file specifically by grepping it for `useTheme` as a final
check before shipping. It uses a fixed, self-contained light palette instead (a local
`IS_DARK = false` constant passed into the shared, theme-agnostic `StatCard` component), the same
approach `Public/PrivacyPolicy.jsx` and `Public/Home.jsx` already take. If this page is ever
extended with more shared components, check first whether that component calls `useTheme()`
internally — if it does, it cannot be reused here without passing theme data as props instead.

## Maintenance

- Keep the public `show()` action as the *only* place trade data crosses the auth boundary for
  this feature — do not add a second public endpoint (e.g. a JSON API) without applying the same
  hard-floor scoping and redaction rules.
- `Public/MentorReview.jsx` must stay a single server-rendered response — no `axios` calls of its
  own. This is a deliberate deviation from this app's usual self-fetching-component convention
  (see `ShareLinkManager.jsx`/`StrategyPlaybooks.jsx` for that normal pattern), justified because
  this page is read-only, non-interactive, and one-shot per view.
- `destroy()` is a soft revoke (`revoked_at = now()`), never a hard delete — this preserves
  `view_count`/audit history for the trader even after revoking.
- Any new scope type must keep the same hard-floor-first structure in
  `resolveScopedPositions()`.

## Verification

- `store()` returns a URL containing a plaintext token; the persisted `token_hash` never equals
  that plaintext and never appears in any JSON response, including a follow-up `index()` call.
- Public `show()` with a valid token returns only in-scope trades for each of the three scope
  types, excluding trades outside the declared scope and trades belonging to a different account
  entirely.
- Revoked link → 410. Expired link → 410. Unknown token → 404.
- `include_journal=false` strips journal fields; `include_snapshots=false` strips snapshot URLs.
- Another user calling `destroy()` on someone else's link → 404, and the link remains unrevoked.
- `view_count` increments and `last_viewed_at` updates on each successful public view, but not on
  404/410 responses.

Related: [Trade reports](trade-reports-and-journals.md), [Backtesting and orders](backtesting-and-orders.md).
