# Production Readiness

This file records the settings and operational work required before BacktradeLab is exposed to real users. Local development can continue with file cache/session storage and the synchronous queue.

## Required production environment

```env
APP_ENV=production
APP_DEBUG=false
LOG_LEVEL=warning
APP_URL=https://your-domain.example

CACHE_DRIVER=redis
SESSION_DRIVER=redis
SESSION_SECURE_COOKIE=true
QUEUE_CONNECTION=redis

FILESYSTEM_DISK=s3
MARKET_HTTP_VERIFY=true
```

Use unique database, Redis, mail, OAuth, and object-storage credentials. Never copy local credentials or commit the production `.env` file.

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
- Confirm snapshots use shared object storage before running more than one app server.
- Load-test candle requests, replay progress, order placement, and reports.
- Verify database restore procedures, not only backup creation.
- Monitor HTTP errors, slow database queries, failed queue jobs, exchange latency, disk usage, and Redis availability.
- Configure the manual payment instructions shown to users, restrict access to uploaded payment proofs, and audit every subscription approval.
- Configure and verify the GCash account name, account number, payment rules, and QR image in `/admin/payment-settings` before enabling plans.
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
- Drawing saves are serialized in the browser so an older request cannot overwrite a newer drawing state.
- Report lookup indexes cover account/status/close-time and account/session/status/close-time filters.
# July 2026 UI verification additions

- Verify the admin navbar's left hamburger toggles the existing sidebar without changing its navigation behavior.
- Below the `lg` breakpoint, verify desktop module links are hidden and the final navbar hamburger opens a dropdown rather than navigating directly. Confirm every dropdown module routes correctly and the menu closes after selection or backdrop click.
- Verify dark and light themes on user subscription, plan selection, payment submission, admin payment review, pricing, and payment settings.
- Verify fullscreen symbol search has readable input and option text in both themes.
- Verify enabling RSI creates a bottom pane, its separator is draggable, and disabling RSI removes the empty pane.
- Verify Rise and Drop alerts trigger only in the intended direction, create a notification, show an in-workspace notice, and remove their dashed chart line.
- Verify Workspace watchlist groups are isolated by authenticated user ID in browser storage, persist after reload, and reopen the selected symbol in the chart. Confirm Market Summary does not duplicate watchlist management.
- Verify hovering a chart price keeps both shortcuts stable: alarm on the left end and order `+` on the right. Clicking alarm must open the Set Alert modal with the hovered price.
- Verify completed trades render an 18px borderless rounded badge with `B` or `S` centered inside and remain aligned during pan, zoom, fullscreen, and timeframe changes.
- Production offline alerts require a scheduled exchange-price worker; open-workspace polling alone is not an offline notification service.
