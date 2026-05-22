# Trading Chart Process Documentation

## Overview

The Market Analysis chart is a TradingView-style crypto chart built with React and `lightweight-charts`. It renders candlesticks and volume, supports replay mode, and includes local drawing tools for lines, boxes, long/short positions, forecasting, and text notes.

Chart symbols are stored in the database through `market_symbols`. Candle data comes from the Laravel API endpoint `/api/klines`, which fetches exchange kline data and returns normalized candles to the frontend.

---

## Architecture

```text
User Browser
  resources/js/Pages/Market/Market.jsx
    imports TradingViewChart

  resources/js/Components/Market/TradingViewChart.jsx
    owns chart state, Lightweight Charts refs, data fetching, replay, drawing events

  resources/js/Components/Market/TradingViewChart/
    ChartHeader.jsx
    ReplayPanel.jsx
    ChartStage.jsx
    constants.js
    utils.js

Laravel Backend
  routes/api.php
    GET /api/market-symbols
    GET /api/market-symbol-options
    POST /api/market-symbols
    GET /api/klines

  app/Http/Controllers/MarketDataController.php
    lists/saves market symbols
    fetches available Binance, OKX, Bybit, BingX, and MEXC symbols
    validates params
    fetches exchange klines
    normalizes candles

  app/Models/MarketSymbol.php
    Eloquent model for saved symbols

  database/migrations/...create_market_symbols_table.php
    creates market_symbols table

External API
  Binance, OKX, Bybit, BingX, and MEXC market/symbol endpoints
```

---

## Component Files

| File | Purpose |
|------|---------|
| `resources/js/Pages/Market/Market.jsx` | Market page that renders the chart |
| `resources/js/Components/Market/TradingViewChart.jsx` | Main container for chart state, refs, data fetching, replay logic, and pointer/keyboard events |
| `resources/js/Components/Market/TradingViewChart/ChartHeader.jsx` | Symbol dropdown, searchable add-symbol picker, timeframe, replay toggle, and price display |
| `resources/js/Components/Market/TradingViewChart/ReplayPanel.jsx` | TradingView-style left rail with grouped flyouts for replay controls, drawing tools, paper backtest account controls, and the contextual tool style/preset editor |
| `resources/js/Components/Market/TradingViewChart/ChartStage.jsx` | Chart DOM container, fullscreen button, SVG drawing overlay, resize handles, text input popover with icon actions |
| `resources/js/Components/Market/TradingViewChart/constants.js` | Timeframes, playback speeds, chart size, drawing colors, drawing widths |
| `resources/js/Components/Market/TradingViewChart/utils.js` | Candle normalization, coordinate helpers, drawing storage keys, drawing movement/color helpers |
| `app/Http/Controllers/MarketDrawingController.php` | Loads and saves chart drawings per authenticated user and symbol |
| `app/Http/Controllers/MarketToolSettingController.php` | Loads and saves reusable per-user tool defaults |
| `app/Http/Controllers/MarketBacktestController.php` | Loads paper account state, places market/conditional replay entries, triggers pending entries, cancels pending entries, closes replay positions, and resets the demo account |
| `routes/api.php` | Defines `/api/market-symbols`, `/api/market-symbol-options`, and `/api/klines` |
| `routes/web.php` | Defines authenticated `/market-drawings`, `/market-tool-settings`, and `/market-backtest/*` routes |
| `app/Http/Controllers/MarketDataController.php` | Lists/saves symbols, fetches Binance/OKX/Bybit/BingX/MEXC symbol options, and fetches/normalizes candle data |
| `app/Models/MarketSymbol.php` | Eloquent model for symbols saved in the database |
| `app/Models/MarketDrawing.php` | Eloquent model for per-user saved chart drawings |
| `app/Models/MarketToolSetting.php` | Eloquent model for per-user reusable chart tool defaults |
| `app/Models/MarketBacktestAccount.php` | Eloquent model for a user's paper backtest account |
| `app/Models/MarketBacktestPosition.php` | Eloquent model for open/closed simulated positions |
| `app/Models/MarketBacktestTrade.php` | Eloquent model for simulated trade history |
| `database/migrations/2026_05_06_000001_create_market_symbols_table.php` | Creates the `market_symbols` table |
| `database/migrations/2026_05_12_000002_create_market_drawings_table.php` | Creates the `market_drawings` table |
| `database/migrations/2026_05_12_000003_create_market_tool_settings_table.php` | Creates the `market_tool_settings` table |
| `database/migrations/2026_05_13_000001_create_market_backtest_accounts_table.php` | Creates paper trading accounts |
| `database/migrations/2026_05_13_000002_create_market_backtest_positions_table.php` | Creates simulated position records |
| `database/migrations/2026_05_13_000003_create_market_backtest_trades_table.php` | Creates simulated trade history |

