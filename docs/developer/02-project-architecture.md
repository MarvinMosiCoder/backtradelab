# Project Architecture

## Stack and request lifecycle

BacktradeLab uses Laravel 10 for routing, authentication, validation, database access, and external services. Inertia returns React page names and props without a separate SPA API for page navigation.

```text
Browser -> Laravel route -> middleware -> controller/closure
        -> Inertia::render(Page, props)
        -> resources/js/app.jsx resolves Pages/Page.jsx
        -> React page uses shared layout and calls JSON endpoints as needed
```

`resources/js/app.jsx` applies the authenticated layout to all pages except `Auth/*` and `Public/*`:

```jsx
page.default.layout =
    name.startsWith("Auth/") || name.startsWith("Public/")
        ? undefined
        : pageComponent => <ThemeProvider><Layout>{pageComponent}</Layout></ThemeProvider>;
```

The real implementation also reads auth/session theme data and nests `AuthProvider`, `SidebarProvider`, `AppInitializer`, and `CookieNotice`.

## Main directories

| Path | Responsibility |
|---|---|
| `routes/` | Public, authenticated, API, console, and dynamically generated routes |
| `app/Http/Controllers/` | Request validation and orchestration |
| `app/Services/` | Reusable account and payment domain logic |
| `app/Models/` | Eloquent records and relationships |
| `database/migrations/` | Schema history |
| `resources/js/Pages/` | Inertia route-level React pages |
| `resources/js/Components/` | Reusable and feature components |
| `resources/js/Layouts/` | Authenticated admin/trader shells |
| `resources/js/Context/` | Auth, theme, navbar, sidebar, and toast state |
| `config/` | Environment-backed application configuration |
| `tests/` | PHPUnit unit and feature tests |

## Middleware and ownership

Most application routes use `auth` and `account.active`. Replay mutations add `replay.access`; expensive and write operations use named throttles. Admin legacy routes add `check.user`. Controllers must still scope queries to `auth()->id()`—route authentication alone does not provide record ownership.

## Frontend data patterns

- Inertia `router` is used for page/form visits.
- Axios/fetch is used for JSON state such as candles, drawings, reports, and subscriptions.
- Shared authenticated identity comes from `AuthContext`.
- Theme and sidebar behavior come from their contexts.
- `AppInitializer.jsx` binds Inertia navigation events to NProgress.

## Dynamic legacy routes

The bottom of `routes/web.php` reads `adm_modules` and registers controller routes with `CommonHelpers`. These endpoints cannot be fully determined from source alone because database rows affect the route table. Always inspect `php artisan route:list` and the seeded/module data before changing legacy admin pages.

Related: [Dashboard and layouts](dashboard-and-layouts.md), [Roles, privileges, and menus](roles-privileges-menus.md), and [File reference](file-reference.md).
