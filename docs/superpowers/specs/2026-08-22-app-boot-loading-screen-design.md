# App boot loading screen

## Purpose

Cover the blank-white-screen gap between the browser receiving the initial HTML response and React/Inertia mounting the first page, with a full-screen, on-brand loading splash instead of nothing. This is separate from the existing NProgress top bar (`AppInitializer.jsx`, `nprogress-custom.css`), which only runs for *subsequent* Inertia navigations after the app has already booted once.

Trigger: user asked for "a beautiful loading screen aligned with my UI theme, besides the default line loading" — scoped down to initial app boot only (not per-navigation, not per-component data fetches).

## Scope

**In scope:**
- One full-viewport loading splash, shown from first paint until the first real page has mounted.
- Dark background + brand-blue (`#2962ff`) animated candlestick-bar mark, matching the app's existing dark chrome and accent color.
- Smooth fade-out into the real page once mounted.

**Explicitly out of scope:**
- The NProgress top bar — untouched, keeps its current behavior for page-to-page navigation.
- Per-component loading states (chart data fetch, tables, forms, `LoadingIcon` usages) — untouched.
- Showing the tenant's actual configured app name/logo (fetched async via `/appname` and `/applogo`) — the splash is icon-only and asset-free so it renders identically and instantly for every white-labeled tenant, with no dependency on those endpoints.

## Current state (for context)

`resources/views/app.blade.php` outputs an empty `<div id="app" data-page="...">` via the `@inertia` Blade directive; nothing renders until the browser has downloaded and executed the JS bundle.

`resources/js/app.jsx` then runs a chain before anything mounts: `getAppName()` (an `axios.get('/appname')` network round trip) → `createInertiaApp({ resolve, setup })` → `resolve` dynamically imports the target page component → `setup({ el, App, props })` calls `createRoot(el).render(...)`. Every step in that chain is currently invisible to the user (blank white body).

`nprogress-custom.css` is imported *through* `app.jsx` (`import '../css/nprogress-custom.css'`), so it isn't available until JS executes — fine for NProgress, since it's only ever needed after boot, but not a pattern the boot splash can reuse (its CSS must be present before JS runs at all).

## Design

### Markup and lifecycle

Add a static `#boot-splash` div directly in `resources/views/app.blade.php`, as a sibling of the `@inertia` output, before it in document order:

```html
<body>
    <div id="boot-splash" aria-hidden="true">
        <div class="boot-splash-candles">
            <span></span><span></span><span></span><span></span><span></span>
        </div>
    </div>
    @inertia
</body>
```

No Blade variables — pure static HTML so it needs zero server-side data and is identical on every response.

In `resources/js/app.jsx`, inside `setup({ el, App, props })`, immediately after `createRoot(el).render(...)`:

```js
const bootSplash = document.getElementById('boot-splash');
if (bootSplash) {
    bootSplash.classList.add('boot-splash-hide');
    const remove = () => bootSplash.remove();
    bootSplash.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, 400); // fallback if transitionend doesn't fire
}
```

The `setTimeout` fallback guards against the transition never firing (e.g. `prefers-reduced-motion` removing the transition, or the element being hidden via `display:none` some other way) so the node is always cleaned up.

This runs once per full page load (`setup()` is Inertia's one-time mount callback), so the splash never reappears on subsequent client-side navigations — those continue to show only the existing NProgress bar.

### Visual design

New file `resources/css/boot-splash.css` (same convention as `nprogress-custom.css`):

- `#boot-splash`: `position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; background: #1c1c1c;` (the existing `black-screen-color` token value), plus `transition: opacity 250ms ease` and `opacity: 1`.
- `.boot-splash-hide`: `opacity: 0; pointer-events: none;`
- `.boot-splash-candles`: flex row, 5 `span` children, brand-blue (`#2962ff`) bars with a soft `box-shadow` glow, staggered heights, each animating `transform: scaleY()` and `opacity` on a ~1.4s ease-in-out infinite loop with per-bar `animation-delay` (same look validated in the visual companion mockup: option A, "animated candlesticks").
- `@media (prefers-reduced-motion: reduce)`: the bar animation is disabled (`animation: none`), leaving a static staggered-height bar glyph instead of a pulsing one.

### Wiring the CSS to load before JS

`boot-splash.css` must be a **direct Vite entry in the Blade `@vite([...])` call**, not imported from `app.jsx`:

```blade
@vite(['resources/css/app.css', 'resources/css/boot-splash.css', 'resources/js/app.jsx'])
```

Laravel's Vite plugin emits a render-blocking `<link rel="stylesheet">` for each CSS entry passed directly to `@vite`, in `<head>`, before the page body parses — so the splash is correctly styled on first paint, with no flash of unstyled bars. This is the reason it can't follow the `nprogress-custom.css` pattern of being imported inside `app.jsx`: that CSS only becomes available once the JS bundle has executed, which is after the gap this splash needs to cover.

## Edge cases

- **JS fails to load entirely**: the splash stays on screen forever instead of a blank white screen. Not a regression — the app is equally broken either way, just visibly so instead of silently so.
- **React StrictMode double-invoke** (dev only): affects the render call inside `setup()`, not the splash-removal code path — `setup()` itself is called exactly once by Inertia, so there's no double-removal race.
- **Slow `getAppName()` fetch or slow page-component import**: both already gate `setup()` from running at all, so the splash simply stays visible for as long as those take — no extra wiring needed.

## Testing

Manual only (no automated test infrastructure covers boot-time rendering in this app):

- Hard-refresh (cache disabled) under a throttled network profile (e.g. Chrome DevTools "Slow 4G") on both a public page (`Public/Home`) and an authenticated dashboard page: splash appears immediately, animates smoothly, fades cleanly into the real page.
- Confirm the splash does **not** reappear on subsequent Inertia link navigation (only the existing NProgress top bar should show).
- Toggle OS/browser `prefers-reduced-motion` and confirm the bars render as a static (non-animating) glyph.
- Confirm no console errors if `#boot-splash` is somehow already absent when `setup()` runs (defensive `if (bootSplash)` check).
