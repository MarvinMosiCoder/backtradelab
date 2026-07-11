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
- S3-compatible object storage for chart snapshots.
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

## Current performance protections

- Live klines use short server cache durations based on timeframe.
- Historical anchored klines use a longer cache because completed candles are stable.
- Available-symbol responses are cached, with shorter caching after partial exchange failures.
- API and authenticated backtest routes have named rate limits.
- Drawing saves are serialized in the browser so an older request cannot overwrite a newer drawing state.
- Report lookup indexes cover account/status/close-time and account/session/status/close-time filters.