---

## Data Flow

### 1. Symbol List

`TradingViewChart.jsx` loads saved symbols on mount:

```javascript
const response = await fetch('/api/market-symbols', {
  headers: { Accept: 'application/json' },
});
```

The response shape is:

```json
{
  "success": true,
  "symbols": [
    {
      "id": 1,
      "symbol": "BTCUSDT",
      "exchange": "bybit",
      "exchange_symbol": "BTCUSDT",
      "coin_name": "BTC",
      "base_coin": "BTC",
      "quote_coin": "USDT",
      "category": "spot"
    }
  ]
}
```

`TradingViewChart.jsx` also loads the available add-symbol options from Binance, OKX, Bybit, BingX, and MEXC through Laravel. The chart header has a Market selector for Spot or Futures; Futures uses the backend `linear` category.

```javascript
const response = await fetch('/api/market-symbol-options?category=spot', {
  headers: { Accept: 'application/json' },
});
```

The response contains tradable instruments:

```json
{
  "success": true,
  "symbols": [
    {
      "symbol": "ETHUSDT",
      "exchange": "okx",
      "exchange_symbol": "ETH-USDT",
      "category": "spot",
      "coin_name": "ETH",
      "baseCoin": "ETH",
      "quoteCoin": "USDT",
      "status": "Trading"
    }
  ]
}
```

Users add symbols from `ChartHeader.jsx` by clicking `Add Symbol`, searching the available-symbol list, then clicking the plus icon beside a symbol. The frontend sends:

```javascript
await fetch('/api/market-symbols', {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    symbol: normalizedSymbol,
    exchange: 'okx',
    exchange_symbol: 'ETH-USDT',
    coin_name: 'ETH',
    base_coin: 'ETH',
    quote_coin: 'USDT',
    category: 'spot',
  }),
});
```

The backend uppercases and validates symbols with `/^[A-Za-z0-9]+$/`, then stores them in `market_symbols` with the source exchange, market category, native exchange symbol, coin name, base coin, and quote coin. The database uniqueness is by `exchange + category + symbol`, so the same market name can be saved from multiple exchanges and as both spot and futures.

After a symbol is saved, `TradingViewChart.jsx` inserts it into the saved-symbol list, selects it as the active chart symbol, and the candle request reloads for that symbol.

### 2. Frontend Candle Request

`TradingViewChart.jsx` fetches candles whenever `symbol` or `timeframe` changes.

```javascript
const params = new URLSearchParams({
  symbol,
  exchange,
  interval,
  category: 'spot',
  limit: '1000',
  max_candles: wasInReplay ? '10000' : '5000',
});

const response = await fetch(`/api/klines?${params.toString()}`, {
  headers: { Accept: 'application/json' },
});
```

When replay mode is active, timeframe changes anchor the candle request around the current replay candle and saved drawing timestamps. The frontend passes an `end` timestamp to `/api/klines` so lower timeframes load candles around the active replay area instead of only loading the latest market data. This prevents the chart and tools from disappearing when switching from a higher timeframe to a lower one whose latest candle window would otherwise not include the old replay/drawing time.

The UI timeframe is mapped to the selected exchange interval in `MarketDataController.php`.

| UI Timeframe | API Interval |
|--------------|--------------|
| `1m` | `1` |
| `3m` | `3` |
| `5m` | `5` |
| `15m` | `15` |
| `30m` | `30` |
| `1h` | `60` |
| `2h` | `120` |
| `4h` | `240` |
| `6h` | `360` |
| `12h` | `720` |
| `1d` | `D` |
| `1w` | `W` |
| `1M` | `M` |

### 3. Backend Processing

