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
