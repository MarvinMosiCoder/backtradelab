# Testing Guide

## Automated checks

```bash
php artisan test
npm run build
php artisan route:list
```

Current automated coverage includes PayMongo client/signature/route behavior and subscription entitlement service behavior under `tests/Unit` and `tests/Feature`. Add tests beside the changed domain; do not rely only on manual chart testing.

## Test layers

- Unit: service calculations, signature parsing, normalization, pure helpers.
- Feature: routes, middleware, validation, authorization, ownership, database transitions.
- Frontend/manual: chart lifecycle, responsive layout, pointer interactions, WebSockets, themes.
- Integration/sandbox: exchange APIs, OAuth providers, mail, storage, PayMongo.

## Required cross-cutting scenarios

- Anonymous, active user, inactive user, restricted admin, superadmin.
- Two users attempting to access each other's route-model-bound records.
- Duplicate clicks, concurrent tabs, delayed/out-of-order requests.
- Empty data, invalid input, timeout, upstream failure, throttling.
- Dark/light theme and desktop/mobile layout.
- Cleanup after navigation/unmount.

## Documentation validation

After documentation changes:

1. Check every Markdown link resolves.
2. Check every backticked repository path exists.
3. Compare excerpts to current source.
4. Compare documented endpoints with `php artisan route:list`.
5. Ensure every static route in `routes/web.php` and `routes/api.php` belongs to a guide or is identified as shared/legacy.

## Acceptance for a new feature

- Happy path works.
- Validation and authorization fail safely.
- Ownership is tested.
- Migrations roll forward cleanly.
- Build/tests pass.
- Relevant feature guide and [file reference](file-reference.md) are updated.
# Trading and alert regression checks

- Confirm ready-tool selections persist across login/device reload and every new drawing can be selected, resized, moved, duplicated, saved, and restored.
- Confirm preset name collisions require overwrite approval and range labels calculate correctly.
- Switch markets while a live update arrives and confirm the skeleton remains until the full history response.
- Leave RSI/MACD open through live updates and fullscreen transitions and confirm pane heights remain stable.
- Run `php artisan market-alerts:monitor --once --force` with test alerts and mocked exchange responses; verify trigger idempotency, cancellation, notification ownership, and failed-market backoff.
- With a live chart open, cross rise and drop targets and verify the authenticated check creates one notification, removes the alert line, and shows one six-second toast even after the navbar poll runs.
- Change only the timeframe and confirm the current chart stays visible; then change the symbol and confirm the full loading skeleton still appears.
- Return from Replay to Live and confirm the last Replay price guide remains visible immediately without changing timeframe, live candles resume, and saved horizontal-line drawings remain intact.
- Confirm Back to Live scrolls after the full live series is rendered, so the latest-price line and displayed candles align without changing timeframe.
- Select a Replay candle above or below the pointer center and confirm the guide uses the candle close; verify ready-tool boxes align with Replay and each chevron sits directly beside its tool with zero gap and gray hover feedback.
- Test known/unknown Google and Facebook identities, consent/cancel/expiry, two-step email errors, active subscription read-only behavior, and custom demo reset amounts.
- Confirm the login Continue action rejects invalid and unknown email addresses, handles lookup throttling, and advances known users to the password-only step.
- Open Market Summary with empty and populated watchlists; verify featured BTC/ETH/SOL highlights always render, saved and featured markets use one deduplicated metadata request, and provider failures do not hide the rest of the page.
- Verify only the latest four active announcements appear as sanitized excerpts, expanding an unread update marks it read once, the rotating tip and quick actions work, and the empty-watchlist Workspace CTA is visible.
- Check the compact Market Summary overview at desktop/mobile widths in dark and light themes, including skeleton and partial-error states.
