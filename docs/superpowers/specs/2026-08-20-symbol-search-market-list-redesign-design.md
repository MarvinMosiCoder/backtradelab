# Symbol search dropdown: Binance-style market list restyle

## Purpose

Restyle the chart's "search all symbols" dropdown (`ChartHeader.jsx`, both the compact/mobile and desktop variants) to look like a Binance-style market list: search bar above the tabs, underline-style Favorites/Spot/Futures tabs, and tighter table-like rows. Visual and light-filtering changes only — no new price/change/volume data, no sortable columns, no margin-type sub-tabs, no asset-class filter chips.

Trigger: user shared a screenshot of Binance's futures market list and asked for "something like this."

## Scope

**In scope:**
- Reorder the panel: search input above the category tabs (currently below).
- Replace the segmented-pill `MarketCategoryTabs` with underline-style tabs.
- Add a third **Favorites** tab alongside Spot/Futures.
- Restyle each result row to be tighter/denser: coin icon + bold symbol on top, smaller exchange + category line underneath.
- Reskin the existing "add to watchlist" button as a star icon (outline = not in the active watchlist, filled = in it).
- Apply to both the compact (mobile popover) and desktop panel variants, since both already share `MarketCategoryTabs` and the same row-rendering logic.

**Explicitly out of scope:**
- Last Price / 24H Change / 24H Volume columns and any sorting UI.
- USDT-M / USDC-M / Coin-M margin-type sub-tabs.
- All / TradFi / Stocks / ETF / Semiconductor asset-class filter chips (not meaningful for a crypto-only app).
- Any new backend endpoint or data fetching.
- Binance's yellow-green accent color — this app's existing `#2962ff` blue stays the accent (active tab underline, focus rings, filled star), for consistency with the rest of the app (buttons, the NProgress loading bar, etc.).

## Current state (for context)

`ChartHeader.jsx` renders the same underlying markup twice — once for `compact` (mobile, lines ~204-368) and once for desktop (lines ~370-570) — both using a shared `MarketCategoryTabs` sub-component (Spot/Futures, segmented-pill style, drives `marketCategory` state upstream in `MarketChart.jsx`) and both rendering `filteredAddSymbolOptions` as a flat list of rows (coin icon, symbol, exchange/category text, an "add to watchlist" icon-button that opens a per-item watchlist picker menu, and an "Open" button).

`filteredAddSymbolOptions` is derived from `availableSymbols`, which `MarketChart.jsx` fetches from `/api/market-symbol-options?category=${marketCategory}` — already scoped server-side to the active Spot/Futures category. Switching category tabs re-fetches this list; `ChartHeader.jsx` only applies the client-side text-search filter on top.

Watchlist data (`watchlists`, `activeWatchlist`, `addSymbolToWatchlist`) is already available via `useWatchlist()` in `ChartHeader.jsx` and used today for the existing "add to watchlist" picker menu — no new data source needed for the Favorites tab or the star icon.

## Design

### Layout

Swap the order inside the dropdown panel: search input first, then the tab row, then the results list. Applies identically to both compact and desktop variants.

### Tabs

Replace `MarketCategoryTabs`'s segmented-pill markup (`grid grid-cols-2` with a filled active background) with a horizontal underline-tab row: plain text labels, a `border-b-2` accent (`#2962ff`) under the active tab, muted text color for inactive tabs. Add a third tab, **Favorites**, before Spot and Futures (matching the screenshot's Favorites / Spot / Futures order).

Favorites is a client-side view filter, not a fourth `marketCategory` value:
- Selecting Spot or Futures behaves exactly as today (calls `onCategoryChange`, which updates `marketCategory` upstream and re-fetches `availableSymbols`).
- Selecting Favorites does **not** call `onCategoryChange` — it leaves `marketCategory` (and therefore the underlying `availableSymbols` fetch) exactly as it last was, and layers an additional filter on `filteredAddSymbolOptions`: only rows whose `buildSymbolKey(item)` appears in `watchlists[activeWatchlistName]` (falling back to "no favorites yet" empty state if that list is empty or there's no active watchlist).
- Switching Spot ↔ Futures while Favorites is selected does not auto-exit Favorites; the user explicitly clicks back to Spot or Futures to leave it, exactly like the screenshot's mutually-exclusive tab row.

### Rows

Each row becomes two lines on the left (icon stays the same size/position):
- Line 1: symbol, bold, slightly larger than today.
- Line 2: exchange label + category label, small/muted (reusing the existing `marketCategoryLabel()` helper and text already shown today, just demoted to a secondary line instead of being inline with the symbol).

Row padding/height tightens slightly to read as a denser list, matching the screenshot's density. The "Open" button keeps its current position, styling, and behavior unchanged.

### Star icon (watchlist reskin)

The existing icon-button that opens the "add to watchlist" picker menu swaps its icon: `Star` (outline, from `lucide-react`, already a project dependency via other icons in this file) when the row's symbol is in no watchlist, `Star` (filled, via `fill="currentColor"`) colored `#2962ff` when it's in the active watchlist. Click behavior is unchanged — it still opens the same per-item watchlist-picker menu that exists today (so a symbol can still be added to a *non-active* watchlist via that menu; the star's filled/outline state reflects membership in the active watchlist specifically, consistent with what the Favorites tab shows).

## Testing

- Desktop and compact/mobile panel both show the new layout and tabs.
- Favorites tab: empty state when the active watchlist has no symbols in the current result set; correct filtering when it does; switching to Spot/Futures and back preserves expected state.
- Star icon reflects active-watchlist membership correctly and the existing picker menu still adds/removes symbols from named watchlists without regression.
- Dark and light theme (existing `isDark` ternary pattern in this file).
- Existing symbol search, "Open" (select/add symbol), and category-switch behavior all unchanged functionally.
