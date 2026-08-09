# Dashboard and Layouts

## Purpose

Authenticated pages share a role-aware shell. Traders receive compact market navigation; superadmins receive administration navigation and dashboard statistics.

| File | Responsibility |
|---|---|
| `DashboardController.php` | Build dashboard Inertia props |
| `Pages/Dashboard/Dashboard.jsx` | Role-specific dashboard/workspace |
| `Context/WatchlistContext.jsx` | Watchlist state/CRUD/persistence, shared by the sidebar and fullscreen chart tree |
| `Components/Market/WatchlistPanel.jsx` | Watchlist UI, rendered from both `Dashboard.jsx` and `MarketChart.jsx` |
| `Layouts/layout/layout.jsx` | Main authenticated composition |
| `AppNavbar.jsx`, `AdminNavbar.jsx`, `TraderNavbar.jsx` | Header variants |
| `AppSidebar.jsx`, `TraderSidebar.jsx`, `AdminSidebar.jsx` | Navigation variants |
| `AppContent.jsx` | Main content sizing/scrolling |
| `app.jsx` | Public/auth page layout selection |

## Flow

1. An authenticated route returns an Inertia page.
2. `app.jsx` wraps it with contexts and `Layout`.
3. Layout reads the authenticated privilege/session state.
4. Admin or trader navigation is selected.
5. The page renders inside `AppContent`; navigation actions use Inertia or JSON endpoints.

`GET /dashboard` uses `auth` and `account.active`. `GET /market` is the normal trader workspace.

For superadmins, `/dashboard` includes user health, verified PHP subscription revenue and transaction status, customer-support workload, and the five latest subscription and feedback records. Thirty-day values use a rolling window; subscription revenue includes only verified `paid` PHP transactions and uses `paid_at`.

`GET /admin/workspace` is superadmin-only and reuses the complete trader workspace in an explicit workspace mode. Its **Workspace Chart** link is an `adm_menuses` record with a superadmin privilege mapping, so it is loaded into the main `MENU` sidebar exactly like Market and PNL rather than being hard-coded or placed in the legacy `ADMIN MENU` section. It keeps the administration overview at `/dashboard` while giving administrators access to watchlists, chart controls, Replay, drawings, alerts, and simulated orders.

### Watchlists

Named groups of saved-market symbol keys (`exchange:category:SYMBOL`). State/CRUD/persistence live in `Context/WatchlistContext.jsx` (`WatchlistProvider` + `useWatchlist()`), not in `Dashboard.jsx` — the UI itself is `Components/Market/WatchlistPanel.jsx`, a presentational component that pulls everything from `useWatchlist()`. This split exists specifically so the *same* panel can render in two places: `Dashboard.jsx`'s workspace sidebar (embedded), and — when the chart is fullscreen — as a dropdown from a "Watchlists" toggle button in `MarketChart/FullscreenChartHeader.jsx` (the header bar shown at the top of the chart in both fullscreen and embedded mode; the toggle only renders when `isFullscreen`, since embedded mode already shows the sidebar panel). This lives in the header rather than floating inside the chart canvas so it reads as a deliberate navigation control, the same pattern `TraderNavbar.jsx`'s "Assets" button already uses (toggle button + `absolute`-positioned dropdown anchored below it) — not a new pattern. `Dashboard.jsx` wraps the whole workspace branch in `<WatchlistProvider userId={...}>`, so both `WatchlistPanel` instances and `ChartHeader.jsx`'s add-to-watchlist picker (see [Trading chart](trading-chart.md)) share one source of truth — a symbol added from the chart's own search shows up in the sidebar panel too, and vice versa, with no manual sync code.

`FullscreenChartHeader.jsx` gets everything the docked panel needs (`symbol`/`exchange`/`marketCategory`/`onSymbolChange`) from the `chartHeaderProps` bundle it already receives for `ChartHeader` — no new props were added to `FullscreenChartHeader` itself. Selecting a chip there calls `chartHeaderProps.onSymbolChange`, the chart's own internal symbol-switch handler, so it changes the chart in place without exiting fullscreen — same as the add-to-watchlist picker's wiring.

**Why Context, not props**: the panel needs the full CRUD surface (create/rename/delete list, add/remove symbol, expand state, saved-symbols + metadata for logos/prices, modal state) in both call sites. Threading that through `MarketChart.jsx`'s already-large prop list and its `chartHeaderProps` bundle would make an already sprawling file worse. Follow this same pattern (Context, not deeper prop-threading) for anything else that needs to reach both the Dashboard shell and deep inside the chart tree.

