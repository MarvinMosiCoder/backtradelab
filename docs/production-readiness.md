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
LEGAL_EFFECTIVE_DATE="July 15, 2026"

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

PAYMONGO_ENABLED=false
PAYMONGO_MODE=live
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
PAYMONGO_PAYMENT_METHODS=card,gcash
PAYMONGO_LIVE_ENABLED=false
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
- S3-compatible private object storage for chart snapshots and preserved historical payment proofs/chat attachments.
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
- Confirm the deployment Content Security Policy and network perimeter permit browser WebSocket connections to the configured Binance, Bybit, OKX, BingX, and MEXC public endpoints.
- Monitor WebSocket connection failures and REST fallback volume. A prolonged exchange outage must degrade to `Polling` without creating an excessive `/api/klines?fresh=1` request rate.
- Verify database restore procedures, not only backup creation.
- Monitor HTTP errors, slow database queries, failed queue jobs, exchange latency, disk usage, and Redis availability.
- Keep `PAYMONGO_ENABLED=false` in production until live credentials are issued and business registration, tax, invoicing, refund, consumer-protection, and PayMongo requirements have been reviewed. Live checkout additionally requires `PAYMONGO_MODE=live`, an `sk_live_` key, and the deliberate `PAYMONGO_LIVE_ENABLED=true` gate.
- For local/staging sandbox checkout, use `PAYMONGO_MODE=test` with an `sk_test_` key. Test mode is rejected when `APP_ENV=production`; verified sandbox payments grant access only in non-production.
- Register exactly one PayMongo webhook at `https://your-domain.example/webhooks/paymongo` for `checkout_session.payment.paid`. Store its signing secret only in `PAYMONGO_WEBHOOK_SECRET`; rotate it if exposed.
- Confirm the public webhook receives the unmodified raw request body and `Paymongo-Signature` header. Invalid or older-than-five-minute signatures must fail, duplicates must not extend access twice, and transient processing errors must return an error so PayMongo retries.
- Run Laravel's scheduler every minute so `payments:reconcile-paymongo` can recover pending Checkout Sessions. Verify the admin transaction monitor's Recheck action uses the same reconciliation path.
- Check merchant capabilities before launch. Configuring `card,gcash` does not guarantee both methods are enabled on the PayMongo account; checkout must offer only the intersection and fail clearly when none are available.
- Test checkout retries, double-clicks, and simultaneous tabs. UUID submission tokens must return the original transaction and never create a second entitlement for the same checkout.
- Confirm successful browser redirects never grant access by themselves. Activation must require a retrieved or webhook-delivered paid session with matching amount, currency, mode, and transaction identity.
- Confirm archived manual payment proofs and chat attachments remain authenticated and authorized for the record owner or a superadmin, with no routes capable of creating messages, uploading proofs, or approving old records.
- Configure a non-null PHP price for every active subscription plan before launch; unpriced plans are intentionally unavailable to users.
- Confirm the active paid plan set is Weekly, Monthly, and Yearly. Configure the new Weekly price after running the July 15, 2026 pricing migration; the migration intentionally creates it without a price and retires Quarterly from the selectable plan list.
- Verify a new user's seven-day replay trial remains unstarted after registration, login, Market Summary, Workspace load, and `GET /replay-access`. Clicking a replay or backtesting action must open the subscription modal, and only the explicit `Activate free week` action may set the trial start and end timestamps.
- Verify trial activation is one-time and concurrency-safe: repeated clicks or simultaneous tabs must not extend or restart the seven-day period. Users with active paid access must not consume their unused free trial.
- Confirm each Checkout Session snapshots the server-controlled amount, currency, and plan duration. Later plan edits must not alter an existing transaction.
- Verified one-time payments extend from the later of the current paid expiry or payment activation time. Multiple legitimate purchases add their snapshotted durations; duplicate processing of one transaction adds nothing.
- Keep preserved payment proofs and payment-chat attachments on private object storage. The application uses authorized download routes, but the local disk remains the current storage backend in development.
- Run price-alert evaluation from a supervised scheduler/queue for notifications when users do not have a chart open. The chart performs immediate checks while it is open.
- Test successful, failed, abandoned, delayed-webhook, duplicate-webhook, and missed-webhook recovery with PayMongo's documented sandbox cards and simulated GCash flow before any live rollout.

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
- Verify dark and light themes on user subscription, plan selection, PayMongo handoff, transaction history, admin transaction monitoring, and pricing.
- Verify fullscreen symbol search has readable input and option text in both themes.
- Verify embedded and fullscreen symbol pickers retain the same active symbol. Confirm fullscreen results use green symbol labels and an explicit `Open` action in both themes.
- Verify the embedded chart command bar stays on one row at desktop widths and wraps without overlap on tablet and phone widths.
- Below `lg`, verify embedded and fullscreen chart headers show the active-symbol hamburger, open a scrollable themed controls dropdown, and return to the command bar at `lg`. Confirm the fullscreen dropdown has usable phone/tablet width.
- Verify embedded and fullscreen Add Indicators menus in dark and white themes show add-only name rows for Volume, SMA, EMA, RSI, and MACD plus the added-indicator count. Inactive rows must show `+ Add`, active rows must open `Settings`, and no visibility checkbox, period, color, line-width, or pane-size control should appear directly in the menu.
- Add Volume, SMA, EMA, RSI, and MACD and confirm only SMA/EMA have compact clickable targets in the main pane while RSI and MACD have targets in their own lower panes; Volume must not show a left-side target. Open RSI and MACD together and verify they stack as separate resizable panes, then hide/remove either one and confirm the remaining pane moves up correctly. Click Volume/MACD histogram bars, each line/target, and each active menu row, then verify only that indicator's contextual panel opens and stays within chart bounds. Confirm Show/Hide and Remove work for every indicator, and verify MACD fast/slow/signal periods, line/histogram colors, line width, pane size, and all existing indicator settings persist only for the authenticated user.
- With RSI and MACD panes open, create, select, resize, and drag each drawing-tool type plus Entry/SL/TP order lines near the bottom of the main price pane. Confirm all SVG graphics, labels, handles, replay-selection shading, trade markers, and pointer hit areas stop at the main-pane separator and never cover or capture clicks inside either indicator pane.
- In fullscreen, verify drawing Tool Settings and replay/tool flyouts remain above the chart header when their surfaces overlap.
- Verify fullscreen uses a flush `top: 0` branded navbar and a drawing-only sidebar flush below it at `left: 0`. Confirm the chart begins below/right of those bars, the floating fullscreen button is removed, and the far-right navbar action exits fullscreen.
- Verify the embedded chart uses the same `48px` top-navbar and left-rail geometry inside the Workspace card. Confirm it shows logo-only branding, keeps Replay/drawing categories/Enter Position/settings on the rail, and places Fullscreen at the navbar's far right without a floating chart button.
- Confirm the fullscreen navbar shows the configured logo/name, searchable active market, market category, timeframe, replay/live state, alerts, indicators, and appearance controls. At phone/tablet widths, verify the compact controls menu remains scrollable and never covers the exit action.
- Open each fullscreen drawing-sidebar category—Trend Lines, Fibonacci, Forecasting, Geometric Shape, and Annotation—and verify its tools open to the right, selection closes the flyout, Tool Settings remains available, and Clear Drawings retains its existing behavior.
- Verify the fullscreen navbar `Enter Position` wallet opens the complete existing order panel above the chart. Confirm chart-price `+` actions open and prefill it, the balance stays synchronized, and backdrop, close, Escape, and fullscreen exit clear only unsaved drafts.
- Sign into two different users in the same browser and confirm drawing-tool presets do not cross accounts. Browser fallback keys must use `market-tool-settings:{userId}`, and an account with no server settings must start empty.
- In the same shared-browser test, give the two users different Volume/SMA/EMA/RSI/MACD settings, candle colors, candle widths, display currencies, and PHP rates. Confirm the scoped keys use `market-chart-indicators:{userId}`, `market-chart-candle-colors:{userId}`, `market-chart-candle-size:{userId}`, `market-backtest-display-currency:{userId}`, and `market-backtest-php-rate:{userId}`, with no import from legacy unscoped keys.
- Confirm browser drawing mirrors use `replay-drawings:{userId}:{exchange}:{category}:{symbol}` and never become authoritative over the authenticated, database-backed drawing record.
- Verify enabling RSI creates a bottom pane, its separator is draggable, and disabling RSI removes the empty pane.
- Verify Rise and Drop alerts trigger only in the intended direction, create a notification, show an in-workspace notice, and remove their dashed chart line.
- Verify Workspace watchlist groups are isolated by authenticated user ID in browser storage, persist after reload, and reopen the selected symbol in the chart. Confirm Market Summary does not duplicate watchlist management.
- Verify watchlist create and rename validation, delete confirmation, last-group `Main` fallback, single-open accordion behavior, compact horizontal market chips, and that deleting a group never removes saved symbols.
- Verify hovering a chart price keeps both shortcuts stable: alarm on the left end and order `+` on the right. Clicking alarm must open the Set Alert modal with the hovered price.
- Verify the live candle-close countdown renders in a compact box directly below the current-price label on the right scale, follows the price vertically without covering the price label, stays within the chart bounds, updates once per second for every timeframe, uses readable dark/light theme colors, and is hidden in replay mode.
- Verify completed trades render an 18px borderless rounded badge with `B` or `S` centered inside and remain aligned during pan, zoom, fullscreen, and timeframe changes.
- Verify Google OAuth displays the account chooser on every attempt, logs matching provider identities or emails into the existing account, creates unknown emails with the configured non-superadmin trader privilege, and never self-registers a superadmin account.
- Verify `/privacy-policy` and `/terms-of-service` are public, responsive, linked from the homepage/login page, use the configured legal identity, and match the URLs registered on the Google OAuth consent screen.
- In a fresh browser profile, verify the essential-cookie notice appears on public and authenticated pages, its Privacy Policy link works, and “Got it” keeps it dismissed after navigation and reload.
- Inspect a normal page load and confirm fonts, Font Awesome, and SweetAlert assets are served by the application build rather than Google Fonts, jsDelivr, or cdnjs.
- Verify the trader navbar Assets wallet in dark and light themes. Confirm it shows simulated equity, cash, locked margin, open/realized PnL, starting balance, fees, position counts, session, and recent transactions; refresh and confirmation-protected reset must synchronize with the chart.
- Verify the chart rail says `Enter Position` rather than `Backtest Account`. Confirm the flyout shows one compact available-balance wallet card synchronized with the demo account and selected USDT/PHP display currency. Full equity/fees/history cards, account reset, and recent transactions must remain in Assets, while session, order entry, pending-entry cancellation, and open-position closing remain available in Enter Position.
- Send more than five invalid password attempts for one email/IP within a minute and confirm the login form displays the retry message. Also verify the broader IP, password-reset, social-redirect, and callback limits return `429`/retry headers as intended.
- Verify regular users land on `/market` after password and Google login while superadmins continue to land on `/dashboard`. For a user without `chart_tour_completed_at`, confirm Market Summary shows the onboarding steps, the final action opens Workspace, and Skip/completion prevents both Market Summary and chart fallback tours from returning.
- For a user with no trial timestamps, verify Workspace loads without automatically opening the subscription modal or starting the trial. Confirm Start Replay and Enter Position show the modal, the free-week card appears once, successful activation grants access for exactly seven days, and later modal visits show only Weekly, Monthly, and Yearly paid plans.
- Throttle `/replay-access` and confirm one Start Replay click immediately shows `Checking replay access…`. Rapid repeated clicks must share one request. Allowed access must show `Click a candle to start`; denied access must open Subscription; a timeout or server error must show a retry action.
- Verify automatic and immediate logout after a password change each submit only one `/logout` request and return to `/login` without a `419 Page Expired` response.
- From Profile, verify a password-enabled user cannot deactivate with a wrong password or without typing `DEACTIVATE`; verify a social-only user can confirm without a local password. After success, confirm the current session is invalidated, Sanctum tokens are revoked, active price alerts become inactive, and the user returns to Login. Confirm symbols, drawings, replay progress, paper sessions/orders/trades/journals, feedback, subscription records/files/messages, and access dates remain unchanged.
- Keep the same account open in a second browser before deactivation. Confirm its next API request returns `403` with `ACCOUNT_INACTIVE`, its next page request logs it out, and both password and social login reject the inactive account. Reactivate it through the administrator user-status action, confirm deactivation metadata is cleared and login works again, and confirm alerts remain disabled until explicitly recreated or re-enabled. Verify an administrator bulk action cannot deactivate the currently signed-in administrator.
- Verify the initial Workspace loader is a neutral-gray chart skeleton in dark and light themes, with no red or green candle/volume placeholders.
- For each supported exchange, confirm the active chart reaches `Live` and the current candle updates through its public WebSocket. Changing exchange, category, symbol, or timeframe must close the previous connection and open only the new active-chart stream.
- Open a WebSocket that never delivers a valid candle and confirm the UI does not falsely show `Live`: fallback polling must remain active, and the socket must reconnect after the ten-second first-candle timeout.
- After a valid streamed candle, stop candle messages without closing the socket and confirm the forty-five-second stale watchdog resumes fallback/reconnection.
- Disconnect WebSocket access and confirm the UI progresses through `Connecting`/`Reconnecting` while fresh fallback polling continues. Verify fallback requests include `fresh=1`, bypass the longer kline cache, update the candle every five seconds, and return to `Live` only after a valid streamed candle arrives.
- Enter replay and confirm the live socket and fallback polling stop. Return to live and confirm streaming restarts.
- In live mode, pan away from the latest candle and choose a custom zoom level, then wait through streamed updates and a new-candle boundary. Confirm the viewport does not reset or call `fitContent`. Verify symbol changes fit the newly selected market once, timeframe changes restore the captured center/span, replay Follow tracks replay intentionally, and Back to Live scrolls to real time only when selected.
- Mock WebSocket and polling candles that repeat the active timestamp or return an older timestamp. Confirm the existing candle is replaced or inserted chronologically, every timestamp remains unique, Volume renders without a `Value is null` error, and unmounting the chart produces no lingering socket/reconnect timer or `ResizeObserver`/`getBoundingClientRect` error.
- Production offline alerts require a scheduled exchange-price worker; open-workspace polling alone is not an offline notification service.
