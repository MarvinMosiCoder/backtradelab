# Production Readiness

This file records the settings and operational work required before BacktradeLab is exposed to real users. Local development can continue with file cache/session storage and the synchronous queue.

## Required production environment

```env
APP_ENV=production
APP_DEBUG=false
LOG_LEVEL=warning
APP_URL=https://your-domain.example

LEGAL_OPERATOR_NAME="Your legal operator name"
LEGAL_CONTACT_EMAIL=privacy@your-domain.example
LEGAL_JURISDICTION="Republic of the Philippines"
LEGAL_EFFECTIVE_DATE="July 13, 2026"

CACHE_DRIVER=redis
SESSION_DRIVER=redis
SESSION_SECURE_COOKIE=true
QUEUE_CONNECTION=redis

FILESYSTEM_DISK=s3
MARKET_HTTP_VERIFY=true

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"

FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_REDIRECT_URI="${APP_URL}/auth/facebook/callback"
```

Use unique database, Redis, mail, OAuth, and object-storage credentials. Never copy local credentials or commit the production `.env` file.

## Secrets and configuration

- Keep credentials only in the deployment environment or an approved secret manager. `.env.example` contains names and empty placeholders only.
- Do not call `env()` from application classes. Add the variable to a Laravel configuration file and read it through `config()` so `php artisan optimize` works correctly.
- Never commit `.env`, certificate/private-key files, service-account JSON, database dumps, payment proofs, or production backups. The repository ignores common `.pem`, `.p12`, `.pfx`, `.key`, credential-directory, and service-account patterns.
- Rotate any credential immediately if it is printed in logs, screenshots, support conversations, build output, or Git history. Removing the latest copy does not invalidate an exposed credential.
- Exchange market-data URLs are public endpoints and may remain in configuration/code; authentication tokens, signing keys, client secrets, and private certificates must not.
- Runtime-generated admin API keys belong in the database rather than `.env`, but the current API-key generator stores them in plaintext and displays them in the admin interface. Before exposing that API externally, migrate to hashed-at-rest verification and show each new key only once.
- The database backup command reads the configured Laravel database connection and passes the password through the child-process environment instead of interpolating it into a shell command. Protect backup files with restricted permissions, encryption, retention limits, and off-host storage.

## Deployment services

- Managed MySQL with automated backups and point-in-time recovery where available.
- Redis for shared cache, sessions, rate limiting, and queued work.
- S3-compatible private object storage for chart snapshots, payment proofs, payment-chat attachments, and payment QR images.
- A queue worker supervised and restarted automatically.
- HTTPS at the load balancer or web server.
- A CDN for compiled assets and public snapshots.

## Deployment commands

Run these during a controlled deployment:

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

After changing environment or routes, rebuild Laravel's cached configuration with `php artisan optimize`.

## Application checks

- Confirm every backtest, drawing, replay, snapshot, and journal record is scoped to the authenticated user.
- Test concurrent order submission and multiple browser tabs.
- Confirm rate-limit responses display a useful retry message.
- Confirm password login is limited to 5 attempts per minute per email/IP combination and 30 attempts per minute per IP. Verify password-reset and social-login limits, and ensure the load balancer/CDN is configured as a trusted proxy so Laravel sees the real client IP.
- Confirm snapshots use shared object storage before running more than one app server.
- Load-test candle requests, replay progress, order placement, and reports.
- Verify database restore procedures, not only backup creation.
- Monitor HTTP errors, slow database queries, failed queue jobs, exchange latency, disk usage, and Redis availability.
- Configure the manual payment instructions shown to users, restrict access to uploaded payment proofs, and audit every subscription approval.
- Configure and verify the GCash account name, account number, payment rules, and QR image in `/admin/payment-settings` before enabling plans.
- Do not add a GCash account number to migrations, source files, `.env.example`, or frontend code. Payment recipient settings are database-managed and intentionally begin empty on a new installation.
- Before accepting real subscriptions through GCash, obtain any required written commercial-use authorization or approved GCash for Business arrangement. A personal wallet may be used for development/testing, but GCash's terms prohibit commercial use without prior written authorization. Confirm business registration, tax, invoicing, refund, and consumer-protection obligations with qualified advisers.
- Confirm payment proof, QR, and chat-attachment download routes require authentication and authorize the request owner or a superadmin.
- Test payment submission retries, double-clicks, and simultaneous browser tabs. Submission tokens must return the original request, and each user must have at most one pending request.
- Test approval and rejection while the user payment chat is open. The user should receive the decision within the five-second polling interval and approval confirmation should redirect to the workspace.
- Configure a non-null PHP price for every active subscription plan before launch; unpriced plans are intentionally unavailable to users.
- Confirm plan duration and price changes follow the intended policy for pending requests. Request amounts are captured at submission, while access duration is loaded from the plan at approval time.
- Approvals currently extend from the later of the current paid expiry or approval time. Confirm this renewal policy before launch.
- Store payment proofs, payment-chat attachments, and payment QR images on private object storage. The application uses authorized download routes, but the local disk remains the current storage backend in development.
- Run price-alert evaluation from a supervised scheduler/queue for notifications when users do not have a chart open. The chart performs immediate checks while it is open.
- When adding a payment gateway, verify signed webhooks and map successful provider payments onto the existing replay entitlement rather than trusting browser callbacks.