`MarketDataController.php` has four chart-related actions:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `symbols()` | `GET /api/market-symbols` | Return active symbols from `market_symbols` |
| `availableSymbols()` | `GET /api/market-symbol-options` | Return available Binance, OKX, Bybit, BingX, and MEXC instruments for the add-symbol picker |
| `storeSymbol()` | `POST /api/market-symbols` | Validate, uppercase, and save a symbol |
| `klines()` | `GET /api/klines` | Fetch normalized exchange candles |

`availableSymbols()` validates the requested category, calls the configured exchange symbol endpoints, normalizes symbol/base/quote/status/exchange metadata, sorts the symbols alphabetically, and returns them for the searchable picker. The picker displays the coin name and the source exchange beside each symbol.

`klines()` validates the requested exchange/category/interval, fetches candles from the selected exchange, deduplicates by timestamp, sorts oldest to newest, and returns normalized candle objects:

```json
{
  "time": 1672531200,
  "open": 16500.5,
  "high": 16550,
  "low": 16480,
  "close": 16520.75,
  "volume": 1250.45
}
```

### 4. Frontend Normalization

The frontend also normalizes the response with `normalizeApiCandles()` so it can tolerate either object-style or array-style candle payloads.

Normalized candles are stored in:

```javascript
const [allCandles, setAllCandles] = useState([]);
```

Replay mode derives the visible data from `allCandles`:

```javascript
const visibleCandles = useMemo(() => {
  if (!replayMode) return allCandles;
  return allCandles.slice(0, replayIndex + 1);
}, [allCandles, replayMode, replayIndex]);
```

### 5. Per-User Drawing Storage

Chart drawings are stored per authenticated user and symbol in the `market_drawings` table. The table uses `adm_user_id` and `symbol` as a unique pair, and stores the drawing list as JSON.

The frontend loads drawings with:

```javascript
axios.get('/market-drawings', {
  params: { symbol },
});
```

Drawing changes are saved with:

```javascript
axios.put('/market-drawings', {
  symbol,
  drawings: nextDrawings,
});
```

`localStorage` remains as a browser fallback and migration source. If the database has no saved drawing record for the current user and symbol, existing local drawings are loaded and uploaded to the server. The backend returns an `exists` flag so an intentionally empty drawing list is preserved after the user clears their tools. After the first server save, the database is the primary source, so the same user can see their tools on another device after logging in.

### 6. Reusable Tool Defaults

Reusable tool defaults are stored per authenticated user in `market_tool_settings`. These defaults are separate from symbol drawings so they can be used across symbols and timeframes.

The frontend loads defaults with:

```javascript
axios.get('/market-tool-settings');
```

Tool defaults are saved with:

```javascript
axios.put('/market-tool-settings', {
  settings: nextSettings,
});
```

When a drawing is completed, or when a selected drawing's color, width, label text, or label placement is changed, `TradingViewChart.jsx` updates the saved defaults for that tool type. If no drawing is selected, the contextual editor updates the active tool's defaults directly, so Line, Box, Forecast, Text, and position tools can each keep their own style. New tools of the same type inherit those saved settings, including line/box text placement and text-tool draft text. `localStorage` mirrors the settings as a fallback if the server request is unavailable.

The same settings object also stores selectable presets by tool type under `settings.presets`. A selected text, box, line, or forecast drawing can be saved as a preset from the contextual editor in `ReplayPanel.jsx`. Example text presets can be `BOS`, `MSS`, `HH`, `HL`, `LH`, or `LL`. After saving, the preset appears as a button when that tool type is active or selected. Clicking a preset applies its saved text, color, width, and label placement to the selected drawing, or makes it the default for the next drawing of that type.

---

### 7. Paper Backtest Account

Each authenticated user can use a database-backed demo account while replaying candles. `MarketBacktestController.php` creates a default `Demo Account` with `10,000 USDT` the first time the replay account panel is opened.

The frontend loads account state with:

```javascript
axios.get('/market-backtest/account', {
  params: { symbol, price: executionPrice },
});
```

Replay orders can be placed as Market or Conditional entries. Market entries fill immediately at the current replay execution price, or at the optional manual entry override. Conditional entries require a trigger price and are stored as pending positions until a replay candle trades through that level. The ticket accepts margin, leverage, optional stop loss, and optional take profit levels. For long positions, SL must be below entry and TP must be above entry; for short positions, SL must be above entry and TP must be below entry. The panel shows estimated leveraged value, risk, reward, and R/R before entry.

