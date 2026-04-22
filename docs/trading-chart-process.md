# Trading Chart Process Documentation

## Overview

This document describes the complete data flow and functionality of the TradingView-style cryptocurrency chart in the Market Analysis page. The chart uses **Lightweight Charts** library by TradingView for rendering candlestick charts with volume histograms.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Market.jsx (React Page)                                  │  │
│  │    └─ TradingViewChart.jsx (Chart Component)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP GET /api/klines
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Laravel Backend                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  routes/api.php                                           │  │
│  │    Route::get('/klines', [MarketDataController::class])   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  MarketDataController.php                                 │  │
│  │    - Fetches data from Bybit API                          │  │
│  │    - Handles pagination (multi-request)                   │  │
│  │    - Transforms and returns candle data                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS GET
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External API                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Bybit API v5                                             │  │
│  │  https://api.bybit.com/v5/market/kline                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Files

| File | Purpose |
|------|---------|
| `routes/api.php` | Defines API endpoint `/api/klines` |
| `app/Http/Controllers/MarketDataController.php` | Backend controller fetching Bybit data |
| `resources/js/Pages/Market/Market.jsx` | React page component |
| `resources/js/Components/Market/TradingViewChart.jsx` | Chart visualization component using Lightweight Charts |
| `package.json` | lightweight-charts dependency |

---

## Data Flow

### 1. Frontend Request (TradingViewChart.jsx)

```javascript
// Lines 695-768
const response = await fetch(`/api/klines?${params.toString()}`, {
  signal: controller.signal,
  headers: { Accept: 'application/json' },
});

// Parameters sent:
// - symbol: e.g., 'BTCUSDT'
// - interval: e.g., '60' (mapped from timeframe '1h')
// - category: 'spot'
// - limit: '1000'
```

**Timeframe Mapping** (Lines 10-24):
| UI Timeframe | API Interval |
|--------------|--------------|
| 1m | 1 |
| 3m | 3 |
| 5m | 5 |
| 15m | 15 |
| 30m | 30 |
| 1h | 60 |
| 2h | 120 |
| 4h | 240 |
| 6h | 360 |
| 12h | 720 |
| 1d | D |
| 1w | W |
| 1M | M |

---

### 2. Backend Processing (MarketDataController.php)

#### Input Validation (Lines 28-40)
```php
$allowedCategories = ['spot', 'linear', 'inverse'];
$allowedIntervals = ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', 'D', 'W', 'M'];
```

#### Multi-Request Pagination (Lines 44-130)
The controller implements **chunked fetching** to retrieve large datasets:

1. **Loop Strategy**: Makes multiple API requests to Bybit until `maxCandles` is reached
2. **Chunk Size**: Up to 1000 candles per request (configurable via `limit` param)
3. **Max Candles**: Up to 20,000 total (configurable via `max_candles` param)
4. **Request Limit**: Maximum 30 requests per call (hard limit)

#### Time Range Logic
```php
// Start from "now" if no end specified
$currentEnd = $end ? (int) $end : (int) floor(microtime(true) * 1000);

// After each request, move backwards in time
$oldestTs = (int) end($rows)[0];
$nextEnd = $oldestTs - 1;  // Move 1ms before oldest candle
```

#### Deduplication (Lines 101-110)
```php
$seen = [];
foreach ($rows as $row) {
    $ts = (int) ($row[0] ?? 0);
    if (isset($seen[$ts])) continue;  // Skip duplicates
    $seen[$ts] = true;
    $allRows[] = $row;
}
```

#### Data Transformation (Lines 132-152)
```php
// Sort oldest → newest
usort($allRows, fn($a, $b) => (int)$a[0] <=> (int)$b[0]);

// Transform Bybit format to frontend format
$candles = array_map(fn($item) => [
    'time'   => ((int) $item[0]) / 1000,  // seconds timestamp
    'open'   => (float) $item[1],
    'high'   => (float) $item[2],
    'low'    => (float) $item[3],
    'close'  => (float) $item[4],
    'volume' => (float) $item[5],
], $allRows);
```

---

### 3. Frontend Data Processing (TradingViewChart.jsx)

#### Candle Storage (Line 236)
```javascript
const [allCandles, setAllCandles] = useState([]);
```