Server persistence is unchanged from before: `GET/PUT /market-watchlists` (`MarketWatchlistController`, `market_watchlists` table — one JSON `data` row per user), mirroring `MarketToolSettingController`'s single-JSON-blob-per-user pattern. `localStorage` (`backtradelab-watchlists:{userId}`) is a fast-paint cache, not the source of truth — the server value wins once fetched (`exists: true`), and changes push back with a 500ms debounce once hydrated. A brand-new account has no server row yet, so whatever was in `localStorage` becomes the first server write — the entire migration path, no separate script.

**The create/rename/delete-watchlist modals render via `createPortal(..., document.body)`** inside `WatchlistProvider`, not inline in whichever panel triggered them. This is required, not stylistic: triggering one from the fullscreen-docked panel would otherwise render it as a DOM child of a subtree that's still visually *inside* the `z-[9999]` fullscreen container's stacking context in some cases, or simply be positioned confusingly. The portal always attaches to `document.body`, so the existing `z-[10020]`/`z-[10021]` values (already above fullscreen's `z-[9999]`) display correctly regardless of which panel instance opened them, and only one instance ever renders.

Each `WatchlistPanel` instance takes `isFullscreen`, `compact`, `className`, `activeSymbolKey`, and `onSelectSymbol` as props — the one thing that's genuinely call-site-specific is "what does selecting a chip actually do to the chart": `Dashboard.jsx` passes `setActiveSymbol` (triggers the existing `chartKey`-based remount), while `FullscreenChartHeader.jsx`'s dropdown instance passes `chartHeaderProps.onSymbolChange` (the chart's own internal symbol-switch handler — switches the symbol in place, no remount, fullscreen stays open). The panel's own root `className` prop is for positioning when the caller needs it (unused by `FullscreenChartHeader.jsx`, which instead wraps the panel in its own `absolute`-positioned dropdown container, same as `TraderNavbar.jsx`'s Assets flyout). The panel also has a whole-panel collapse toggle (separate from per-list expand/collapse) — collapsed by default when `isFullscreen` since screen space is precious there, expanded by default when embedded to preserve the original look.

Multiple watchlists can be expanded at once within a panel (`expandedWatchlists` is a toggled `Set`, not a single active entry). Symbols within an expanded list render as a vertical, scrollable row list (`max-h-56 overflow-y-auto`), not wrapped chips — matching the row layout `ChartHeader.jsx`'s own symbol search results use (logo left, symbol/exchange center, price/change right, action button trailing), so the two "list of markets" UIs in this app look consistent. Each row shows a coin logo, last price, and 24h % change, fetched via `POST /market-metadata/batch` and the `exchange:category:SYMBOL` (uppercase symbol, lowercase exchange/category) keying convention used by `Pages/Market/Market.jsx`'s `SavedMarket`/`FeaturedMarket` cards — reuse that exact key shape for any new watchlist-adjacent metadata lookup; the logo comes from `fundamentals.logo_url` (CoinMarketCap primary, CoinGecko fallback — see [Market data and symbols](market-data-and-symbols.md)) with a `CandlestickChart` icon fallback, matching Market.jsx's own convention. The "add a saved market" control is `react-select`, not `CustomSelect` (that component assumes an admin-form context — its own label, chevron — that doesn't fit this compact inline control); its options carry logo/price from a second, separate `/market-metadata/batch` call scoped to *all* saved symbols (`savedSymbolsMetadata`), not just symbols already in a watchlist (`watchlistMetadata`).

Reordering watchlists or symbols within one is not implemented — there is no drag/reorder precedent anywhere in this codebase, and adding it would mean changing `data` from an object keyed by name to an order-preserving array. If it's added later, keep the JSON-blob persistence approach; don't introduce a relational per-item table without a concrete reason this simple structure can't satisfy.

The admin header keeps two distinct controls below the large-screen breakpoint: the left button toggles the database-driven sidebar and the right button opens the compact core-module menu (now just Overview and Users — see below). The visible legacy operations are Privileges, Announcements, Notifications, Log User Access, and the "Payments" dropdown (children: Transactions, Pricing, Payment Activity). Menu Management, Module Generator, and API Generator remain implemented but are inactive in navigation. See [Roles, privileges, and menus](roles-privileges-menus.md) for how `adm_admin_menuses` drives this section, including the recent repointing of two previously dead-link entries ("System Error Logs", "Module Activity History") at their now-real pages.

`AdminNavbar.jsx`'s top nav and mobile module menu only keep "Overview" and "Users" — Customer Support, Payments, Pricing, Payment Activity, Error Logs, and Settings were removed from there once equivalent entries existed in the sidebar's "ADMIN MENU" section, so the same destination isn't offered from two different nav surfaces with different labels. The admin's profile link there also gained an avatar circle (uploaded photo, system avatar, or initials — same resolution as the other navbars, see [Users, profiles, and deactivation](users-profiles-and-deactivation.md)) instead of being text-only.

`AdminNavbar.jsx`'s notification bell used to be a plain `Link` straight to `/notifications/view-all-notifications`. It now opens an inline dropdown — polling `GET /notifications/feed` every 15s, marking a notification read via `POST /notifications/read` on click, with a "View all notifications" link at the bottom — copied from `TraderNavbar.jsx`'s existing implementation (which polls every 5s and also drives price-alert toasts/sound; the admin version deliberately skips that trading-specific behavior and only keeps the feed/read-marking core). Keep both in sync if the notification dropdown's shape changes.

## Legacy admin table components (`Components/Table/*`)

`ContentPanel`, `TopPanel`, `TableContainer`, `Thead`, `Tbody`, `Row`, `RowData`, `TableHeader`, `TableSearch`, `PerPage`, and `Pagination` are the shared primitives behind every legacy CRUD table — Users, Privileges, Announcements, Notifications (admin), Log User Access, Menu Management, Modules, and `TradeReportPage.jsx`. None of their props/behavior changed (sorting, search debounce, per-page selection, Laravel paginator link rendering, loading/empty states) — only internal class names, restyled to the same dark/light palette used everywhere else in this app (`border-[#2a2e39] bg-[#131722]` / `border-slate-200 bg-white`, `#2962ff` accent) instead of the older `border-secondary`/`bg-custom-gray`/`shadow-menus` tokens. `Thead.jsx` previously hardcoded `bg-white` with no theme check at all — a real dark-mode bug (a white sticky header over a dark table) — now fixed alongside the restyle. Since this is shared across ~15 pages, verify a page beyond Privileges/Users (e.g. Announcements or Log User Access) after any further change here. `Components/Table/Buttons/*` and `Filters.jsx`/`FilterFields.jsx` were intentionally left untouched — they take a page-supplied `extendClass` that already encodes page-specific color/padding, so restyling them safely needs auditing each call site first.

**`Pages/AdmVram/Logs.jsx` ("Log User Access") had an unrelated, pre-existing crash**, found while checking this page after the restyle above: `LogsController::getIndex()` eager-loads each `AdmLogs` row's `user` relation, but `adm_logs.id_adm_users` has no FK constraint enforcing referential integrity, and a real check found 133 of 204 rows already point at a since-deleted `adm_users` id — including several among the first page's default 10 most-recent rows. The page rendered `{item.user.name}` with no null check, so any orphaned row threw a JS `TypeError` and blanked the entire list. Fixed with `item.user?.name ?? 'Deleted user'` — audit log rows for a since-removed actor should still be visible, just labeled, not hidden. If another legacy table renders a `belongsTo` relation similarly, check for the same unguarded-null pattern before assuming a blank page is a styling regression.

## Maintenance

- Keep `Auth/*` and `Public/*` outside the authenticated layout.
- Test content overflow when adding fixed headers/sidebars or fullscreen chart UI.
- Add new navigation in both server authorization and the correct role layout.
- Do not derive admin access only from client-rendered role labels.
- Never hardcode a dark-only color (`border-[#2a2e39]`, `bg-[#131722]`, `text-emerald-400`/`text-red-400`, etc.) without a light-theme counterpart — this codebase's light theme uses `border-slate-200`/`bg-white`/`bg-slate-50` and the `-600` shade of status colors (`text-emerald-600`/`text-red-600`) where the dark theme uses `-400`. A hardcoded dark value with no `isDark ? … : …` branch renders as a heavy, out-of-place dark accent on the light theme (found and fixed in `Components/Sidebar/AdminSidebar.jsx`'s section divider and `TraderNavbar.jsx`'s profile-avatar ring) — grep for the file's existing `isDark`/`theme` ternary pattern and match it rather than pasting a class from a dark-theme-only reference.
- Avatar/initials badges (`ProfilePage.jsx`, `AppNavbar.jsx`, `TraderNavbar.jsx`, `Notification.jsx`) render on top of `Components/Notification/ColorMap.js`'s fixed pastel palette, which is independent of the page theme — their text must stay a fixed dark color (`text-slate-800`) rather than following `isDark`, and the `colorMap[...]` lookup must never fall back to a theme class name (a past bug: several letters mapped to `''`/`'bg-white'`, which combined with hardcoded white text produced invisible initials).

## Verification

- Trader and superadmin landing pages.
- Empty and populated subscription/support dashboard summaries and recent lists.
- Normal-user denial and superadmin access for `/admin/workspace`.
- Desktop/mobile sidebar and navbar behavior.
- Both mobile admin menu controls remain aligned, independently operable, and within the viewport.
- Dark/light themes.
- Logout performs one request.
- Market symbol/account widgets refresh after relevant chart actions.

Related: [Architecture](02-project-architecture.md), [Trading chart](trading-chart.md).