## Current performance protections

- Live klines use short server cache durations based on timeframe.
- Historical anchored klines use a longer cache because completed candles are stable.
- Available-symbol responses are cached, with shorter caching after partial exchange failures.
- API and authenticated backtest routes have named rate limits.
- Login, password-reset, and social-authentication entry points have separate named rate limits. These protections require a shared cache and correct real-client-IP handling in multi-server/proxied production.
- Drawing saves are serialized in the browser so an older request cannot overwrite a newer drawing state.
- Report lookup indexes cover account/status/close-time and account/session/status/close-time filters.

# July 2026 UI verification additions

- Verify the admin navbar's left hamburger toggles the existing sidebar without changing its navigation behavior.
- Below the `lg` breakpoint, verify desktop module links are hidden and the final navbar hamburger opens a dropdown rather than navigating directly. Confirm every dropdown module routes correctly and the menu closes after selection or backdrop click.
- Verify dark and light themes on user subscription, plan selection, payment submission, admin payment review, pricing, and payment settings.
- Verify fullscreen symbol search has readable input and option text in both themes.
- Verify embedded and fullscreen symbol pickers retain the same active symbol. Confirm fullscreen results use green symbol labels and an explicit `Open` action in both themes.
- Verify the embedded chart command bar stays on one row at desktop widths and wraps without overlap on tablet and phone widths.
- Below `lg`, verify embedded and fullscreen chart headers show the active-symbol hamburger, open a scrollable themed controls dropdown, and return to the command bar at `lg`. Confirm the fullscreen dropdown has usable phone/tablet width.
- Verify embedded and fullscreen Indicators menus in dark and white themes, including Volume size, SMA/EMA/RSI periods, RSI pane size, and the enabled-indicator count.
- In fullscreen, verify drawing Tool Settings and replay/tool flyouts remain above the chart header when their surfaces overlap.
- Sign into two different users in the same browser and confirm drawing-tool presets do not cross accounts. Browser fallback keys must use `market-tool-settings:{userId}`, and an account with no server settings must start empty.
- Verify enabling RSI creates a bottom pane, its separator is draggable, and disabling RSI removes the empty pane.
- Verify Rise and Drop alerts trigger only in the intended direction, create a notification, show an in-workspace notice, and remove their dashed chart line.
- Verify Workspace watchlist groups are isolated by authenticated user ID in browser storage, persist after reload, and reopen the selected symbol in the chart. Confirm Market Summary does not duplicate watchlist management.
- Verify watchlist create and rename validation, delete confirmation, last-group `Main` fallback, single-open accordion behavior, compact horizontal market chips, and that deleting a group never removes saved symbols.
- Verify hovering a chart price keeps both shortcuts stable: alarm on the left end and order `+` on the right. Clicking alarm must open the Set Alert modal with the hovered price.
- Verify completed trades render an 18px borderless rounded badge with `B` or `S` centered inside and remain aligned during pan, zoom, fullscreen, and timeframe changes.
- Verify Google OAuth displays the account chooser on every attempt, logs matching provider identities or emails into the existing account, creates unknown emails with the configured non-superadmin trader privilege, and never self-registers a superadmin account.
- Verify `/privacy-policy` and `/terms-of-service` are public, responsive, linked from the homepage/login page, use the configured legal identity, and match the URLs registered on the Google OAuth consent screen.
- Verify the trader navbar Assets wallet in dark and light themes. Confirm it shows simulated equity, cash, locked margin, open/realized PnL, starting balance, fees, position counts, session, and recent transactions; refresh and confirmation-protected reset must synchronize with the chart.
- Verify the chart rail says `Enter Position` rather than `Backtest Account`. Confirm account balance cards, account reset, and recent transactions are absent while session, order entry, pending-entry cancellation, and open-position closing remain available.
- Send more than five invalid password attempts for one email/IP within a minute and confirm the login form displays the retry message. Also verify the broader IP, password-reset, social-redirect, and callback limits return `429`/retry headers as intended.
- Verify regular users land on `/market` after password and Google login while superadmins continue to land on `/dashboard`. For a user without `chart_tour_completed_at`, confirm Market Summary shows the onboarding steps, the final action opens Workspace, and Skip/completion prevents both Market Summary and chart fallback tours from returning.
- Verify automatic and immediate logout after a password change each submit only one `/logout` request and return to `/login` without a `419 Page Expired` response.
- Verify the initial Workspace loader is a neutral-gray chart skeleton in dark and light themes, with no red or green candle/volume placeholders.
- Production offline alerts require a scheduled exchange-price worker; open-workspace polling alone is not an offline notification service.
