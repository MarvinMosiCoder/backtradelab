# Trading Chart Process Documentation

## Overview

The Market Analysis chart is a TradingView-style crypto chart built with React and `lightweight-charts`. It renders candlesticks and volume, supports replay mode, and includes local drawing tools for lines, boxes, and text notes.

The chart data comes from the Laravel API endpoint `/api/klines`, which fetches Bybit kline data and returns normalized candles to the frontend.

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
    GET /api/klines

  app/Http/Controllers/MarketDataController.php
    validates params
    fetches Bybit klines
    normalizes candles

External API
  Bybit API v5 market kline endpoint
```

---

## Component Files

| File | Purpose |
|------|---------|
| `resources/js/Pages/Market/Market.jsx` | Market page that renders the chart |
| `resources/js/Components/Market/TradingViewChart.jsx` | Main container for chart state, refs, data fetching, replay logic, and pointer/keyboard events |
| `resources/js/Components/Market/TradingViewChart/ChartHeader.jsx` | Symbol, timeframe, replay toggle, and price display |
| `resources/js/Components/Market/TradingViewChart/ReplayPanel.jsx` | Replay controls, drawing tool buttons, selected drawing width controls, clear/delete buttons |
| `resources/js/Components/Market/TradingViewChart/ChartStage.jsx` | Chart DOM container, SVG drawing overlay, resize handles, text input popover |
| `resources/js/Components/Market/TradingViewChart/constants.js` | Timeframes, symbol list, playback speeds, chart size, drawing colors, drawing widths |
| `resources/js/Components/Market/TradingViewChart/utils.js` | Candle normalization, coordinate helpers, drawing storage key, drawing movement helpers |
| `routes/api.php` | Defines `/api/klines` |
| `app/Http/Controllers/MarketDataController.php` | Fetches and normalizes Bybit candle data |

---

## Data Flow

### 1. Frontend Request

`TradingViewChart.jsx` fetches candles whenever `symbol` or `timeframe` changes.

```javascript
const params = new URLSearchParams({
  symbol,
  interval,
  category: 'spot',
  limit: '1000',
});

const response = await fetch(`/api/klines?${params.toString()}`, {
  headers: { Accept: 'application/json' },
});
```

The UI timeframe is mapped to the Bybit interval in `constants.js`.

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

### 2. Backend Processing

`MarketDataController.php` validates the requested symbol/category/interval, fetches candles from Bybit, deduplicates by timestamp, sorts oldest to newest, and returns normalized candle objects:

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

### 3. Frontend Normalization

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
| Reset | Exits replay mode and restores full data |
| Follow Replay | Scrolls chart to the replay edge |
| Set Replay Price | Arms the next chart click to pick replay candle/price |
| Speed buttons | Changes playback interval |

Playback speeds are defined in `constants.js`.

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

---

## Drawing Tools

Drawing tools are only shown in replay mode.

| Tool | Placement | Saved Shape |
|------|-----------|-------------|
| Line | Click start, click end | `{ type: 'line', start, end, strokeWidth }` |
| Box | Click first corner, click opposite corner | `{ type: 'rect', start, end, strokeWidth }` |
| Text | Click point, enter label | `{ type: 'text', point, text }` |

After a line or box is completed, the active tool is reset to default so the next click does not keep drawing the same tool.

Drawings are stored per symbol and timeframe:

```javascript
`replay-drawings:${symbol}:${timeframe}`
```

Storage uses `localStorage`, so drawings persist in the browser but are not saved to the backend.

---

## Drawing Coordinates

Drawings are stored in chart coordinates, not screen pixels.

| Stored Field | Meaning |
|--------------|---------|
| `time` | Candle timestamp in seconds |
| `price` | Price value on the candle series scale |

When the user clicks or drags on the chart, screen coordinates are converted to chart coordinates:

```javascript
const rawTime = chart.timeScale().coordinateToTime(x);
const rawPrice = candleSeries.coordinateToPrice(y);
```

When drawing the overlay, chart coordinates are converted back to screen coordinates:

```javascript
const x = chart.timeScale().timeToCoordinate(time);
const y = candleSeries.priceToCoordinate(price);
```

This is why drawings stay attached to candle time/price while the chart scrolls or zooms.

---

## Drawing Overlay

The chart itself is rendered by Lightweight Charts. Drawings are rendered above it with a React/SVG overlay in `ChartStage.jsx`.

| Drawing Type | Rendered As |
|--------------|-------------|
| Line | SVG `<line>` |
| Box | SVG `<rect>` |
| Text | Absolutely positioned React `<div>` |
| Resize handles | Small SVG `<rect>` handles |

The overlay is intentionally `pointer-events: none`; mouse events are handled by the chart wrapper in `TradingViewChart.jsx`.

### Overlay Refresh

Lightweight Charts can pan/zoom internally without React state changes. To keep overlay drawings aligned, `TradingViewChart.jsx` uses `overlayRenderVersion` and `scheduleOverlayRender()` to force recalculation after:

| Trigger | Why |
|---------|-----|
| Visible range changes | User pan/zoom or follow replay scroll |
| Mouse wheel/move/up/leave | Native chart viewport interaction |
| ResizeObserver events | Chart/container size changed |
| Data updates | Visible candles changed |
| Programmatic `fitContent()` / `scrollToPosition()` | Chart viewport moved through code |

---

## Selection, Moving, and Resizing

### Selection

`hitTestDrawing()` checks drawings from topmost to bottommost and returns the selected drawing ID.

| Drawing | Hit Test |
|---------|----------|
| Line | Distance to line segment |
| Box | Pointer inside rectangle bounds |
| Text | Pointer near the text label anchor |

### Moving

Dragging a selected drawing moves it by calculating:

```javascript
const deltaTime = coords.time - startMouse.time;
const deltaPrice = coords.price - startMouse.price;
```

`offsetDrawing()` applies that delta to the drawing's stored chart coordinates.

### Resizing

`hitTestResizeHandle()` checks selected drawing handles before normal drawing hit tests.

| Drawing | Handles |
|---------|---------|
| Line | Start endpoint, end endpoint |
| Box | Four corners and four side midpoints |

Box resize behavior:

| Handle | Behavior |
|--------|----------|
| Corner handles | Resize width and height together |
| Left/right side handles | Resize width only |
| Top/bottom side handles | Resize height only |

Resizing updates stored `time` and/or `price`, so resized drawings remain attached to the chart when scrolling or zooming.

### Stroke Width

Selected line and box drawings show width controls in `ReplayPanel.jsx`.

Available stroke widths:

```javascript
[1, 2, 3, 4, 6, 8]
```

The selected `strokeWidth` is saved on the drawing object and persisted in `localStorage`.

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
| Drawing | Line, Box, or Text selected | Place a new drawing |
| Replay Price Pick | `Set Replay Price` armed | Next chart click picks replay candle and price |
| Space Pan | Hold `Space` | Native chart panning remains available |

`handleScroll` and `handleScale` are adjusted so drawing tools do not fight with native chart interaction.

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
| `localStorage` | Persist drawings per symbol/timeframe without backend calls |

---

## Build Verification

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
2. Laravel/Bybit candle data flow through `/api/klines`.
3. Replay mode with follow, stepping, speed controls, and price picking.
4. Componentized React structure for header, replay controls, chart stage, constants, and helpers.
5. Drawing tools for line, box, and text.
6. Drawing persistence per symbol/timeframe in `localStorage`.
7. Time/price anchored drawings that stay aligned during pan/zoom.
8. Selection, moving, resize handles, box width/height resizing, and stroke width controls.
