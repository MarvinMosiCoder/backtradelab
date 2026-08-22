# Live cross-tab sync for symbol and playbook dropdowns

## Purpose

The chart's "Add/save market" symbol dropdown and the "enter position" playbook dropdown only load their lists once (on mount / on specific dependency changes). When a symbol or playbook is added, edited, or removed elsewhere — another browser tab, or a sibling component on the same page — the dropdown doesn't reflect it until a full page reload.

Trigger: user asked whether newly-added symbols and playbooks can appear in these dropdowns live, without a reload, and whether the chart's price data is already live.

## Scope

**In scope:**
- Live (no-reload) sync of the symbol list backing the "Add/save market" dropdown, for both additions and removals.
- Live (no-reload) sync of the playbook list backing the "enter position" playbook dropdown, for additions, edits, and removals/archiving.
- If the currently-selected playbook in the position-entry panel is removed elsewhere, selection resets to "No playbook."
- Refetching playbooks whenever the position-entry panel opens, as a fallback for panels that weren't mounted when a sync message fired.

**Explicitly out of scope:**
- Real server-push broadcasting (Laravel Reverb/Echo/Pusher). This app has no broadcasting infrastructure wired up today (`config/broadcasting.php` defaults to the `null` driver, Echo setup in `bootstrap.js` is commented out, no `laravel/reverb` or `pusher-js` packages installed). Standing that up is a much bigger lift (new persistent server process, new packages, `ShouldBroadcast` events) than this feature justifies.
- Syncing across different logged-in devices/users, or across browsers that don't share the same origin's `BroadcastChannel`. The mechanism below only covers tabs/contexts of the same browser for the same user.
- Live chart price data — already implemented via a direct browser-to-exchange WebSocket with REST polling fallback (`resources/js/Components/Market/MarketChart/liveCandleStream.js`, wired in `MarketChart.jsx:5480-5569`). No changes needed there.
- Any dropdown other than the two named above (exchange selector, market category, etc.).

## Current state (for context)

- **Symbols**: `MarketChart.jsx` loads saved symbols via `fetch('/market-symbols')` in `loadMarketSymbols` (`MarketChart.jsx:1645-1697`), refetched only when `exchange`/`marketCategory`/`symbol` change. Adding a symbol (`axios.post('/market-symbols', ...)`, `MarketChart.jsx:6008`) already pushes the result into local `symbols` state on success (`MarketChart.jsx:6028-6048`), so same-component adds already appear instantly. Removing a symbol happens in a different component, `Context/WatchlistContext.jsx:147` (`axios.delete('/market-symbols/${item.id}')`, used by `WatchlistPanel.jsx`), which does **not** touch `MarketChart.jsx`'s `symbols` state — and `WatchlistPanel` is rendered alongside the chart in fullscreen mode (`MarketChart/FullscreenChartHeader.jsx`), so this is a same-page gap, not just a cross-tab one.
- **Playbooks**: `ReplayPanel.jsx:2110-2120` fetches playbooks once via `axios.get('/market-backtest/playbooks', ...)` in a `useEffect` with an empty dependency array — never refetched after mount. Playbooks are created/edited/archived on a separate page entirely, `StrategyPlaybooks.jsx` (rendered from `Pages/Market/TradeReportPage.jsx`), via `axios.post`/`put`/`delete` to `/market-backtest/playbooks` (`StrategyPlaybooks.jsx:148-162`). There is no link between that component and `ReplayPanel.jsx`'s state today.
- **Broadcasting infra**: confirmed absent (see Scope, out-of-scope note above). Queue is configured (`QUEUE_CONNECTION=database`) but unused for anything broadcast-related.

## Design

### Mechanism

A small helper module, `resources/js/utils/broadcastSync.js`, wraps the native `BroadcastChannel` API:

```js
export function createSyncChannel(name) {
  if (typeof BroadcastChannel === 'undefined') {
    return { post: () => {}, subscribe: () => () => {} };
  }
  const channel = new BroadcastChannel(name);
  return {
    post: (message) => channel.postMessage(message),
    subscribe: (handler) => {
      const listener = (event) => handler(event.data);
      channel.addEventListener('message', listener);
      return () => channel.removeEventListener('message', listener);
    },
  };
}
```