#### Visible Data Calculation (Lines 298-301)
```javascript
const visibleCandles = useMemo(() => {
  if (!replayMode) return allCandles;
  return allCandles.slice(0, replayIndex + 1);
}, [allCandles, replayMode, replayIndex]);
```

#### Current Price Display (Lines 248, 807-812)
```javascript
const [currentLivePrice, setCurrentLivePrice] = useState(null);

// Update selected price based on replay mode
useEffect(() => {
  if (replayMode && allCandles[replayIndex]) {
    setSelectedPrice(allCandles[replayIndex].close);
  } else if (!replayMode) {
    setSelectedPrice(currentLivePrice);
  }
}, [replayMode, replayIndex, allCandles, currentLivePrice]);
```

---

## Chart Rendering

### Lightweight Charts Configuration (Lines 418-463)

#### Chart Initialization
```javascript
const chart = createChart(chartContainerRef.current, {
  width: chartSize.width,
  height: chartSize.height,
  layout: {
    background: { color: '#081631' },
    textColor: '#d1d4dc',
  },
  grid: {
    vertLines: { color: '#12233f' },
    horzLines: { color: '#12233f' },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
  },
  rightPriceScale: {
    borderColor: '#2b3b59',
    scaleMargins: {
      top: 0.1,
      bottom: 0.2,
    },
  },
  timeScale: {
    borderColor: '#2b3b59',
    rightOffset: 8,
    timeVisible: true,
    secondsVisible: false,
  },
  handleScroll: true,
  handleScale: true,
});
```

#### Candlestick Series (Lines 435-444)
```javascript
const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: '#26a69a',
  downColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
  borderVisible: true,
  priceLineVisible: false,
  lastValueVisible: true,
});
```

#### Volume Series (Lines 446-455)
```javascript
const volumeSeries = chart.addSeries(HistogramSeries, {
  priceFormat: { type: 'volume' },
  priceScaleId: '',
  priceLineVisible: false,
  lastValueVisible: false,
});

volumeSeries.priceScale().applyOptions({
  scaleMargins: {
    top: 0.8,
    bottom: 0,
  },
});
```

#### Chart Data Updates (Lines 486-512)
```javascript
candleSeries.setData(
  visibleCandles.map((c) => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }))
);

volumeSeries.setData(
  visibleCandles.map((c) => ({
    time: c.time,
    value: c.volume,
    color: c.close >= c.open ? '#26a69a80' : '#ef535080',
  }))
);
```

#### Zoom/Pan Controls (Lines 514-521)

| Setting | Value | Purpose |
|---------|-------|---------|
| `handleScroll` | `true` (default) | Enable pan/zoom |
| `handleScale` | `true` (default) | Enable scroll zoom |
| Dynamic disable | When drawing or seek mode | Prevents interference |

**Navigation Modes**:

| Mode | Activation | Behavior |
|------|------------|----------|
| **Nav Mode** (default) | Tool: Cursor, Seek: OFF | Chart pan/zoom enabled, select drawings |
| **Drawing Mode** | Tool: Line/Box/Text | Place drawings, pan/zoom disabled |
| **Seek Mode** | Replay + Seek: ON | Click to jump replay position |

**User Interactions**:
- **Mouse wheel**: Zoom in/out on chart
- **Drag**: Pan left/right through time
- **Click chart**: Select drawings (Nav Mode) or seek (Seek Mode)
- **Dynamic viewport**: Chart zooms and pans based on user interaction

---

## Interactive Features

### 1. Drawing Tools (Lines 976-1032)

| Tool | Action | Storage |
|------|--------|---------|
| Line | Click 2 points | localStorage |
| Box (Rect) | Click 2 corners | localStorage |
| Text | Click + type label | localStorage |

**Storage Key Format** (Line 67):
```javascript
`replay-drawings:${symbol}:${timeframe}`
```

**Drawing Types**:
- `line`: Trend line between two price/time points
- `rect`: Rectangle box with fill and stroke
- `text`: Text label at a single point

### 2. Replay Mode (Lines 823-866)