Pending entries are checked against the current replay candle high/low. If `low <= entryPrice <= high`, the pending entry is triggered at its configured entry price, the open trade is recorded, margin is locked, and the entry fee is charged. The candle where the order was placed is skipped so a conditional order cannot trigger from price action that already happened before placement. Pending entries can also be cancelled from the Wallet panel before they trigger.

As replay advances, open positions are checked against the current candle high/low. A long closes at SL when `low <= stopLoss`, or at TP when `high >= takeProfit`; a short closes at SL when `high >= stopLoss`, or at TP when `low <= takeProfit`. The entry candle is skipped so a newly opened trade is not closed by price movement that happened before the simulated entry. If SL and TP are both inside the same candle, SL is treated as hit first because the intrabar path is unknown from OHLC data.

Paper futures trading treats the entered size as margin/collateral. Leverage can be set from `1x` to `125x`; quantity, risk, reward, PnL, and fees are calculated from `margin * leverage`, while only margin plus entry fee is reserved from cash. If the requested margin is within the cash balance but the entry fee would push required cash over the balance, the entry margin is reduced slightly so the fee fits inside available cash. The simulated taker fee is `0.04%` on leveraged entry/exit notional. Closing returns margin plus or minus gross PnL and charges the exit fee.

| Route | Purpose |
|-------|---------|
| `GET /market-backtest/account` | Load demo account, open positions, recent trades, and account metrics |
| `GET /market-backtest/report` | Load closed-position win/loss report data for the report table and calendar |
| `POST /market-backtest/positions` | Place a market entry or pending conditional entry |
| `POST /market-backtest/positions/{position}/trigger` | Trigger a pending conditional entry when replay price reaches the entry |
| `POST /market-backtest/positions/{position}/cancel` | Cancel a pending conditional entry |
| `POST /market-backtest/positions/{position}/close` | Close an open replay position at the current replay price |
| `POST /market-backtest/reset` | Reset the demo account back to the starting balance |

`ReplayPanel.jsx` exposes this through the Wallet flyout. The panel shows equity, cash, open PnL, execution price, market/conditional order mode, long/short entry controls, margin/leverage/value planning, optional entry/SL/TP fields, pending entry cancel buttons, open position close buttons, and recent trades.

The Wallet flyout keeps its header visible and scrolls the account content internally. This keeps the full order ticket, pending entries, open positions, and recent trades reachable on smaller screens without pushing the panel outside the viewport.

The paper account remains internally quote-currency based, normally `USDT`. The Wallet flyout and Trade Report can display account-sized values in `USDT` or `PHP`. When `PHP` is selected, the user can edit the `PHP / USDT` rate; equity, cash, PnL, margin, leveraged value, risk, reward, fees, and report values are converted for display, and PHP margin inputs are converted back to USDT before orders are submitted. Market prices such as entry, stop loss, take profit, trigger, and chart price remain in the symbol's quote price scale.

### Trade Report

`TradeReport.jsx` displays closed replay trades as an exchange-style history report. It is available from the sidebar at `/trade-report` through `resources/js/Pages/Market/TradeReportPage.jsx`.

The report uses `GET /market-backtest/report`, which reads closed `market_backtest_positions` for the authenticated user's active demo account. Closed positions are used instead of raw trade rows because each closed position contains the full entry, exit, margin, leverage, entry fee, exit fee, and realized PnL in one record.

The report includes:

| View | Purpose |
|------|---------|
| Summary cards | Net PnL, win rate, wins, losses, and fees |
| Calendar | Daily PnL plus daily win/loss counts by close date, with month arrows and a click-open month/year selector |
| Closed-trades table | Symbol, side, entry, exit, leverage, margin, leveraged value, fees, PnL, PnL percent, and win/loss result |

The sidebar link is added in `resources/js/Components/Sidebar/SidebarAccordion.jsx` as a direct `Trade Report` navigation item. The report is intentionally separate from the chart page so the chart workspace stays focused on analysis and replay.

---

## Chart Rendering

`TradingViewChart.jsx` creates the Lightweight Charts instance and stores chart/series instances in refs:

```javascript
const chartRef = useRef(null);
const candleSeriesRef = useRef(null);
const volumeSeriesRef = useRef(null);
```

The chart uses:

| Series | Purpose |
|--------|---------|
| `CandlestickSeries` | Price candles |
| `HistogramSeries` | Volume bars |

The chart has dark styling, visible time labels, a right price scale, and enabled native pan/zoom behavior.

Volume bars are derived from visible candles:

```javascript
const visibleVolume = visibleCandles.map((c) => ({
  time: c.time,
  value: c.volume,
  color: c.close >= c.open ? '#26a69a88' : '#ef535088',
}));
```

---

## Replay Mode

Replay mode starts around 30% through the loaded candle set:

```javascript
const startIndex = Math.max(0, Math.floor(allCandles.length * 0.3));
```

When replay mode is enabled:

| Control | Behavior |
|---------|----------|
| Back | Moves one candle backward |
| Play/Pause | Starts or stops interval playback |
| Forward | Moves one candle forward |
| Reset | Stays in replay mode and jumps to the latest/current candle price |
| Follow Replay | Scrolls chart to the replay edge |
| Set Replay Price | Arms the next chart click to pick replay candle/price |
| Speed buttons | Changes playback interval inside the replay flyout |

Playback speeds are defined in `constants.js`.

Replay controls live on the same chart surface as the live chart. The compact left rail is always available, and pressing Play, Forward, Back, or Set Replay Price from the live chart starts or arms replay behavior without opening a separate replay chart. Leaving replay returns the same chart to the latest live candle view.

| Label | Interval |
|-------|----------|
| `0.25x` | `3000ms` |
| `0.5x` | `2000ms` |
| `1x` | `1000ms` |
| `2x` | `500ms` |
| `4x` | `250ms` |
| `10x` | `100ms` |
| `20x` | `50ms` |

Replay price selection creates a dashed price line with `candleSeries.createPriceLine()`.

Changing timeframe while replay is active keeps replay mode enabled, pauses playback, preserves the selected drawing tool, preserves the selected replay price, and moves the replay index to the nearest matching timestamp in the newly loaded candle set. If drawings exist, the chart frames the replay candle plus drawing timestamps after the new candles load instead of forcing follow mode, so boxes/lines do not disappear when switching between lower and higher timeframes.

The selected replay price is also included in the candlestick series `autoscaleInfoProvider`. This keeps the dashed selected-price line visible after changing timeframe, even if the new candle range would normally autoscale away from that price.

The selected-price line effect depends on `timeframe` and `visibleCandles.length`, not only the selected price value. This matters because `candleSeries.setData()` can refresh the series during timeframe changes even when the selected replay price value is unchanged, so the line is recreated after the new data is applied.

---

## Drawing Tools

Drawing tools are available on the live chart and in replay mode. `TradingViewChart.jsx` renders `ChartStage.jsx` as the single chart workspace and overlays `ReplayPanel.jsx` as a compact left rail. Clicking a rail icon opens a flyout for that group, similar to TradingView's drawing toolbar behavior, so the chart keeps the full available width.

The rail currently has four main groups:

| Group | Behavior |
|-------|----------|
| Replay | Start replay, back/play/forward, reset/go latest, follow, price picking, candle count, and playback speed |
| Tools | Drawing tool selection plus clear/delete actions |
| Backtest Account | Paper account metrics, long/short entry, close buttons, and recent trades using the live price or replay execution price |
| Tool Editor | Contextual color, width, label/text, and preset controls for the active tool or selected drawing |

The Tool Editor opens automatically after a tool is clicked or a drawing is selected. If a drawing is selected, edits apply to that drawing and update the saved defaults for its type. If only a tool is active, edits update the defaults for the next drawing of that type.

| Tool | Placement | Saved Shape |
|------|-----------|-------------|
| Line | Click start, click end | `{ type: 'line', start, end, strokeWidth, color }` |
| Horizontal Ray | Click anchor, click to finish | `{ type: 'horizontal-ray', start, end, strokeWidth, color }` |
| Long Position | Click entry, click target/time | `{ type: 'long-position', start, end, strokeWidth, color }` |
| Short Position | Click entry, click target/time | `{ type: 'short-position', start, end, strokeWidth, color }` |
| Forecast | Click start, click end | `{ type: 'forecast', start, end, strokeWidth, color }` |
| Box | Click first corner, click opposite corner | `{ type: 'rect', start, end, strokeWidth, color }` |
| Text | Click point, enter label | `{ type: 'text', point, text, color }` |

