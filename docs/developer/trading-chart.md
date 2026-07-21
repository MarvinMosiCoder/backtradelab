# Trading Chart

## Purpose

The workspace chart renders candlesticks and volume with Lightweight Charts, indicator panes, replay controls, drawings, alerts, and simulated orders.

| File | Responsibility |
|---|---|
| `Pages/Market/Market.jsx` | Workspace page and onboarding entry |
| `Pages/Dashboard/Dashboard.jsx` | Full chart workspace for traders and explicit admin workspace mode |
| `TradingViewChart.jsx` | Main state, refs, fetching, chart events, feature coordination |
| `ChartHeader.jsx` | Market/timeframe/replay/indicator/appearance commands |
| `FullscreenChartHeader.jsx` | Fullscreen command bar |
| `ReplayPanel.jsx` | Drawing, replay, and order rail |
| `ChartStage.jsx` | Chart container and SVG overlays |
| `IndicatorSettingsPanel.jsx` | Indicator configuration |
| `constants.js`, `utils.js` | Shared chart values and transformations |

## Flow

1. `Market.jsx` loads saved symbols and renders `TradingViewChart`.
2. The chart requests normalized candles from `/api/klines`.
3. Lightweight Charts series are created and updated.
4. Header/rail state changes symbol, timeframe, indicators, replay, drawings, alerts, or positions.
5. Authenticated preferences and domain records are persisted through their feature endpoints.

The chart header's Market Info control fetches `/market-metadata` on demand and displays normalized 24-hour exchange statistics plus optional CoinMarketCap fundamentals with CoinGecko fallback. The popover follows chart theme colors, omits missing values, and never participates in candle loading. Market Summary uses the batch metadata endpoint to add the same identity and headline statistics to saved-market cards.

In fullscreen mode, the left chart rail keeps Replay available alongside drawing tools. Its Replay flyout uses the same access checks and playback controls as the embedded chart, and an open Replay flyout is preserved when entering or leaving fullscreen. The drawing Tool Style and Presets editor floats at the top center of the usable chart pane in both embedded and fullscreen modes; other rail flyouts remain left-aligned.

The component deliberately coordinates several domains; put reusable pure logic in `utils.js`, constants in `constants.js`, and isolated UI in subcomponents rather than expanding the container unnecessarily.

Superadmins open the same complete workspace at `/admin/workspace`; the route is authorization-protected and keeps browser preferences scoped to the authenticated administrator ID.

Right-clicking a valid chart price opens a cursor-anchored action menu instead of immediately opening an order ticket. **Set Alarm** passes the selected price into the existing live-market alert dialog, while **Trigger Position** passes it into the existing Enter Position flyout. The menu is keyboard accessible, constrained to the viewport, and closes on selection, outside click, Escape, scrolling, resizing, or a market-context change. Existing hover shortcuts remain available.

The full chart skeleton is reserved for initial navigation/reload and market identity changes. A timeframe change keeps the current chart visible until the replacement history is ready. The compact Replay control does not duplicate connection text; connection state remains in the bottom-right chart badge.

Returning from Replay to Live keeps the last selected Replay price guide and axis label visible while live candles resume. The retained price participates in live-mode autoscaling. Back to Live waits until the complete live candle series has replaced the Replay slice before scrolling to real time and refreshing the scale; this keeps the latest price line aligned with the displayed live candles without requiring a timeframe change. The guide is replaced by the next Replay selection or cleared by the existing market-context reset. Saved chart drawings, including horizontal lines, are not cleared, and the replay checkpoint remains available when Replay is opened again.

Selecting a Replay candle anchors the guide to that candle's close price rather than the pointer's vertical position, so the axis price and horizontal guide match the selected candle. Ready-tool buttons retain the same 40-pixel footprint and left position as Replay. Each compact 8-pixel chevron area starts directly after the tool button and has a gray hover background. The rail uses 2-pixel horizontal padding to preserve as much chart width as possible.

## State and safety

- Refs own chart/series instances and external subscriptions.
- Effects must unsubscribe WebSockets, timers, observers, and chart handlers.
- Main-pane drawing overlays must not capture indicator-pane input.
- Per-user browser keys must include the authenticated user ID.
- Database-backed records remain authoritative over browser mirrors.

## Verification

- Symbol/timeframe changes and viewport preservation.
- Embedded/fullscreen desktop/mobile geometry.
- Add/configure/hide/remove each indicator.
- Dark/light colors and per-user persistence.
- Replay, drawing, alert, and position integrations.
- No cleanup errors after unmount or navigation.

Related: [Drawings](chart-drawings-and-settings.md), [Streaming](live-market-streaming.md), [Replay](replay-and-progress.md).
# Interactive workspace tour

First-time workspace users receive a spotlight tour of the actual market, timeframe, drawing, replay, simulated-position, and appearance controls. The highlighted control remains usable, while the rest of the page is blocked. The tour supports keyboard navigation, responsive/fullscreen repositioning, missing-target fallback, and restart via Help or the chart help button. `?tour=1` explicitly restarts it without clearing completion history.