```javascript
// Start replay from ~30% of data
const startIndex = Math.max(0, Math.floor(allCandles.length * 0.3));
setReplayIndex(startIndex);
setReplayMode(true);

// Playback loop (Lines 773-798)
replayIntervalRef.current = setInterval(() => {
  setReplayIndex((prev) => {
    if (prev >= allCandles.length - 1) {
      setIsPlaying(false);
      return prev;
    }
    return prev + 1;
  });
}, playbackSpeed);
```

**Playback Speeds**:
| Speed | Interval |
|-------|----------|
| 0.25x | 3000ms |
| 0.5x | 2000ms |
| 1x | 1000ms |
| 2x | 500ms |
| 4x | 250ms |
| 10x | 100ms |

### 3. Seek Mode (Lines 561-577)
When enabled in replay mode, clicking on chart jumps to that candle position. Click detection uses `hitTestDrawing()` to check if clicking on existing drawings first.

### 4. Price Target Line (Lines 523-539)
A dashed price line is automatically shown at the current candle's close price using `candleSeries.createPriceLine()`.

---

## Event Handling

### Chart Events (Lines 541-688)

| Event | Purpose |
|-------|---------|
| `subscribeClick` | Select drawings, place drawing points, seek in replay |
| `subscribeCrosshairMove` | Update draft drawing, hover detection, price display |

**Event Binding** (Lines 670-686):
Events are attached to the Lightweight Charts instance via `chart.subscribeClick()` and `chart.subscribeCrosshairMove()`. The `useEffect` dependency array ensures handlers have access to the latest state when tools are selected.

**Coordinate Conversion** (Lines 336-368):
```javascript
const screenPointToLogicalPoint = (x, y) => {
  const rawTime = chart.timeScale().coordinateToTime(x);
  const rawPrice = candleSeries.coordinateToPrice(y);
  // Maps screen coordinates to candle time/price
};
```

### Keyboard Shortcuts (Lines 818-832)
| Key | Action |
|-----|--------|
| `Escape` | Cancel drawing tool / close text input |
| `Delete` / `Backspace` | Remove selected drawing |

---

## Error Handling

### Backend (Lines 58-90, 158-165)
```php
// HTTP error
if (!$response->successful()) {
  return response()->json(['success' => false, ...], $response->status());
}

// Bybit API error
if (($json['retCode'] ?? null) !== 0) {
  return response()->json(['success' => false, ...], 400);
}

// Server exception
catch (\Throwable $e) {
  return response()->json(['error' => $e->getMessage()], 500);
}
```

### Frontend (Lines 700-778)
```javascript
try {
  const response = await fetch(...);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const result = await response.json();
  if (!result.success) throw new Error(result.message);
  
  if (!candles.length) throw new Error('No candle data returned');
} catch (err) {
  if (err.name !== 'AbortError') {
    setError(err.message);
  }
}
```

---

## Performance Optimizations

1. **React Memoization**: `useMemo` for visible data, rendered drawings, price stats
2. **Ref-based State**: `useRef` for drawing tools, symbol/timeframe (avoids re-renders in event handlers)
3. **Debounced Storage**: Drawings saved to localStorage on update
4. **AbortController**: Cancels in-flight requests on unmount or symbol/timeframe change
5. **ResizeObserver**: Dynamic chart sizing based on container
6. **Conditional Rendering**: `visibleCandles` computed from replay mode state

---

## API Response Format

### Request
```
GET /api/klines?symbol=BTCUSDT&interval=60&category=spot&limit=1000
```

### Response
```json
{
  "success": true,
  "count": 500,
  "candles": [
    {
      "time": 1672531200,
      "open": 16500.50,
      "high": 16550.00,
      "low": 16480.00,
      "close": 16520.75,
      "volume": 1250.45
    }
  ]
}
```

---

## Summary

The trading chart system implements a complete candlestick visualization with:

1. **Backend**: Laravel controller fetching and aggregating data from Bybit API with intelligent pagination
2. **Frontend**: React component using Lightweight Charts for rendering with TradingView-style features
3. **Features**: Replay mode, drawing tools (line, box, text), price display, seek functionality, multi-timeframe support
4. **Storage**: Drawings persisted per symbol/timeframe in localStorage
5. **Performance**: Optimized with memoization, refs for event handlers, and efficient state management