After a two-point drawing is completed, the active tool is reset to default so the next click does not keep drawing the same tool.

Long and short position drawings use the same stored chart coordinates as lines. The first click sets entry; the second click sets the target/time and creates an initial mirrored stop. After placement, the target and stop have separate resize handles, so the green profit box and red loss box can be adjusted independently. The overlay shows reward/risk, target percent, stop percent, and duration. Entry, target, and stop prices also render as plain colored text on the right-side vertical price area: neutral for entry, green for target, and red for stop. Forecast displays price delta, percent change, and elapsed time with a dashed arrow pointing to the forecast endpoint.

Drawings are stored per symbol:

```javascript
`replay-drawings:${symbol}`
```

Drawings are saved to the backend through `/market-drawings` and mirrored in `localStorage` as a fallback/migration source. Existing browser-only drawings are merged into the shared per-symbol key and uploaded when no server record exists yet.

Older timeframe-specific drawing keys are still read and migrated/merged when symbols load:

```javascript
`replay-drawings:${symbol}:${timeframe}`
```

This lets drawings made on one timeframe remain available on other timeframes for the same symbol.

### Drawing Colors

Drawing colors are defined in `constants.js`:

```javascript
export const DRAWING_COLORS = [
  '#60a5fa',
  '#fbbf24',
  '#34d399',
  '#fb7185',
  '#a78bfa',
  '#f97316',
  '#f8fafc',
];
```

The active color applies to the selected drawing or to the active tool defaults. Line, Horizontal Ray, Forecast, Box, Text, Long, and Short can each keep a separate saved color/default style. Box fill uses the same color with transparency, while long/short position tools use fixed green profit and red loss zones.

---

## Drawing Coordinates

Drawings are stored in chart coordinates, not screen pixels.

| Stored Field | Meaning |
|--------------|---------|
| `time` | Candle timestamp in seconds |
| `logical` | Lightweight Charts logical index, used for accurate placement beyond the last candle |
| `price` | Price value on the candle series scale |
| `labelText` | Optional text displayed on line-like drawings and boxes |
| `labelVertical` | Optional label vertical placement: `top`, `middle`, or `bottom` |
| `labelHorizontal` | Optional label horizontal placement: `left`, `center`, or `right` |

When the user clicks or drags on the chart, screen coordinates are converted to chart coordinates:

```javascript
const logical = chart.timeScale().coordinateToLogical(x);
const rawTime = chart.timeScale().coordinateToTime(x);
const rawPrice = candleSeries.coordinateToPrice(y);
```

When drawing the overlay, chart coordinates are converted back to screen coordinates:

```javascript
const logicalFromTime = estimateDrawingLogicalFromTime(allCandles, point.time, intervalSeconds);
const x = chart.timeScale().logicalToCoordinate(logicalFromTime);
const y = candleSeries.priceToCoordinate(price);
```

This is why drawings stay attached to candle time/price while the chart scrolls or zooms. Logical coordinates also allow drawing tools to extend beyond the last loaded candle instead of snapping back to the final candle.

For `30m` and higher timeframes, existing intraday drawing timestamps are rendered on the candle bucket that contains the saved timestamp. This keeps tools aligned to higher timeframe candles instead of placing an intraday timestamp fractionally between two wider candles. The saved drawing timestamp is not mutated, so switching back to a lower timeframe can still use the original precise time.

When switching timeframe, drawing timestamps are projected through the full loaded candle set and then rendered onto the active replay series. This keeps shared drawings aligned even when the replay series only shows candles up to the current replay index. On `30m` and higher timeframes, intraday drawing timestamps snap to the containing candle bucket so lower-timeframe tools do not drift toward the side of the chart. Boxes use a minimum visible rectangle size so very short lower-timeframe boxes do not collapse into a 1px sliver on higher timeframes.

---

## Drawing Overlay

The chart itself is rendered by Lightweight Charts. Drawings are rendered above it with a React/SVG overlay in `ChartStage.jsx`.

