# Deployment and Production

## Required services and configuration

Use managed MySQL, shared Redis for cache/session/rate limits/queues, private S3-compatible storage for sensitive/shared files, supervised queue workers, HTTPS, and scheduled Laravel commands.

Production secrets belong in the deployment environment. Important groups are `APP_*`, `DB_*`, `REDIS_*`, `MAIL_*`, `AWS_*`, `GOOGLE_*`, `FACEBOOK_*`, `LEGAL_*`, and `PAYMONGO_*`.

Recommended deployment commands:

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

Run the scheduler every minute and supervise queue workers. Test database restores, not only backups.

## Security and operations

- Set `APP_ENV=production`, `APP_DEBUG=false`, HTTPS cookies, trusted proxies, and shared rate-limit storage.
- Keep TLS verification enabled for exchange/PayMongo HTTP calls.
- Restrict snapshot, historical proof, attachment, backup, and log access.
- Monitor HTTP errors, slow queries, failed jobs, exchange latency, WebSocket/fallback health, disk, MySQL, and Redis.
- Confirm all user-owned market/backtest/subscription/feedback routes enforce ownership.
- Review the legacy API generator before any external exposure.

## PayMongo rollout

Keep `PAYMONGO_ENABLED=false` until merchant, legal, tax, invoice, refund, consumer-protection, and provider requirements are ready.

Sandbox/staging requires test mode and `sk_test_`. Production live checkout additionally requires live mode, an `sk_live_` key, and `PAYMONGO_LIVE_ENABLED=true`. Register one webhook at `/webhooks/paymongo`, preserve the raw body/header, and keep its signing secret only in deployment secrets.

Validate available merchant payment methods; configuring `card,gcash` does not guarantee both are enabled.

## Launch checklist

- Run [Testing guide](testing-guide.md).
- Confirm legal URLs and operator values.
- Verify OAuth callbacks on the production domain.
- Verify rate limits behind the real proxy/CDN.
- Load-test candle, replay, order, report, and checkout endpoints.
- Verify WebSocket hosts in CSP/network rules and REST fallback behavior.
- Test PayMongo success/failure/abandonment/delayed/duplicate/missed webhook.
- Confirm subscription plan prices and durations.
- Verify private/shared storage and backup restore.
- Confirm offline price alerts have a worker if advertised.

Related: [Subscriptions](subscriptions-trials-and-paymongo.md), [Streaming](live-market-streaming.md).