`BroadcastChannel` delivers a posted message to every *other* open channel instance with the same name — including another channel instance opened in the *same* tab (e.g. `WatchlistPanel` and the chart dropdown both mounted in fullscreen mode), as well as instances in other tabs. One mechanism covers both the same-page case and the cross-tab case, with no server involvement. If the browser doesn't support `BroadcastChannel` (very old browsers), `post`/`subscribe` are no-ops and the app behaves exactly as it does today — no regression, just no live sync.

Two channels, one per concern: `bt:market-symbols` and `bt:playbooks`.

### Symbols

- `MarketChart.jsx`, after the existing local `setSymbols` update on a successful save (`MarketChart.jsx:6028-6048`): `symbolsChannel.post({ action: 'add', symbol: savedSymbol })`.
- `Context/WatchlistContext.jsx`, after the existing successful delete (`WatchlistContext.jsx:147`): `symbolsChannel.post({ action: 'remove', symbol: item.symbol, exchange: item.exchange, category: item.category })`.
- `MarketChart.jsx` subscribes once (alongside its existing effects) and applies incoming messages to `symbols` state:
  - `add`: same upsert-by-`(symbol, exchange, category)` logic already used locally (`MarketChart.jsx:6028-6048`), reused as a shared function rather than duplicated.
  - `remove`: filter out the entry matching `(symbol, exchange, category)`.
- Messages are validated defensively before being applied (must have a recognized `action` and the expected identity fields) — malformed or foreign messages on the channel are ignored, not applied.

### Playbooks

- `StrategyPlaybooks.jsx`, after each successful mutation (`StrategyPlaybooks.jsx:148-162`): `playbooksChannel.post({ action: 'add' | 'update' | 'remove', playbook })` (create → `add`, update → `update`, archive/delete → `remove`).
- `ReplayPanel.jsx` subscribes and applies incoming messages to its `playbooks` state:
  - `add` / `update`: upsert by `id`.
  - `remove`: filter out by `id`; if `selectedPlaybookId` matches the removed playbook, reset it to `''` (the existing "No playbook" option).
- In addition to the subscription, `ReplayPanel.jsx` refetches the playbook list whenever the position-entry panel transitions to open (not just on first component mount), so a panel that wasn't mounted yet when a broadcast fired still starts from a current list. This reuses the existing `axios.get('/market-backtest/playbooks', ...)` call, just re-triggered on the panel-open event/prop rather than solely on mount.

### Error handling

- Unsupported-browser fallback: no-op `post`/`subscribe`, existing fetch-on-mount/fetch-on-save behavior is unaffected.
- Malformed or unrecognized messages on either channel: ignored (shape-checked before being applied to state).
- Network failure on the refetch-on-open call for playbooks: keep existing playbooks in state (don't clear the dropdown on a failed refetch) and fail silently, matching the existing `.catch()` behavior at `ReplayPanel.jsx:2116-2118` for the mount fetch (which sets to empty on failure — refetch-on-open should *not* replicate the empty-on-failure behavior, since that would blow away a perfectly good already-loaded list just because a background refresh failed).

## Testing

Manual only (no existing automated coverage for this interaction):

- Open the chart in fullscreen mode with the watchlist panel visible; add a symbol via "Add/save market," confirm it appears in the watchlist without reload; remove a symbol from the watchlist panel, confirm it disappears from the "Add/save market" dropdown without reload.
- Open two browser tabs on the chart page; add/remove a symbol in one tab, confirm the other tab's dropdown updates live.
- Open the Trade Report page (playbook management) in one tab and the chart page in another; create a playbook, confirm it appears in the chart's "enter position" playbook dropdown without navigating or reloading; edit its name, confirm the dropdown label updates; archive/delete it, confirm it disappears from the dropdown and, if it was selected, selection resets to "No playbook."
- Open the position-entry panel fresh (first time this session) after a playbook was created while the panel was never mounted; confirm the refetch-on-open picks it up.
- Confirm no console errors and no regression in a single-tab session with no other tabs open (baseline behavior unaffected).