| Drawing Type | Rendered As |
|--------------|-------------|
| Line | SVG `<line>` |
| Horizontal Ray | SVG `<line>` from anchor to the chart's right edge |
| Long Position | Independently resizable green profit zone and red loss zone, entry/target/stop lines, reward/risk label, and colored right-axis price text |
| Short Position | Independently resizable green profit zone and red loss zone, entry/target/stop lines, reward/risk label, and colored right-axis price text |
| Forecast | Dashed SVG `<line>` with arrowhead and projection label |
| Box | SVG `<rect>` with color-based transparent fill |
| Text | Plain absolutely positioned React text without a background box |
| Resize handles | Small SVG `<rect>` handles |
| Fullscreen | Browser fullscreen API on the chart wrapper |

The overlay is intentionally `pointer-events: none`; mouse events are handled by the chart wrapper in `TradingViewChart.jsx`.

`ChartStage.jsx` includes a fullscreen button in the chart's top-right corner. Fullscreen mode uses the browser Fullscreen API when available and falls back to internal fullscreen state if needed. The chart and overlay are both resized through the same wrapper, so drawing alignment is preserved.

### Overlay Refresh

Lightweight Charts can pan/zoom internally without React state changes. To keep overlay drawings aligned, `TradingViewChart.jsx` uses `overlayRenderVersion` and `scheduleOverlayRender()` to force recalculation after:

| Trigger | Why |
|---------|-----|
| Visible range changes | User pan/zoom or follow replay scroll |
| Mouse wheel/move/up/leave | Native chart viewport interaction |
| ResizeObserver events | Chart/container size changed |
| Data updates | Visible candles changed |
| Programmatic `fitContent()` / `scrollToPosition()` | Chart viewport moved through code |

Right price-scale wheel scrolling is handled separately from the chart's default wheel behavior. When the cursor is over the right-side price number panel, `TradingViewChart.jsx` intercepts the wheel event before Lightweight Charts handles it, prevents the default time-scale zoom, and updates `chart.priceScale('right').setVisibleRange()` instead. Scrolling up shrinks the visible price range for vertical zoom-in; scrolling down expands the visible price range for vertical zoom-out.

---

## Selection, Moving, and Resizing

### Selection

`hitTestDrawing()` checks drawings from topmost to bottommost and returns the selected drawing ID.

| Drawing | Hit Test |
|---------|----------|
| Line, Horizontal Ray, Forecast | Distance to line segment |
| Long Position, Short Position | Pointer inside the position zone |
| Box | Pointer inside rectangle bounds |
| Text | Pointer near the text label anchor |

### Moving

Dragging a selected drawing moves it by calculating:

```javascript
const deltaTime = coords.time - startMouse.time;
const deltaLogical = coords.logical - startMouse.logical;
const deltaPrice = coords.price - startMouse.price;
```

`offsetDrawing()` applies that delta to the drawing's stored chart coordinates.

When a drawing or resize handle is dragged, the wrapper intercepts the mouse event in capture phase, stops propagation, and temporarily disables chart `handleScroll`/`handleScale`. This prevents the chart from panning while the drawing itself is being moved.

### Resizing

`hitTestResizeHandle()` checks selected drawing handles before normal drawing hit tests.

| Drawing | Handles |
|---------|---------|
| Line, Forecast | Start endpoint, end endpoint |
| Horizontal Ray | Anchor endpoint |
| Long Position, Short Position | Entry point, target/time point, stop/time point |
| Box | Four corners and four side midpoints |

Box resize behavior:

| Handle | Behavior |
|--------|----------|
| Corner handles | Resize width and height together |
| Left/right side handles | Resize width only |
| Top/bottom side handles | Resize height only |

Resizing updates stored `time` and/or `price`, so resized drawings remain attached to the chart when scrolling or zooming.

### Stroke Width

Selected line, long/short position, forecast, and box drawings show width controls in the contextual Tool Editor in `ReplayPanel.jsx`. When no drawing is selected, the same controls update the active tool's default width.

Available stroke widths:

```javascript
[1, 2, 3, 4, 6, 8]
```

New line, box, forecast, and position drawings default to the saved width for that tool type, falling back to `1px`. The selected `strokeWidth` is saved on the drawing object and persisted with the drawing.

### Drawing Labels

