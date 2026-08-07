# Dashboard and Layouts

## Purpose

Authenticated pages share a role-aware shell. Traders receive compact market navigation; superadmins receive administration navigation and dashboard statistics.

| File | Responsibility |
|---|---|
| `DashboardController.php` | Build dashboard Inertia props |
| `Pages/Dashboard/Dashboard.jsx` | Role-specific dashboard/workspace |
| `Context/WatchlistContext.jsx` | Watchlist state/CRUD/persistence, shared by the sidebar and fullscreen chart tree |
| `Components/Market/WatchlistPanel.jsx` | Watchlist UI, rendered from both `Dashboard.jsx` and `TradingViewChart.jsx` |
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

Named groups of saved-market symbol keys (`exchange:category:SYMBOL`). State/CRUD/persistence live in `Context/WatchlistContext.jsx` (`WatchlistProvider` + `useWatchlist()`), not in `Dashboard.jsx` — the UI itself is `Components/Market/WatchlistPanel.jsx`, a presentational component that pulls everything from `useWatchlist()`. This split exists specifically so the *same* panel can render in two places: `Dashboard.jsx`'s workspace sidebar (embedded), and — when the chart is fullscreen — as a dropdown from a "Watchlists" toggle button in `TradingViewChart/FullscreenChartHeader.jsx` (the header bar shown at the top of the chart in both fullscreen and embedded mode; the toggle only renders when `isFullscreen`, since embedded mode already shows the sidebar panel). This lives in the header rather than floating inside the chart canvas so it reads as a deliberate navigation control, the same pattern `TraderNavbar.jsx`'s "Assets" button already uses (toggle button + `absolute`-positioned dropdown anchored below it) — not a new pattern. `Dashboard.jsx` wraps the whole workspace branch in `<WatchlistProvider userId={...}>`, so both `WatchlistPanel` instances and `ChartHeader.jsx`'s add-to-watchlist picker (see [Trading chart](trading-chart.md)) share one source of truth — a symbol added from the chart's own search shows up in the sidebar panel too, and vice versa, with no manual sync code.

`FullscreenChartHeader.jsx` gets everything the docked panel needs (`symbol`/`exchange`/`marketCategory`/`onSymbolChange`) from the `chartHeaderProps` bundle it already receives for `ChartHeader` — no new props were added to `FullscreenChartHeader` itself. Selecting a chip there calls `chartHeaderProps.onSymbolChange`, the chart's own internal symbol-switch handler, so it changes the chart in place without exiting fullscreen — same as the add-to-watchlist picker's wiring.

**Why Context, not props**: the panel needs the full CRUD surface (create/rename/delete list, add/remove symbol, expand state, saved-symbols + metadata for logos/prices, modal state) in both call sites. Threading that through `TradingViewChart.jsx`'s already-large prop list and its `chartHeaderProps` bundle would make an already sprawling file worse. Follow this same pattern (Context, not deeper prop-threading) for anything else that needs to reach both the Dashboard shell and deep inside the chart tree.

Server persistence is unchanged from before: `GET/PUT /market-watchlists` (`MarketWatchlistController`, `market_watchlists` table — one JSON `data` row per user), mirroring `MarketToolSettingController`'s single-JSON-blob-per-user pattern. `localStorage` (`backtradelab-watchlists:{userId}`) is a fast-paint cache, not the source of truth — the server value wins once fetched (`exists: true`), and changes push back with a 500ms debounce once hydrated. A brand-new account has no server row yet, so whatever was in `localStorage` becomes the first server write — the entire migration path, no separate script.

**The create/rename/delete-watchlist modals render via `createPortal(..., document.body)`** inside `WatchlistProvider`, not inline in whichever panel triggered them. This is required, not stylistic: triggering one from the fullscreen-docked panel would otherwise render it as a DOM child of a subtree that's still visually *inside* the `z-[9999]` fullscreen container's stacking context in some cases, or simply be positioned confusingly. The portal always attaches to `document.body`, so the existing `z-[10020]`/`z-[10021]` values (already above fullscreen's `z-[9999]`) display correctly regardless of which panel instance opened them, and only one instance ever renders.

Each `WatchlistPanel` instance takes `isFullscreen`, `compact`, `className`, `activeSymbolKey`, and `onSelectSymbol` as props — the one thing that's genuinely call-site-specific is "what does selecting a chip actually do to the chart": `Dashboard.jsx` passes `setActiveSymbol` (triggers the existing `chartKey`-based remount), while `FullscreenChartHeader.jsx`'s dropdown instance passes `chartHeaderProps.onSymbolChange` (the chart's own internal symbol-switch handler — switches the symbol in place, no remount, fullscreen stays open). The panel's own root `className` prop is for positioning when the caller needs it (unused by `FullscreenChartHeader.jsx`, which instead wraps the panel in its own `absolute`-positioned dropdown container, same as `TraderNavbar.jsx`'s Assets flyout). The panel also has a whole-panel collapse toggle (separate from per-list expand/collapse) — collapsed by default when `isFullscreen` since screen space is precious there, expanded by default when embedded to preserve the original look.

Multiple watchlists can be expanded at once within a panel (`expandedWatchlists` is a toggled `Set`, not a single active entry). Symbols within an expanded list render as a vertical, scrollable row list (`max-h-56 overflow-y-auto`), not wrapped chips — matching the row layout `ChartHeader.jsx`'s own symbol search results use (logo left, symbol/exchange center, price/change right, action button trailing), so the two "list of markets" UIs in this app look consistent. Each row shows a coin logo, last price, and 24h % change, fetched via `POST /market-metadata/batch` and the `exchange:category:SYMBOL` (uppercase symbol, lowercase exchange/category) keying convention used by `Pages/Market/Market.jsx`'s `SavedMarket`/`FeaturedMarket` cards — reuse that exact key shape for any new watchlist-adjacent metadata lookup; the logo comes from `fundamentals.logo_url` (CoinMarketCap primary, CoinGecko fallback — see [Market data and symbols](market-data-and-symbols.md)) with a `CandlestickChart` icon fallback, matching Market.jsx's own convention. The "add a saved market" control is `react-select`, not `CustomSelect` (that component assumes an admin-form context — its own label, chevron — that doesn't fit this compact inline control); its options carry logo/price from a second, separate `/market-metadata/batch` call scoped to *all* saved symbols (`savedSymbolsMetadata`), not just symbols already in a watchlist (`watchlistMetadata`).

Reordering watchlists or symbols within one is not implemented — there is no drag/reorder precedent anywhere in this codebase, and adding it would mean changing `data` from an object keyed by name to an order-preserving array. If it's added later, keep the JSON-blob persistence approach; don't introduce a relational per-item table without a concrete reason this simple structure can't satisfy.

The admin header keeps two distinct controls below the large-screen breakpoint: the left button toggles the database-driven sidebar and the right button opens the compact core-module menu. The visible legacy operations are Privileges, Announcements, Notifications, Log User Access, Module Activity History, and System Error Logs. Menu Management, Module Generator, and API Generator remain implemented but are inactive in navigation.

## Maintenance

- Keep `Auth/*` and `Public/*` outside the authenticated layout.
- Test content overflow when adding fixed headers/sidebars or fullscreen chart UI.
- Add new navigation in both server authorization and the correct role layout.
- Do not derive admin access only from client-rendered role labels.

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
