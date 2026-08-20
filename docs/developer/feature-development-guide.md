# Feature Development Guide

Use this sequence for a new Laravel/Inertia/React feature.

## 1. Define behavior

Write the user goal, authorized roles, inputs, outputs, ownership, failure states, and acceptance cases. Decide whether the feature belongs to an existing guide or needs a new feature guide.

## 2. Add persistence

Create a migration; add indexes for ownership and common filters. Add/update the Eloquent model with explicit fillable/casts/relationships. Never trust a browser-supplied owner ID.

```bash
php artisan make:migration create_example_table
php artisan make:model Example
```

## 3. Add backend behavior

Create a controller; extract reusable business rules into a service. Validate with Laravel, authorize the authenticated user/role, use transactions/locks for money or concurrent state, and return a stable Inertia or JSON shape.

```bash
php artisan make:controller ExampleController
```

## 4. Register the interface

Add the route to the correct public/auth/admin group. Apply `account.active`, role checks, ownership checks, replay entitlement, and named throttles as needed. Name routes when used by navigation or redirects.

## 5. Build React UI

Create a route-level page under `Pages` and focused reusable components under `Components/<Feature>`. Keep API/loading/error state near its owner, use shared contexts/layouts, cancel external effects, and make browser keys user-scoped.

For a destructive/irreversible-action confirmation, use `Hooks/useConfirm.jsx`'s `useConfirm()` — not `window.confirm()`. It's a drop-in async replacement (`const ok = await confirm(message, { title, confirmLabel }); if (!ok) return;`) that renders this app's own dark-terminal-themed modal (portaled to `document.body`, matching the delete-watchlist modal in `WatchlistContext.jsx`) instead of the browser's native "site says" dialog. Call the hook once per component (`const { confirm, confirmElement } = useConfirm();`) and render `{confirmElement}` anywhere in that component's JSX — it's a portal, so placement doesn't affect layout.

## 6. Handle edge cases

Cover empty/loading/error states, duplicate submission, concurrent tabs, inactive accounts, upstream timeouts, mobile layout, themes, and cleanup. External callbacks/webhooks must be verified and idempotent.

## 7. Test

Add unit tests for domain logic and feature tests for route/middleware/validation/ownership. Run:

```bash
php artisan test
npm run build
php artisan route:list
```

## 8. Document

Update the feature guide with purpose, routes, files, flow, data, code excerpt, security, maintenance, tests, and related links. Add new important paths to [file reference](file-reference.md). Update `.env.example` and deployment guidance for new configuration.