Selected line-like drawings and boxes show label controls in the contextual Tool Editor in `ReplayPanel.jsx`. The label text is saved directly on the drawing, with vertical placement (`top`, `middle`, `bottom`) and horizontal placement (`left`, `center`, `right`). When only a supported tool is active, label edits become the defaults for the next drawing of that type. Selected standalone text drawings show an editable text input in the same panel. `ChartStage.jsx` renders labels and text on the overlay and keeps them attached to the drawing as the chart scrolls, zooms, or changes timeframe.

### Color

Line, forecast, box, text, and position drawings support a saved `color` value. The selected color is stored on the drawing object as `color` and persisted with the drawing. Long/short position drawings still keep fixed green and red zones for profit/loss readability.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Cancel temp drawing, close text input, clear active resize/drag, exit price pick |
| `Delete` | Delete selected drawing |
| `Backspace` | Delete selected drawing |
| `Space` | Temporarily allow chart pan behavior and cancel active drag/resize on key up |

Keyboard shortcuts are ignored while typing in inputs or editable elements.

---

## Chart Interaction Modes

| Mode | Activation | Behavior |
|------|------------|----------|
| Default | No drawing tool, no replay price pick | Native chart pan/zoom, select/move/resize drawings |
| Drawing | Line, Long, Short, Forecast, Box, or Text selected | Place a new drawing |
| Replay Price Pick | `Set Replay Price` armed | Next chart click picks replay candle and price |
| Space Pan | Hold `Space` | Native chart panning remains available |

`handleScroll` and `handleScale` are adjusted so drawing tools do not fight with native chart interaction.

Mouse-wheel behavior depends on pointer position. Over the main chart area, Lightweight Charts keeps its native time-scale wheel zoom and scroll behavior. Over the right price number panel, the custom price-scale wheel handler changes price height/range only.

---

## Error Handling

Frontend fetch errors set an error message and clear chart/drawing state for the failed load:

```javascript
setError(err.message || 'Failed to load chart');
setAllCandles([]);
setDrawings([]);
drawingsRef.current = [];
```

Backend errors are returned as JSON responses from `MarketDataController.php`.

---

## Performance Notes

| Technique | Purpose |
|-----------|---------|
| `useMemo` | Derive visible candles, volume data, current price, selected drawing, rendered drawing screen coordinates |
| `useRef` | Keep chart instances and latest drawing/tool state available to event handlers |
| `requestAnimationFrame` | Throttle overlay re-render requests during chart viewport movement |
| `ResizeObserver` | Keep chart and overlay dimensions synchronized |
| `localStorage` | Mirror drawings/tool settings for fallback and legacy migration |
| Database | Persist the user's available market symbols, drawings, reusable tool defaults, and paper backtest records |

---

## Build Verification

After backend/database changes, run:

```bash
php artisan migrate
```

After chart changes, run:

```bash
npm run build
```

Current known build warnings are unrelated to the chart changes:

| Warning | Notes |
|---------|-------|
| Browserslist data outdated | Dependency metadata warning |
| `lottie-web` uses `eval` | Warning from dependency |
| Large Vite chunks | Bundle-size warning |

---

## Summary

The chart now includes:

1. Lightweight Charts candlestick and volume rendering.
2. Database-backed market symbols through `/api/market-symbols`.
3. Laravel/exchange candle data flow through `/api/klines`.
4. Searchable Binance, OKX, Bybit, BingX, and MEXC add-symbol picker in the chart header, with Spot/Futures switching.
5. A single live/replay chart with a compact left rail and grouped flyouts for replay controls, drawing tools, paper backtest account controls, and contextual per-tool style/preset editing.
6. Componentized React structure for header, replay controls, chart stage, constants, and helpers.
7. Drawing tools for line, long/short position, forecast, box, and text on the live chart and in replay mode.
8. Per-tool drawing colors, stroke widths, labels, presets, selection, moving, and resizing.
9. Drawing persistence per user/symbol in the database, with `localStorage` fallback and migration from old per-timeframe keys.
10. Paper account retesting with market and conditional long/short entries, pending entry cancellation, close actions, equity, cash, open PnL, and recent trades.
11. Sidebar-accessible Trade Report with closed-trade win/loss table and calendar view.
12. Time/price/logical anchored drawings that stay aligned during pan/zoom and across timeframe changes.
13. Fullscreen chart mode.
