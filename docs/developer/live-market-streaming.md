# Live Market Streaming

## Purpose

Live mode updates the active candle from public exchange WebSockets and falls back to fresh REST polling when streaming is unavailable or stale.

| File | Responsibility |
|---|---|
| `liveCandleStream.js` | Exchange subscriptions, normalization, heartbeat/reconnect |
| `TradingViewChart.jsx` | Lifecycle, status, fallback polling, chart updates |
| `MarketDataController.php` | REST fallback candles |

## Flow

1. Chart selects exchange/category/symbol/timeframe.
2. The old connection and timers are closed.
3. `liveCandleStream.js` opens the exchange-specific public stream.
4. A valid candle is normalized and merged by timestamp.
5. If no first candle arrives or the stream becomes stale, the chart polls `/api/klines?...&fresh=1`.
6. Replay mode stops streaming/polling; returning live creates a new subscription.

Only a valid normalized candle should change the UI to `Live`. Repeated timestamps replace the current candle; older/new candles remain chronologically unique.

## Maintenance

- Encapsulate exchange message shapes and subscription payloads in the stream module.
- Clear sockets, reconnect timers, stale watchdogs, and polling on dependency change/unmount.
- Keep production CSP/firewall access for all configured WebSocket hosts.
- Avoid `fitContent()` during every tick; preserve the user's viewport.

## Verification

- First-message timeout, disconnect, stale open socket, reconnect.
- REST fallback continues without request storms.
- Symbol/timeframe/exchange change creates exactly one active connection.
- Replay stops live activity.
- Duplicate/older timestamps and volume values are safe.

Related: [Market data](market-data-and-symbols.md), [Trading chart](trading-chart.md).
# Initial history readiness

Live candles are buffered until the matching REST history request completes. The loading skeleton remains visible until at least two valid historical candles are available, preventing a one-candle chart flash during exchange connection or market/timeframe changes. RSI and MACD pane sizes are calculated from the fixed chart viewport, so candle updates do not grow the chart.

The current mode (`Replay`, `Live`, `Connecting`, `Reconnecting`, or `Polling`) is displayed at the chart's bottom-right.
