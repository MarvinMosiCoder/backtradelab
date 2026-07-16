# Trading Chart

## Purpose

The workspace chart renders candlesticks and volume with Lightweight Charts, indicator panes, replay controls, drawings, alerts, and simulated orders.

| File | Responsibility |
|---|---|
| `Pages/Market/Market.jsx` | Workspace page and onboarding entry |
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

The component deliberately coordinates several domains; put reusable pure logic in `utils.js`, constants in `constants.js`, and isolated UI in subcomponents rather than expanding the container unnecessarily.

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
