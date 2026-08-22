# Project Architecture

## Stack and request lifecycle

BacktradeLab uses Laravel 10 for routing, authentication, validation, database access, and external services. Inertia returns React page names and props without a separate SPA API for page navigation.

```text
Browser -> Laravel route -> middleware -> controller/closure
        -> Inertia::render(Page, props)
        -> resources/js/app.jsx resolves Pages/Page.jsx
        -> React page uses shared layout and calls JSON endpoints as needed
```

`resources/js/app.jsx` applies the authenticated layout to all pages except `Auth/*` and `Public/*`. `page.default.layout` must always be a function — never `undefined` for the bare pages — because Inertia's persistent app wrapper calls `Component.layout(page)` inline as part of its own render on every navigation; if `layout` were `undefined` for some pages and a hook-calling function for others, that shared wrapper would call a different number of hooks depending on which page is current and trip React's rules-of-hooks (this was a real bug — a hooks-order console warning firing on every Auth→app navigation — fixed by always providing the function and branching after the hook call instead of before it):

```jsx
const isBareLayout = name.startsWith("Auth/") || name.startsWith("Public/");
page.default.layout = pageComponent => {
    const { auth } = useAuth();
    if (isBareLayout) return pageComponent;
    return <ThemeProvider><Layout>{pageComponent}</Layout></ThemeProvider>;
};
```

The real implementation also reads auth/session theme data and nests `AuthProvider`, `SidebarProvider`, `AppInitializer`, and `CookieNotice`.

### Boot splash

`app.blade.php` renders a static `#boot-splash` div (dark background, animated brand-blue bars) as a sibling of the `@inertia` mount point, before any JS runs — it covers the gap between the initial HTML response and this first `createRoot(el).render()` call, which includes a real network round trip (`getAppName()`) and a dynamic page-component import. Its styling lives in `resources/css/boot-splash.css`, included as its **own entry** in both the Blade `@vite([...])` call and `vite.config.js`'s `laravel({ input: [...] })` array — Laravel's Vite plugin only emits a render-blocking `<link>` for paths present in both places, so an entry missing from `vite.config.js` silently never reaches the manifest even if `@vite()` references it. (This is unlike `nprogress-custom.css`, which is imported *through* `app.jsx` and only needs to be ready after JS has already executed.) `setup()` removes the splash (fade + `remove()`) immediately after the first render call; since `setup()` runs once per full page load, it never reappears on later Inertia navigations — see [Dashboard and layouts](dashboard-and-layouts.md) for the separate, per-navigation `ContentLoader` that covers those.

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
