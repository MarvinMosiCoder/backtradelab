import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';
import { useTheme } from '../../Context/ThemeContext';
import ChartHeader from './TradingViewChart/ChartHeader';
import ChartStage from './TradingViewChart/ChartStage';
import ReplayPanel from './TradingViewChart/ReplayPanel';
import {
  CHART_HEIGHT,
  DRAWING_COLOR,
  INTERVAL_MAP,
  TIMEFRAME_SECONDS,
  TIMEFRAMES,
} from './TradingViewChart/constants';
import {
  buildLegacyStorageKey,
  buildStorageKey,
  distanceToSegment,
  estimateDrawingLogicalFromTime,
  estimateTimeFromLogical,
  findNearestCandleIndex,
  isHorizontalRayDrawing,
  isLineLikeDrawing,
  isPathDrawing,
  isPositionDrawing,
  isTwoPointDrawing,
  normalizeApiCandles,
  normalizeVisibleRect,
  offsetDrawing,
} from './TradingViewChart/utils';

const DEFAULT_CANDLE_COLORS = {
  up: '#26a69a',
  down: '#ef5350',
};
const DEFAULT_CANDLE_SIZE = 8;
const MIN_CANDLE_SIZE = 3;
const MAX_CANDLE_SIZE = 24;

const MAX_DRAWING_UNDO_STEPS = 25;

const CHART_THEMES = {
  dark: {
    mode: 'dark',
    background: '#151617',
    panel: '#242627',
    panelControl: '#151617',
    text: '#d1d4dc',
    grid: 'rgba(148, 163, 184, 0.05)',
    border: '#31363F',
    overlay: 'rgba(21, 22, 23, 0.72)',
    selectedPriceLine: '#e5e7eb',
  },
  light: {
    mode: 'light',
    background: '#ffffff',
    panel: '#ffffff',
    panelControl: '#f8fafc',
    text: '#334155',
    grid: 'rgba(100, 116, 139, 0.08)',
    border: '#cbd5e1',
    overlay: 'rgba(255, 255, 255, 0.76)',
    selectedPriceLine: '#334155',
  },
};

function resolveChartTheme(adminTheme) {
  return adminTheme === 'bg-skin-black' ? CHART_THEMES.dark : CHART_THEMES.light;
}

function ChartDotsLoader({ isDark }) {
  const mutedDotClass = isDark ? 'bg-gray-500' : 'bg-slate-400';
  const brightDotClass = isDark ? 'bg-gray-200' : 'bg-slate-700';

  return (
    <div className="flex items-center gap-2" aria-label="Loading" role="status">
      <span className={`h-2 w-2 rounded-full ${brightDotClass} chart-dot-loader chart-dot-loader-1`} />
      <span className={`h-2 w-2 rounded-full ${mutedDotClass} chart-dot-loader chart-dot-loader-2`} />
      <span className={`h-2 w-2 rounded-full ${brightDotClass} chart-dot-loader chart-dot-loader-3`} />
    </div>
  );
}

function cloneDrawingsForHistory(drawings) {
  if (typeof structuredClone === 'function') {
    return structuredClone(drawings);
  }

  return JSON.parse(JSON.stringify(drawings));
}

const TWO_POINT_TOOL_TYPES = [
  'line',
  'horizontal-ray',
  'fib-retracement',
  'fib-extension',
  'rect',
  'long-position',
  'short-position',
  'forecast',
  'measure',
];

const PATH_TOOL_TYPE = 'path';

const PRESET_ENABLED_TOOL_TYPES = [
  'line',
  'horizontal-ray',
  'path',
  'fib-retracement',
  'fib-extension',
  'forecast',
  'measure',
  'rect',
  'text',
  'long-position',
  'short-position',
];

const FIB_RETRACEMENT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_EXTENSION_LEVELS = [
  0,
  0.236,
  0.382,
  0.5,
  0.618,
  0.786,
  1,
  1.272,
  1.414,
  1.618,
  2,
  2.272,
  2.414,
  2.618,
  3.618,
  4.236,
];

const PREFETCH_TIMEFRAME_MAP = {
  '1m': ['3m', '5m'],
  '3m': ['1m', '5m', '15m'],
  '5m': ['3m', '15m', '30m'],
  '15m': ['5m', '30m', '1h'],
  '30m': ['15m', '1h', '2h'],
  '1h': ['30m', '2h', '4h'],
  '2h': ['1h', '4h', '6h'],
  '4h': ['1h', '2h', '6h', '12h'],
  '6h': ['4h', '12h', '1d'],
  '12h': ['6h', '1d'],
  '1d': ['12h', '1w'],
  '1w': ['1d', '1M'],
  '1M': ['1w'],
};

const CANDLE_CACHE_LIMIT = 18;

function buildCandleCacheKey({ exchange, marketCategory, symbol, timeframe, end = 'latest' }) {
  return [
    exchange,
    marketCategory,
    symbol,
    timeframe,
    end,
  ].join(':');
}

function resolvePositionProgressPoint(drawing, stop, candles) {
  if (!Array.isArray(candles) || !candles.length) return null;

  const entryPrice = Number(drawing.start?.price);
  const targetPrice = Number(drawing.end?.price);
  const stopPrice = Number(stop?.price);
  const isLong = drawing.type === 'long-position';

  if (
    !Number.isFinite(entryPrice)
    || !Number.isFinite(targetPrice)
    || !Number.isFinite(stopPrice)
  ) {
    return null;
  }

  const entryTime = Number(drawing.start?.time);
  const entryLogical = Number(drawing.start?.logical);
  const startedCandles = candles.filter((candle) => {
    if (Number.isFinite(entryLogical) && Number.isFinite(Number(candle.logical))) {
      return Number(candle.logical) >= entryLogical;
    }

    if (Number.isFinite(entryTime)) {
      return Number(candle.time) >= entryTime;
    }

    return true;
  });

  if (!startedCandles.length) return null;

  let latestProgressPoint = null;

  for (const candle of startedCandles) {
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);

    if (!Number.isFinite(high) || !Number.isFinite(low)) continue;

    if (isLong) {
      if (low <= stopPrice) {
        return { time: candle.time, logical: candle.logical, price: stopPrice };
      }

      if (high >= targetPrice) {
        return { time: candle.time, logical: candle.logical, price: targetPrice };
      }
    } else {
      if (high >= stopPrice) {
        return { time: candle.time, logical: candle.logical, price: stopPrice };
      }

      if (low <= targetPrice) {
        return { time: candle.time, logical: candle.logical, price: targetPrice };
      }
    }

    if (Number.isFinite(close)) {
      latestProgressPoint = {
        time: candle.time,
        logical: candle.logical,
        price: close,
      };
    }
  }

  return latestProgressPoint;
}

function getRenderedFibonacciLevels(drawing, overlayWidth) {
  const levels = drawing.type === 'fib-extension' ? FIB_EXTENSION_LEVELS : FIB_RETRACEMENT_LEVELS;
  const { p1, p2, p3 } = drawing.screen;
  const anchorPoint = drawing.type === 'fib-extension' ? (p3 ?? p2) : p1;
  const points = drawing.type === 'fib-extension' && p3 ? [p1, p2, p3] : [p1, p2];
  const leftX = Math.max(0, Math.min(...points.map((point) => point.x)));
  const rightX = Math.max(...points.map((point) => point.x), overlayWidth);
  const yDelta = p2.y - p1.y;

  return levels.map((level) => ({
    x1: leftX,
    x2: rightX,
    y: anchorPoint.y + (yDelta * level),
  }));
}

function getPositiveNumber(value) {
  if (value === null || value === undefined || value === '') return null;

  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatOverlayPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '---';

  return number.toLocaleString(undefined, {
    minimumFractionDigits: number >= 100 ? 2 : 4,
    maximumFractionDigits: number >= 100 ? 2 : 6,
  });
}

function getMaxBacktestMarginForCash(cashBalance, leverage = 1, feeRate = 0.0004) {
  const cash = Number(cashBalance);
  const leverageValue = Number(leverage);
  const feeRateValue = Number(feeRate);

  if (!Number.isFinite(cash) || cash <= 0 || !Number.isFinite(leverageValue) || leverageValue <= 0) {
    return null;
  }

  return cash / (1 + (leverageValue * (Number.isFinite(feeRateValue) ? feeRateValue : 0.0004)));
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
  });
}

async function captureChartSnapshot(wrapper, backgroundColor = CHART_THEMES.dark.background) {
  if (!wrapper || typeof window === 'undefined') return null;

  const bounds = wrapper.getBoundingClientRect();
  const width = Math.max(Math.round(bounds.width), 1);
  const height = Math.max(Math.round(bounds.height), 1);
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const output = document.createElement('canvas');
  const context = output.getContext('2d');

  if (!context) return null;

  output.width = Math.round(width * scale);
  output.height = Math.round(height * scale);
  output.style.width = `${width}px`;
  output.style.height = `${height}px`;
  context.scale(scale, scale);
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);

  const canvases = Array.from(wrapper.querySelectorAll('canvas'));
  canvases.forEach((canvas) => {
    const rect = canvas.getBoundingClientRect();
    context.drawImage(canvas, rect.left - bounds.left, rect.top - bounds.top, rect.width, rect.height);
  });

  const svgs = Array.from(wrapper.querySelectorAll('svg'));
  for (const svg of svgs) {
    const rect = svg.getBoundingClientRect();
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      const image = await loadImageFromUrl(url);
      context.drawImage(image, rect.left - bounds.left, rect.top - bounds.top, rect.width, rect.height);
    } catch {
      // Snapshot should still save the chart canvas if SVG overlay serialization fails.
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return canvasToBlob(output);
}

export default function TradingViewReplayChart({
  initialSymbol = 'BTCUSDT',
  initialExchange = 'bingx',
  initialMarketCategory = 'linear',
  initialTimeframe = '15m',
  onBacktestAccountChange = null,
}) {
  const { theme: adminTheme } = useTheme();
  const chartTheme = useMemo(() => resolveChartTheme(adminTheme), [adminTheme]);
  const wrapperRef = useRef(null);
  const fullscreenRef = useRef(null);
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const visibleCandlesRef = useRef([]);
  const resizeObserverRef = useRef(null);
  const replayTimerRef = useRef(null);
  const isProgrammaticRangeChangeRef = useRef(false);
  const selectedPriceLineRef = useRef(null);
  const selectedReplayPriceRef = useRef(null);
  const replayModeRef = useRef(false);
  const symbolRef = useRef(initialSymbol);
  const backtestAccountRef = useRef(null);
  const fetchRequestIdRef = useRef(0);
  const candleCacheRef = useRef(new Map());
  const candleFetchAbortRef = useRef(null);
  const isSpacePressedRef = useRef(false);
  const toolRef = useRef(null);
  const drawingColorRef = useRef(DRAWING_COLOR);
  const tempDrawingRef = useRef(null);
  const drawingsRef = useRef([]);
  const selectedDrawingIdRef = useRef(null);
  const dragDrawingRef = useRef(null);
  const resizeDrawingRef = useRef(null);
  const dragBacktestOrderRef = useRef(null);
  const isReplayPricePickActiveRef = useRef(false);
  const overlayRenderFrameRef = useRef(null);
  const autoClosedPositionRef = useRef(new Set());
  const autoTriggeredPositionRef = useRef(new Set());
  const pendingVisibleLogicalRangeRef = useRef(null);
  const quickOpenBacktestPositionRef = useRef(null);
  const cancelBacktestPositionRef = useRef(null);
  const triggerBacktestPositionRef = useRef(null);
  const closeBacktestPositionRef = useRef(null);
  const drawingUndoStackRef = useRef([]);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [exchange, setExchange] = useState(initialExchange);
  const [marketCategory, setMarketCategory] = useState(initialMarketCategory);
  const [candleColors, setCandleColors] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_CANDLE_COLORS;
    }

    try {
      const stored = JSON.parse(localStorage.getItem('market-chart-candle-colors') || '{}');

      return {
        up: stored.up || DEFAULT_CANDLE_COLORS.up,
        down: stored.down || DEFAULT_CANDLE_COLORS.down,
      };
    } catch {
      return DEFAULT_CANDLE_COLORS;
    }
  });
  const [candleSize, setCandleSize] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_CANDLE_SIZE;
    }

    const stored = Number(localStorage.getItem('market-chart-candle-size'));

    return Number.isFinite(stored)
      ? Math.min(Math.max(stored, MIN_CANDLE_SIZE), MAX_CANDLE_SIZE)
      : DEFAULT_CANDLE_SIZE;
  });
  const [symbols, setSymbols] = useState([]);
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [symbolError, setSymbolError] = useState('');
  const [isSavingSymbol, setIsSavingSymbol] = useState(false);
  const [isLoadingAvailableSymbols, setIsLoadingAvailableSymbols] = useState(false);
  const [timeframe, setTimeframe] = useState(initialTimeframe);

  const [allCandles, setAllCandles] = useState([]);
  const [loadedTimeframe, setLoadedTimeframe] = useState(initialTimeframe);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [followReplay, setFollowReplay] = useState(true);

  const [selectedReplayPrice, setSelectedReplayPrice] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isReplayPricePickActive, setIsReplayPricePickActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [tool, setTool] = useState(null);
  const [drawingColor, setDrawingColor] = useState(DRAWING_COLOR);
  const [drawings, setDrawings] = useState([]);
  const [tempDrawing, setTempDrawing] = useState(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
  const [toolSettings, setToolSettings] = useState({});
  const [backtestAccount, setBacktestAccount] = useState(null);
  const [isBacktestLoading, setIsBacktestLoading] = useState(false);
  const [backtestError, setBacktestError] = useState('');
  const [backtestOrderDraft, setBacktestOrderDraft] = useState(null);
  const [orderLineDraftPatch, setOrderLineDraftPatch] = useState(null);
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: CHART_HEIGHT });
  const [overlayRenderVersion, setOverlayRenderVersion] = useState(0);

  const [textInput, setTextInput] = useState(null);
  const [textDraft, setTextDraft] = useState('');

  const scheduleOverlayRender = useCallback(() => {
    if (overlayRenderFrameRef.current) return;

    overlayRenderFrameRef.current = requestAnimationFrame(() => {
      overlayRenderFrameRef.current = null;
      setOverlayRenderVersion((version) => version + 1);
    });
  }, []);

  const visibleCandles = useMemo(() => {
    if (!replayMode) return allCandles;
    return allCandles.slice(0, replayIndex + 1);
  }, [allCandles, replayMode, replayIndex]);

  const visibleVolume = useMemo(() => {
    return visibleCandles.map((c) => ({
      time: c.time,
      value: c.volume,
      color: `${c.close >= c.open ? candleColors.up : candleColors.down}88`,
    }));
  }, [candleColors.down, candleColors.up, visibleCandles]);

  useEffect(() => {
    visibleCandlesRef.current = visibleCandles;
  }, [visibleCandles]);

  useEffect(() => {
    symbolRef.current = symbol;
  }, [symbol]);

  useEffect(() => {
    backtestAccountRef.current = backtestAccount;
  }, [backtestAccount]);

  const currentPrice = useMemo(() => {
    if (!visibleCandles.length) return null;
    return visibleCandles[visibleCandles.length - 1].close;
  }, [visibleCandles]);

  const executionCandle = replayMode ? allCandles[replayIndex] : null;
  const executionPrice = executionCandle?.close ?? currentPrice;
  const executionTime = executionCandle?.time ?? null;
  const selectedDrawing = useMemo(() => {
    return drawings.find((drawing) => drawing.id === selectedDrawingId) ?? null;
  }, [drawings, selectedDrawingId]);

  useEffect(() => {
    if (backtestAccount && typeof onBacktestAccountChange === 'function') {
      onBacktestAccountChange(backtestAccount);
    }
  }, [backtestAccount, onBacktestAccountChange]);

  useEffect(() => {
    isSpacePressedRef.current = isSpacePressed;
  }, [isSpacePressed]);

  useEffect(() => {
    replayModeRef.current = replayMode;
  }, [replayMode]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    drawingColorRef.current = drawingColor;
  }, [drawingColor]);

  useEffect(() => {
    tempDrawingRef.current = tempDrawing;
  }, [tempDrawing]);

  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  useEffect(() => {
    selectedDrawingIdRef.current = selectedDrawingId;
  }, [selectedDrawingId]);

  useEffect(() => {
    isReplayPricePickActiveRef.current = isReplayPricePickActive;
  }, [isReplayPricePickActive]);

  useEffect(() => {
    selectedReplayPriceRef.current = selectedReplayPrice;
  }, [selectedReplayPrice]);

  useEffect(() => {
    localStorage.setItem('market-chart-candle-colors', JSON.stringify(candleColors));
  }, [candleColors]);

  useEffect(() => {
    localStorage.setItem('market-chart-candle-size', String(candleSize));
  }, [candleSize]);

  useEffect(() => {
    if (!isFullscreen || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    scheduleOverlayRender();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen, scheduleOverlayRender]);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const updateSize = () => {
      const rect = wrapperRef.current.getBoundingClientRect();
      setOverlaySize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height || CHART_HEIGHT),
      });
      scheduleOverlayRender();
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapperRef.current);

    return () => observer.disconnect();
  }, [scheduleOverlayRender]);

  const loadMarketSymbols = useCallback(async () => {
    try {
      const response = await fetch('/api/market-symbols', {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const nextSymbols = Array.isArray(result.symbols) ? result.symbols : [];

      setSymbols(nextSymbols);
      if (nextSymbols.length) {
        const currentExists = nextSymbols.some((item) => (
          item.symbol === symbol
          && (item.exchange ?? 'bybit') === exchange
          && (item.category ?? 'spot') === marketCategory
        ));
        const fallbackForCategory = nextSymbols.find((item) => (item.category ?? 'spot') === marketCategory);
        const fallbackSymbol = currentExists
          ? null
          : fallbackForCategory;

        if (fallbackSymbol) {
          setSymbol(fallbackSymbol.symbol);
          setExchange(fallbackSymbol.exchange ?? 'bybit');
        }
      }
      setSymbolError('');
    } catch (err) {
      setSymbolError(err.message || 'Failed to load symbols');
    }
  }, [exchange, marketCategory, symbol]);

  const loadBacktestAccount = useCallback(async (price = null) => {
    setIsBacktestLoading(true);
    setBacktestError('');
    const accountPrice = Number(price);

    try {
      const response = await axios.get('/market-backtest/account', {
        params: {
          symbol,
          exchange,
          category: marketCategory,
          timeframe,
          ...(Number.isFinite(accountPrice) && accountPrice > 0 ? { price: accountPrice } : {}),
        },
        headers: { Accept: 'application/json' },
      });

      setBacktestAccount(response.data?.account ?? null);
    } catch (err) {
      setBacktestError(err.response?.data?.message ?? err.message ?? 'Failed to load backtest account');
    } finally {
      setIsBacktestLoading(false);
    }
  }, [exchange, marketCategory, symbol, timeframe]);

  useEffect(() => {
    if (!replayMode && currentPrice != null) {
      loadBacktestAccount(currentPrice);
    }
  }, [currentPrice, loadBacktestAccount, replayMode, symbol]);

  useEffect(() => {
    if (replayMode) {
      loadBacktestAccount();
    }
  }, [loadBacktestAccount, replayMode, symbol]);

  useEffect(() => {
    loadMarketSymbols();
  }, [loadMarketSymbols]);

  useEffect(() => {
    let cancelled = false;

    const loadAvailableSymbols = async () => {
      setIsLoadingAvailableSymbols(true);

      try {
        const response = await fetch(`/api/market-symbol-options?category=${marketCategory}`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to load available symbols');
        }

        if (!cancelled) {
          const nextSymbols = Array.isArray(result.symbols) ? result.symbols : [];
          setAvailableSymbols(nextSymbols);
        }
      } catch (err) {
        if (!cancelled) {
          setSymbolError(err.message || 'Failed to load available symbols');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAvailableSymbols(false);
        }
      }
    };

    loadAvailableSymbols();

    return () => {
      cancelled = true;
    };
  }, [marketCategory]);

  const buildToolSettingsFromDrawing = useCallback((drawing) => {
    if (!drawing?.type) return {};

    const settings = {};

    if (drawing.color) {
      settings.color = drawing.color;
    }

    if (Number.isFinite(Number(drawing.strokeWidth))) {
      settings.strokeWidth = Number(drawing.strokeWidth);
    }

    if (drawing.lineStyle) {
      settings.lineStyle = drawing.lineStyle;
    }

    if (typeof drawing.textBold === 'boolean') {
      settings.textBold = drawing.textBold;
    }

    if (typeof drawing.textItalic === 'boolean') {
      settings.textItalic = drawing.textItalic;
    }

    if (typeof drawing.labelText === 'string') {
      settings.labelText = drawing.labelText;
    }

    if (drawing.type === 'text' && typeof drawing.text === 'string') {
      settings.labelText = drawing.text;
    }

    if (drawing.labelVertical) {
      settings.labelVertical = drawing.labelVertical;
    }

    if (drawing.labelHorizontal) {
      settings.labelHorizontal = drawing.labelHorizontal;
    }

    return settings;
  }, []);

  const persistToolSettings = useCallback((nextSettings) => {
    try {
      localStorage.setItem('market-tool-settings', JSON.stringify(nextSettings));
    } catch {}

    axios.put('/market-tool-settings', {
      settings: nextSettings,
    }).catch(() => {});
  }, []);

  const saveToolSettingsForType = useCallback((type, updates) => {
    if (!type || !updates || !Object.keys(updates).length) return;

    setToolSettings((currentSettings) => {
      const nextSettings = {
        ...currentSettings,
        [type]: {
          ...(currentSettings[type] ?? {}),
          ...updates,
        },
      };

      persistToolSettings(nextSettings);
      return nextSettings;
    });
  }, [persistToolSettings]);

  const getToolSettingsForType = useCallback((type) => {
    return toolSettings[type] ?? {};
  }, [toolSettings]);

  const getToolPresetsForType = useCallback((type) => {
    return Array.isArray(toolSettings.presets?.[type])
      ? toolSettings.presets[type]
      : [];
  }, [toolSettings]);

  const saveToolPreset = useCallback((type, preset) => {
    if (!type || !preset?.name || !preset?.settings) return;

    setToolSettings((currentSettings) => {
      const currentPresets = Array.isArray(currentSettings.presets?.[type])
        ? currentSettings.presets[type]
        : [];
      const normalizedName = preset.name.trim();
      const nextPreset = {
        id: preset.id ?? `${type}-${Date.now()}`,
        name: normalizedName,
        settings: preset.settings,
      };
      const nextTypePresets = [
        nextPreset,
        ...currentPresets.filter((item) => item.name.toLowerCase() !== normalizedName.toLowerCase()),
      ].slice(0, 20);
      const nextSettings = {
        ...currentSettings,
        presets: {
          ...(currentSettings.presets ?? {}),
          [type]: nextTypePresets,
        },
      };

      persistToolSettings(nextSettings);
      return nextSettings;
    });
  }, [persistToolSettings]);

  const deleteToolPreset = useCallback((type, preset) => {
    if (!type || !preset) return;

    setToolSettings((currentSettings) => {
      const currentPresets = Array.isArray(currentSettings.presets?.[type])
        ? currentSettings.presets[type]
        : [];
      const presetId = preset.id;
      const presetName = preset.name;
      const nextTypePresets = currentPresets.filter((item) => {
        if (presetId) return item.id !== presetId;

        return String(item.name ?? '').toLowerCase() !== String(presetName ?? '').toLowerCase();
      });
      const nextSettings = {
        ...currentSettings,
        presets: {
          ...(currentSettings.presets ?? {}),
          [type]: nextTypePresets,
        },
      };

      persistToolSettings(nextSettings);
      return nextSettings;
    });
  }, [persistToolSettings]);


  useEffect(() => {
    let cancelled = false;

    const loadToolSettings = async () => {
      let localSettings = {};

      try {
        const parsed = JSON.parse(localStorage.getItem('market-tool-settings') ?? '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          localSettings = parsed;
        }
      } catch {}

      try {
        const response = await axios.get('/market-tool-settings', {
          headers: { Accept: 'application/json' },
        });
        const serverSettings = response.data?.settings;
        const nextSettings =
          serverSettings && typeof serverSettings === 'object' && !Array.isArray(serverSettings)
            ? serverSettings
            : localSettings;

        if (!cancelled) {
          setToolSettings(nextSettings);
          try {
            localStorage.setItem('market-tool-settings', JSON.stringify(nextSettings));
          } catch {}
        }
      } catch {
        if (!cancelled) {
          setToolSettings(localSettings);
        }
      }
    };

    loadToolSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadLocalDrawings = useCallback(() => {
    const drawingMap = new Map();

    const addStoredDrawings = (raw) => {
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      parsed.forEach((drawing) => {
        if (!drawing?.id) return;
        if (!drawingMap.has(drawing.id)) {
          drawingMap.set(drawing.id, drawing);
        }
      });
    };

    const sharedKey = buildStorageKey(symbol, exchange, marketCategory);
    addStoredDrawings(localStorage.getItem(sharedKey));

    if (marketCategory === 'spot') {
      addStoredDrawings(localStorage.getItem(`replay-drawings:${symbol}`));

      TIMEFRAMES.forEach(({ value }) => {
        addStoredDrawings(localStorage.getItem(buildLegacyStorageKey(symbol, value)));
      });
    }

    const storedDrawings = Array.from(drawingMap.values());

    if (storedDrawings.length) {
      localStorage.setItem(sharedKey, JSON.stringify(storedDrawings));
    }

    return storedDrawings;
  }, [exchange, marketCategory, symbol]);

  const persistDrawingsToServer = useCallback(async (nextDrawings, activeSymbol = symbol) => {
    await axios.put('/market-drawings', {
      symbol: activeSymbol,
      exchange,
      category: marketCategory,
      drawings: nextDrawings,
    });
  }, [exchange, marketCategory, symbol]);

  const saveDrawings = useCallback((nextDrawings) => {
    setDrawings(nextDrawings);
    drawingsRef.current = nextDrawings;
    try {
      localStorage.setItem(buildStorageKey(symbol, exchange, marketCategory), JSON.stringify(nextDrawings));
    } catch {}

    persistDrawingsToServer(nextDrawings).catch(() => {});
  }, [exchange, marketCategory, persistDrawingsToServer, symbol]);

  const getDrawingScope = useCallback(() => {
    return `${exchange}:${marketCategory}:${symbol}`;
  }, [exchange, marketCategory, symbol]);

  const pushDrawingUndoSnapshot = useCallback((selectedId = selectedDrawingIdRef.current) => {
    if (!drawingsRef.current.length) return;

    drawingUndoStackRef.current = [
      ...drawingUndoStackRef.current,
      {
        scope: getDrawingScope(),
        drawings: cloneDrawingsForHistory(drawingsRef.current),
        selectedDrawingId: selectedId,
      },
    ].slice(-MAX_DRAWING_UNDO_STEPS);
  }, [getDrawingScope]);

  const handleUndoDrawings = useCallback(() => {
    const currentScope = getDrawingScope();
    const stack = drawingUndoStackRef.current;
    let snapshotIndex = -1;

    for (let index = stack.length - 1; index >= 0; index -= 1) {
      if (stack[index].scope === currentScope) {
        snapshotIndex = index;
        break;
      }
    }

    if (snapshotIndex === -1) return false;

    const [snapshot] = stack.splice(snapshotIndex, 1);
    drawingUndoStackRef.current = stack;

    saveDrawings(snapshot.drawings);
    const restoredSelectedId = snapshot.drawings.some((drawing) => drawing.id === snapshot.selectedDrawingId)
      ? snapshot.selectedDrawingId
      : null;

    setSelectedDrawingId(restoredSelectedId);
    setTempDrawing(null);
    setTextInput(null);
    setTool(null);

    return true;
  }, [getDrawingScope, saveDrawings]);

  useEffect(() => {
    drawingUndoStackRef.current = [];
  }, [exchange, marketCategory, symbol]);

  const appendDrawing = useCallback((drawing) => {
    const next = [...drawingsRef.current, drawing];
    saveToolSettingsForType(drawing.type, buildToolSettingsFromDrawing(drawing));
    saveDrawings(next);
    setSelectedDrawingId(drawing.id);
  }, [buildToolSettingsFromDrawing, saveDrawings, saveToolSettingsForType]);

  const loadStoredDrawings = useCallback(async () => {
    const localDrawings = loadLocalDrawings();

    try {
      const response = await axios.get('/market-drawings', {
        params: { symbol, exchange, category: marketCategory },
        headers: { Accept: 'application/json' },
      });

      const serverDrawings = Array.isArray(response.data?.drawings)
        ? response.data.drawings
        : [];
      const hasServerRecord = Boolean(response.data?.exists);
      const nextDrawings = hasServerRecord ? serverDrawings : localDrawings;

      if (!hasServerRecord && localDrawings.length) {
        persistDrawingsToServer(localDrawings).catch(() => {});
      }

      try {
        localStorage.setItem(buildStorageKey(symbol, exchange, marketCategory), JSON.stringify(nextDrawings));
      } catch {}

      return nextDrawings;
    } catch {
      return localDrawings;
    }
  }, [exchange, loadLocalDrawings, marketCategory, persistDrawingsToServer, symbol]);

  const getDrawingTimes = useCallback((items) => {
    return items.flatMap((drawing) => {
      if (isTwoPointDrawing(drawing)) {
        return [drawing.start?.time, drawing.end?.time, drawing.stop?.time, drawing.anchor?.time];
      }

      if (drawing.type === 'text') {
        return [drawing.point?.time];
      }

      if (isPathDrawing(drawing)) {
        return (drawing.points ?? []).map((point) => point?.time);
      }

      return [];
    }).filter((time) => Number.isFinite(Number(time))).map(Number);
  }, []);

  const selectedPriceAutoscaleInfoProvider = useCallback((original) => {
    const autoscaleInfo = original();
    const selectedPrice = selectedReplayPriceRef.current;
    const account = backtestAccountRef.current;
    const activeSymbol = symbolRef.current;
    const backtestPrices = [
      ...(account?.pendingPositions ?? []),
      ...(account?.openPositions ?? []),
    ]
      .filter((position) => position.symbol === activeSymbol)
      .flatMap((position) => [position.entryPrice, position.stopLoss, position.takeProfit])
      .map(Number)
      .filter((price) => Number.isFinite(price) && price > 0);

    if (!autoscaleInfo) {
      return autoscaleInfo;
    }

    if (replayModeRef.current && Number.isFinite(selectedPrice)) {
      backtestPrices.push(selectedPrice);
    }

    if (!backtestPrices.length) return autoscaleInfo;

    const priceRange = autoscaleInfo.priceRange ?? {
      minValue: backtestPrices[0],
      maxValue: backtestPrices[0],
    };
    let minValue = Math.min(priceRange.minValue, ...backtestPrices);
    let maxValue = Math.max(priceRange.maxValue, ...backtestPrices);

    if (minValue === maxValue) {
      const padding = Math.max(Math.abs(minValue) * 0.01, 1);
      minValue -= padding;
      maxValue += padding;
    }

    return {
      ...autoscaleInfo,
      priceRange: {
        minValue,
        maxValue,
      },
      margins: autoscaleInfo.margins ?? {
        above: 12,
        below: 12,
      },
    };
  }, []);

  const getChartCoordinates = useCallback((x, y) => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series || !allCandles.length) return null;

    const logical = chart.timeScale().coordinateToLogical(x);
    const rawTime = chart.timeScale().coordinateToTime(x);
    const rawPrice = series.coordinateToPrice(y);

    if (logical == null || rawPrice == null) return null;

    const estimatedTime = estimateTimeFromLogical(allCandles, Number(logical));
    const nearestIndex =
      rawTime == null
        ? Math.min(Math.max(Math.round(logical), 0), allCandles.length - 1)
        : findNearestCandleIndex(allCandles, rawTime);

    if (nearestIndex < 0 || !allCandles[nearestIndex]) return null;

    return {
      time: Number.isFinite(estimatedTime) ? estimatedTime : allCandles[nearestIndex].time,
      logical: Number(logical),
      price: Number(rawPrice),
    };
  }, [allCandles]);

  const toScreen = useCallback((pointOrTime, price) => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return null;

    const point =
      typeof pointOrTime === 'object' && pointOrTime !== null
        ? pointOrTime
        : { time: pointOrTime, price };

    const intervalSeconds = TIMEFRAME_SECONDS[loadedTimeframe] ?? 60;
    const projectionCandles = allCandles.length ? allCandles : visibleCandles;
    const logicalFromTime = estimateDrawingLogicalFromTime(
      projectionCandles,
      point.time,
      intervalSeconds
    );

    const x =
      Number.isFinite(logicalFromTime)
        ? chart.timeScale().logicalToCoordinate(logicalFromTime)
        : (
            Number.isFinite(point.logical)
              ? chart.timeScale().logicalToCoordinate(point.logical)
              : chart.timeScale().timeToCoordinate(point.time)
          );
    const y = series.priceToCoordinate(point.price);

    if (x == null || y == null) return null;
    return { x, y };
  }, [allCandles, loadedTimeframe, visibleCandles]);

  const setReplayPointFromCoordinates = useCallback((x, y, moveCandle = true) => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries || !allCandles.length) return;

    const time = chart.timeScale().coordinateToTime(x);
    const price = candleSeries.coordinateToPrice(y);

    if (price != null && Number.isFinite(Number(price))) {
      setSelectedReplayPrice(Number(price));
    }

    if (moveCandle && time != null) {
      const nearestIndex = findNearestCandleIndex(allCandles, time);
      if (nearestIndex >= 0) {
        setReplayIndex(nearestIndex);
        setIsPlaying(false);
      }
    }
  }, [allCandles]);

  const getDefaultPositionStop = useCallback((type, entry, target) => {
    const priceMove = Math.abs(target.price - entry.price);
    const stopPrice =
      type === 'long-position'
        ? entry.price - priceMove
        : entry.price + priceMove;

    return {
      ...target,
      price: stopPrice,
    };
  }, []);

  const renderedDrawings = useMemo(() => {
    const all = [...drawings, ...(tempDrawing ? [tempDrawing] : [])];

    return all.map((drawing) => {
      if (isLineLikeDrawing(drawing)) {
        const p1 = toScreen(drawing.start);
        const p2 = toScreen(drawing.end);
        if (!p1 || !p2) return null;
        const p3 = drawing.anchor ? toScreen(drawing.anchor) : null;

        if (isHorizontalRayDrawing(drawing)) {
          return {
            ...drawing,
            screen: {
              p1,
              p2,
              rayEnd: {
                x: Math.max(overlaySize.width, p1.x),
                y: p1.y,
              },
            },
          };
        }

        return { ...drawing, screen: { p1, p2, ...(p3 ? { p3 } : {}) } };
      }

      if (drawing.type === 'rect') {
        const p1 = toScreen(drawing.start);
        const p2 = toScreen(drawing.end);
        if (!p1 || !p2) return null;
        return { ...drawing, screen: { p1, p2 } };
      }

      if (isPositionDrawing(drawing)) {
        const p1 = toScreen(drawing.start);
        const p2 = toScreen(drawing.end);
        const stop = drawing.stop ?? getDefaultPositionStop(drawing.type, drawing.start, drawing.end);
        const pStop = toScreen(stop);
        const progressPoint = resolvePositionProgressPoint(drawing, stop, visibleCandles);
        const pCurrent = progressPoint ? toScreen(progressPoint) : null;
        if (!p1 || !p2 || !pStop) return null;
        return {
          ...drawing,
          stop,
          screen: {
            p1,
            p2,
            pStop,
            ...(pCurrent ? { pCurrent } : {}),
          },
        };
      }

      if (drawing.type === 'text') {
        const p = toScreen(drawing.point);
        if (!p) return null;
        return { ...drawing, screen: { p } };
      }

      if (isPathDrawing(drawing)) {
        const points = (drawing.points ?? []).map((point) => toScreen(point));
        if (points.length < 1 || points.some((point) => !point)) return null;
        const previewPoint = drawing.previewPoint ? toScreen(drawing.previewPoint) : null;
        return {
          ...drawing,
          screen: {
            points,
            ...(previewPoint ? { previewPoint } : {}),
          },
        };
      }

      return null;
    }).filter(Boolean);
  }, [drawings, tempDrawing, toScreen, replayIndex, overlaySize, overlayRenderVersion, getDefaultPositionStop, visibleCandles]);

  const renderedBacktestOrders = useMemo(() => {
    const series = candleSeriesRef.current;
    if (!series || !overlaySize.width) return [];

    const buildLine = (position, kind, price, options = {}) => {
      const value = getPositiveNumber(price);
      if (value == null) return null;

      const y = series.priceToCoordinate(value);
      if (y == null) return null;

      const kindLabel = kind === 'entry' ? (position.status === 'pending' ? 'ENTRY' : 'OPEN') : kind.toUpperCase();
      const sideLabel = position.side === 'short' ? 'SHORT' : 'LONG';

      return {
        id: options.id ?? `${position.status}:${position.id}:${kind}`,
        positionId: position.id,
        status: position.status,
        side: position.side,
        kind,
        price: value,
        y,
        dashed: options.dashed ?? position.status === 'pending',
        color: kind === 'tp' ? '#22c55e' : kind === 'sl' ? '#ef4444' : '#f59e0b',
        isDraft: Boolean(options.isDraft),
        canCancel: Boolean(options.canCancel),
        label: options.label ?? `${sideLabel} ${kindLabel} ${formatOverlayPrice(value)}`,
      };
    };
    const draftEntryPrice = getPositiveNumber(
      backtestOrderDraft?.isPendingOrder
        ? backtestOrderDraft?.entryPrice
        : backtestOrderDraft?.effectiveEntryPrice
    );
    const draftStopLoss = getPositiveNumber(backtestOrderDraft?.stopLoss) ?? (
      draftEntryPrice
        ? backtestOrderDraft?.side === 'short'
          ? draftEntryPrice * 1.01
          : draftEntryPrice * 0.99
        : null
    );
    const draftTakeProfit = getPositiveNumber(backtestOrderDraft?.takeProfit) ?? (
      draftEntryPrice
        ? backtestOrderDraft?.side === 'short'
          ? draftEntryPrice * 0.99
          : draftEntryPrice * 1.01
        : null
    );

    return [
      ...(backtestOrderDraft?.visible
        ? [
            buildLine(
              {
                id: 'draft',
                status: 'draft',
                side: backtestOrderDraft.side,
              },
              'entry',
              draftEntryPrice,
              {
                id: 'draft:entry',
                isDraft: true,
                dashed: true,
                label: `${backtestOrderDraft.side === 'short' ? 'SHORT' : 'LONG'} ${backtestOrderDraft.isPendingOrder ? 'ORDER' : 'ENTRY'} ${formatOverlayPrice(draftEntryPrice)}`,
              }
            ),
            buildLine(
              {
                id: 'draft',
                status: 'draft',
                side: backtestOrderDraft.side,
              },
              'sl',
              draftStopLoss,
              {
                id: 'draft:sl',
                isDraft: true,
                dashed: true,
                label: `SL ${formatOverlayPrice(draftStopLoss)}`,
              }
            ),
            buildLine(
              {
                id: 'draft',
                status: 'draft',
                side: backtestOrderDraft.side,
              },
              'tp',
              draftTakeProfit,
              {
                id: 'draft:tp',
                isDraft: true,
                dashed: true,
                label: `TP ${formatOverlayPrice(draftTakeProfit)}`,
              }
            ),
          ]
        : []),
      ...(backtestAccount?.pendingPositions ?? [])
        .filter((position) => position.symbol === symbol)
        .flatMap((position) => [
          buildLine({ ...position, status: 'pending' }, 'entry', position.entryPrice, { dashed: true, canCancel: true }),
          buildLine({ ...position, status: 'pending' }, 'sl', position.stopLoss, { dashed: true }),
          buildLine({ ...position, status: 'pending' }, 'tp', position.takeProfit, { dashed: true }),
        ]),
      ...(backtestAccount?.openPositions ?? [])
        .filter((position) => position.symbol === symbol)
        .flatMap((position) => [
          buildLine({ ...position, status: 'open' }, 'entry', position.entryPrice, { dashed: false }),
          buildLine({ ...position, status: 'open' }, 'sl', position.stopLoss, { dashed: false }),
          buildLine({ ...position, status: 'open' }, 'tp', position.takeProfit, { dashed: false }),
        ]),
    ].filter(Boolean);
  }, [backtestAccount, backtestOrderDraft, overlayRenderVersion, overlaySize.width, symbol]);

  const hitTestDrawing = useCallback((x, y) => {
    const point = { x, y };

    for (let i = renderedDrawings.length - 1; i >= 0; i -= 1) {
      const d = renderedDrawings[i];

      if (isLineLikeDrawing(d)) {
        const { p1, p2, rayEnd } = d.screen;
        if (distanceToSegment(point, p1, rayEnd ?? p2) <= 8) return d.id;

        if (d.type === 'fib-extension' && d.screen.p3 && distanceToSegment(point, p2, d.screen.p3) <= 8) {
          return d.id;
        }

        if (['fib-retracement', 'fib-extension'].includes(d.type)) {
          const hitFibLevel = getRenderedFibonacciLevels(d, overlaySize.width).some((level) => {
            const levelPointA = { x: level.x1, y: level.y };
            const levelPointB = { x: level.x2, y: level.y };
            return distanceToSegment(point, levelPointA, levelPointB) <= 6;
          });

          if (hitFibLevel) return d.id;
        }
      }

      if (d.type === 'rect') {
        const { p1, p2 } = d.screen;
        const rect = normalizeVisibleRect(p1, p2);
        const inside =
          x >= rect.left &&
          x <= rect.left + rect.width &&
          y >= rect.top &&
          y <= rect.top + rect.height;

        if (inside) return d.id;
      }

      if (isPositionDrawing(d)) {
        const { p1, p2, pStop } = d.screen;
        const top = Math.min(p1.y, p2.y, pStop.y);
        const bottom = Math.max(p1.y, p2.y, pStop.y);
        const left = Math.min(p1.x, p2.x, pStop.x);
        const right = Math.max(p1.x, p2.x, pStop.x);
        const inside =
          x >= left &&
          x <= right &&
          y >= top &&
          y <= bottom;

        if (inside) return d.id;
      }

      if (d.type === 'text') {
        const { p } = d.screen;
        if (Math.abs(x - p.x) <= 80 && Math.abs(y - p.y) <= 24) return d.id;
      }

      if (isPathDrawing(d)) {
        const points = d.screen.points ?? [];
        for (let index = 1; index < points.length; index += 1) {
          if (distanceToSegment(point, points[index - 1], points[index]) <= 8) return d.id;
        }

        if (points.some((pathPoint) => Math.abs(x - pathPoint.x) <= 8 && Math.abs(y - pathPoint.y) <= 8)) {
          return d.id;
        }
      }
    }

    return null;
  }, [overlaySize.width, renderedDrawings]);

  const hitTestBacktestOrder = useCallback((x, y) => {
    for (let i = renderedBacktestOrders.length - 1; i >= 0; i -= 1) {
      const item = renderedBacktestOrders[i];
      const nearCancel =
        item.canCancel &&
        x >= overlaySize.width - 44 &&
        x <= overlaySize.width - 24 &&
        Math.abs(y - item.y) <= 12;
      const nearLine = Math.abs(y - item.y) <= 6 && x >= 0 && x <= overlaySize.width;
      const nearHandle =
        x >= overlaySize.width - 24 &&
        x <= overlaySize.width &&
        Math.abs(y - item.y) <= 12;

      if (nearCancel) {
        return { ...item, action: 'cancel' };
      }

      if (nearLine || nearHandle) {
        return item;
      }
    }

    return null;
  }, [overlaySize.width, renderedBacktestOrders]);

  const hitTestResizeHandle = useCallback((x, y) => {
    if (!selectedDrawingIdRef.current) return null;

    const selected = renderedDrawings.find((d) => d.id === selectedDrawingIdRef.current);
    if (!selected || selected.type === 'text') return null;

    const handles = [];

    if (isLineLikeDrawing(selected)) {
      handles.push({ handle: 'start', point: selected.screen.p1 });

      if (!isHorizontalRayDrawing(selected)) {
        handles.push({ handle: 'end', point: selected.screen.p2 });
      }

      if (selected.type === 'fib-extension' && selected.screen.p3) {
        handles.push({ handle: 'anchor', point: selected.screen.p3 });
      }
    }

    if (isPositionDrawing(selected)) {
      handles.push(
        { handle: 'start', point: selected.screen.p1 },
        { handle: 'end', point: selected.screen.p2 },
        { handle: 'stop', point: selected.screen.pStop }
      );
    }

    if (isPathDrawing(selected)) {
      (selected.screen.points ?? []).forEach((point, index) => {
        handles.push({ handle: `point:${index}`, point });
      });
    }

    if (selected.type === 'rect') {
      const { p1, p2 } = selected.screen;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      handles.push(
        { handle: 'start', point: p1 },
        { handle: 'end', point: p2 },
        { handle: 'start-x-end-y', point: { x: p1.x, y: p2.y } },
        { handle: 'end-x-start-y', point: { x: p2.x, y: p1.y } },
        { handle: 'start-time', point: { x: p1.x, y: midY } },
        { handle: 'end-time', point: { x: p2.x, y: midY } },
        { handle: 'start-price', point: { x: midX, y: p1.y } },
        { handle: 'end-price', point: { x: midX, y: p2.y } }
      );
    }

    for (const item of handles) {
      if (Math.abs(x - item.point.x) <= 8 && Math.abs(y - item.point.y) <= 8) {
        return { drawingId: selected.id, handle: item.handle };
      }
    }

    return null;
  }, [renderedDrawings]);

  const updateLocalBacktestPositionLine = useCallback((positionId, updates) => {
    setBacktestAccount((currentAccount) => {
      if (!currentAccount) return currentAccount;

      const updatePosition = (position) => (
        position.id === positionId
          ? { ...position, ...updates }
          : position
      );

      return {
        ...currentAccount,
        pendingPositions: (currentAccount.pendingPositions ?? []).map(updatePosition),
        openPositions: (currentAccount.openPositions ?? []).map(updatePosition),
      };
    });
  }, []);

  const handleUpdateBacktestPositionRisk = useCallback(async (dragState) => {
    if (!dragState?.positionId) return;

    const payload = {
      price: getPositiveNumber(executionPrice),
    };

    if (dragState.kind === 'entry' && dragState.status === 'pending') {
      payload.entry_price = dragState.price;
    }

    if (dragState.kind === 'sl') {
      payload.stop_loss = dragState.price;
    }

    if (dragState.kind === 'tp') {
      payload.take_profit = dragState.price;
    }

    try {
      const response = await axios.put(`/market-backtest/positions/${dragState.positionId}/risk`, payload);
      setBacktestAccount(response.data?.account ?? null);
      setBacktestError('');
    } catch (err) {
      setBacktestError(err.response?.data?.message ?? err.message ?? 'Failed to update position prices');
      loadBacktestAccount(executionPrice);
    }
  }, [executionPrice, loadBacktestAccount]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 800,
      height: containerRef.current.clientHeight || 0,
      layout: {
        background: { color: chartTheme.background },
        textColor: chartTheme.text,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: chartTheme.grid },
        horzLines: { color: chartTheme.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: chartTheme.border,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: chartTheme.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: candleSize,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: candleColors.up,
      downColor: candleColors.down,
      borderUpColor: candleColors.up,
      borderDownColor: candleColors.down,
      wickUpColor: candleColors.up,
      wickDownColor: candleColors.down,
      borderVisible: true,
      priceLineVisible: true,
      lastValueVisible: true,
      autoscaleInfoProvider: selectedPriceAutoscaleInfoProvider,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: '',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const handleVisibleRangeChange = () => {
      scheduleOverlayRender();
      if (isProgrammaticRangeChangeRef.current) return;
      setFollowReplay(false);
    };

    const handleChartClick = (param) => {
      if (!isReplayPricePickActiveRef.current) return;
      if (isSpacePressedRef.current) return;
      if (toolRef.current) return;
      if (dragDrawingRef.current) return;
      if (!param?.point) return;

      setReplayPointFromCoordinates(param.point.x, param.point.y, true);
      setReplayMode(true);
      setIsReplayPricePickActive(false);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    chart.subscribeClick(handleChartClick);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    resizeObserverRef.current = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || CHART_HEIGHT,
      });
      scheduleOverlayRender();
    });

    resizeObserverRef.current.observe(containerRef.current);

    const getCurrentPriceRange = () => {
      const chart = chartRef.current;
      const series = candleSeriesRef.current;
      if (!series || !containerRef.current) return null;

      const visibleRange = chart?.priceScale('right').getVisibleRange();
      if (
        visibleRange &&
        Number.isFinite(Number(visibleRange.from)) &&
        Number.isFinite(Number(visibleRange.to)) &&
        Number(visibleRange.from) !== Number(visibleRange.to)
      ) {
        return {
          from: Math.min(Number(visibleRange.from), Number(visibleRange.to)),
          to: Math.max(Number(visibleRange.from), Number(visibleRange.to)),
        };
      }

      const chartHeight = containerRef.current.clientHeight || CHART_HEIGHT;
      const topPrice = series.coordinateToPrice(0);
      const bottomPrice = series.coordinateToPrice(chartHeight);

      if (
        topPrice != null &&
        bottomPrice != null &&
        Number.isFinite(Number(topPrice)) &&
        Number.isFinite(Number(bottomPrice)) &&
        Number(topPrice) !== Number(bottomPrice)
      ) {
        return {
          from: Math.min(Number(topPrice), Number(bottomPrice)),
          to: Math.max(Number(topPrice), Number(bottomPrice)),
        };
      }

      const prices = visibleCandlesRef.current.flatMap((candle) => [candle.high, candle.low]);
      if (!prices.length) return null;

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const padding = Math.max((maxPrice - minPrice) * 0.1, Math.abs(maxPrice) * 0.001, 1);

      return {
        from: minPrice - padding,
        to: maxPrice + padding,
      };
    };

    const handlePriceScaleWheel = (event) => {
      const chart = chartRef.current;
      const series = candleSeriesRef.current;
      const el = containerRef.current;
      if (!chart || !series || !el || event.deltaY === 0) return;

      const priceScaleWidth = chart.priceScale('right').width();
      if (!priceScaleWidth) return;

      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const isOnRightPriceScale = x >= rect.width - priceScaleWidth && x <= rect.width;

      if (!isOnRightPriceScale || y < 0 || y > rect.height) return;

      const range = getCurrentPriceRange();
      if (!range) return;

      const span = range.to - range.from;
      if (!Number.isFinite(span) || span <= 0) return;

      const cursorPrice = series.coordinateToPrice(y);
      const anchorPrice =
        cursorPrice != null && Number.isFinite(Number(cursorPrice))
          ? Number(cursorPrice)
          : range.from + span / 2;
      const anchorRatio = Math.min(Math.max((anchorPrice - range.from) / span, 0), 1);
      const zoomFactor = event.deltaY < 0 ? 0.85 : 1.15;
      const nextSpan = Math.max(span * zoomFactor, Math.abs(anchorPrice) * 0.000001, 0.000001);

      event.preventDefault();
      event.stopImmediatePropagation();

      chart.priceScale('right').setVisibleRange({
        from: anchorPrice - nextSpan * anchorRatio,
        to: anchorPrice + nextSpan * (1 - anchorRatio),
      });
      scheduleOverlayRender();
    };

    const handleViewportInteraction = () => {
      scheduleOverlayRender();
    };

    containerRef.current.addEventListener('wheel', handlePriceScaleWheel, { passive: false, capture: true });
    containerRef.current.addEventListener('wheel', handleViewportInteraction, { passive: true });
    containerRef.current.addEventListener('mousemove', handleViewportInteraction, { passive: true });
    containerRef.current.addEventListener('mouseup', handleViewportInteraction, { passive: true });
    containerRef.current.addEventListener('mouseleave', handleViewportInteraction, { passive: true });

    return () => {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }

      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.unsubscribeClick(handleChartClick);

      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', handlePriceScaleWheel, { capture: true });
        containerRef.current.removeEventListener('wheel', handleViewportInteraction);
        containerRef.current.removeEventListener('mousemove', handleViewportInteraction);
        containerRef.current.removeEventListener('mouseup', handleViewportInteraction);
        containerRef.current.removeEventListener('mouseleave', handleViewportInteraction);
      }

      if (overlayRenderFrameRef.current) {
        cancelAnimationFrame(overlayRenderFrameRef.current);
        overlayRenderFrameRef.current = null;
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [scheduleOverlayRender, selectedPriceAutoscaleInfoProvider, setReplayPointFromCoordinates]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.timeScale().applyOptions({
      barSpacing: candleSize,
    });
    scheduleOverlayRender();
  }, [candleSize, scheduleOverlayRender]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.applyOptions({
      layout: {
        background: { color: chartTheme.background },
        textColor: chartTheme.text,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: chartTheme.grid },
        horzLines: { color: chartTheme.grid },
      },
      rightPriceScale: {
        borderColor: chartTheme.border,
      },
      timeScale: {
        borderColor: chartTheme.border,
      },
    });
    scheduleOverlayRender();
  }, [chartTheme, scheduleOverlayRender]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    candleSeries.applyOptions({
      upColor: candleColors.up,
      downColor: candleColors.down,
      borderUpColor: candleColors.up,
      borderDownColor: candleColors.down,
      wickUpColor: candleColors.up,
      wickDownColor: candleColors.down,
    });
  }, [candleColors.down, candleColors.up]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;

    if (!chart || !candleSeries || !volumeSeries) return;

    candleSeries.setData(
      visibleCandles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    volumeSeries.setData(visibleVolume);
    scheduleOverlayRender();
  }, [scheduleOverlayRender, visibleCandles, visibleVolume]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !allCandles.length) return;

    isProgrammaticRangeChangeRef.current = true;
    chart.timeScale().fitContent();

    requestAnimationFrame(() => {
      isProgrammaticRangeChangeRef.current = false;
      scheduleOverlayRender();
    });
  }, [allCandles, scheduleOverlayRender, symbol, timeframe]);

  useEffect(() => {
    const chart = chartRef.current;
    const pendingRange = pendingVisibleLogicalRangeRef.current;
    if (!chart || !pendingRange || !visibleCandles.length) return;

    pendingVisibleLogicalRangeRef.current = null;
    isProgrammaticRangeChangeRef.current = true;
    chart.timeScale().setVisibleLogicalRange(pendingRange);

    requestAnimationFrame(() => {
      isProgrammaticRangeChangeRef.current = false;
      scheduleOverlayRender();
    });
  }, [scheduleOverlayRender, timeframe, visibleCandles.length]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !replayMode || !followReplay || !visibleCandles.length) return;

    isProgrammaticRangeChangeRef.current = true;
    chart.timeScale().scrollToPosition(5, false);

    requestAnimationFrame(() => {
      isProgrammaticRangeChangeRef.current = false;
      scheduleOverlayRender();
    });
  }, [followReplay, replayIndex, replayMode, scheduleOverlayRender, visibleCandles.length]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.applyOptions({
      handleScroll: isSpacePressed || !tool,
      handleScale: isSpacePressed || !tool,
    });
  }, [isSpacePressed, tool]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    candleSeries.applyOptions({
      autoscaleInfoProvider: selectedPriceAutoscaleInfoProvider,
    });

    if (selectedPriceLineRef.current) {
      candleSeries.removePriceLine(selectedPriceLineRef.current);
      selectedPriceLineRef.current = null;
    }

    if (replayMode && selectedReplayPrice != null) {
      selectedPriceLineRef.current = candleSeries.createPriceLine({
        price: selectedReplayPrice,
        color: chartTheme.selectedPriceLine,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Selected',
      });
    }

    return () => {
      if (selectedPriceLineRef.current && candleSeriesRef.current) {
        candleSeriesRef.current.removePriceLine(selectedPriceLineRef.current);
        selectedPriceLineRef.current = null;
      }
    };
  }, [
    replayMode,
    selectedPriceAutoscaleInfoProvider,
    selectedReplayPrice,
    chartTheme,
    timeframe,
    backtestAccount,
    symbol,
    visibleCandles.length,
  ]);

  useEffect(() => {
    if (!replayMode || !isPlaying || replayIndex >= allCandles.length - 1) {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
      return;
    }

    replayTimerRef.current = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= allCandles.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [replayMode, isPlaying, replayIndex, allCandles.length, playbackSpeed]);

  const getKeyboardPriceStep = useCallback(() => {
    const series = candleSeriesRef.current;
    const height = overlaySize.height || CHART_HEIGHT;

    if (series && height > 0) {
      const middleY = height / 2;
      const priceAtMiddle = series.coordinateToPrice(middleY);
      const priceAtOffset = series.coordinateToPrice(Math.max(0, middleY - 8));
      const step = Math.abs(Number(priceAtOffset) - Number(priceAtMiddle));

      if (Number.isFinite(step) && step > 0) {
        return step;
      }
    }

    const visibleCandles = visibleCandlesRef.current.length
      ? visibleCandlesRef.current
      : allCandles;
    const highs = visibleCandles.map((candle) => Number(candle.high)).filter(Number.isFinite);
    const lows = visibleCandles.map((candle) => Number(candle.low)).filter(Number.isFinite);
    const high = highs.length ? Math.max(...highs) : 0;
    const low = lows.length ? Math.min(...lows) : 0;
    const range = high - low;

    return range > 0 ? range / 100 : 1;
  }, [allCandles, overlaySize.height]);

  const handleNudgeSelectedDrawing = useCallback((key, multiplier = 1) => {
    const selectedId = selectedDrawingIdRef.current;
    if (!selectedId) return false;

    const selected = drawingsRef.current.find((drawing) => drawing.id === selectedId);
    if (!selected) return false;

    const intervalSeconds = TIMEFRAME_SECONDS[timeframe] ?? 60;
    const priceStep = getKeyboardPriceStep();
    let deltaLogical = 0;
    let deltaTime = 0;
    let deltaPrice = 0;

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      deltaLogical = (key === 'ArrowLeft' ? -1 : 1) * multiplier;
      deltaTime = intervalSeconds * deltaLogical;
    }

    if (key === 'ArrowUp' || key === 'ArrowDown') {
      deltaPrice = (key === 'ArrowUp' ? 1 : -1) * priceStep * multiplier;
    }

    if (!deltaTime && !deltaPrice && !deltaLogical) return false;

    const next = drawingsRef.current.map((drawing) => (
      drawing.id === selectedId
        ? offsetDrawing(drawing, deltaTime, deltaPrice, deltaLogical)
        : drawing
    ));

    saveDrawings(next);
    setSelectedDrawingId(selectedId);
    return true;
  }, [getKeyboardPriceStep, saveDrawings, timeframe]);

  const handleDuplicateSelectedDrawing = useCallback(() => {
    const selectedId = selectedDrawingIdRef.current;
    if (!selectedId) return false;

    const selected = drawingsRef.current.find((drawing) => drawing.id === selectedId);
    if (!selected) return false;

    const intervalSeconds = TIMEFRAME_SECONDS[timeframe] ?? 60;
    const priceStep = getKeyboardPriceStep();
    const duplicate = offsetDrawing(
      {
        ...structuredClone(selected),
        id: `drawing-${Date.now()}`,
      },
      intervalSeconds,
      priceStep,
      1
    );
    const next = [...drawingsRef.current, duplicate];

    saveDrawings(next);
    setSelectedDrawingId(duplicate.id);
    setTool(null);
    setTempDrawing(null);
    setTextInput(null);

    return true;
  }, [getKeyboardPriceStep, saveDrawings, timeframe]);

  const handleFinishPathDrawing = useCallback(() => {
    const currentTemp = tempDrawingRef.current;
    if (!isPathDrawing(currentTemp)) return false;

    if ((currentTemp.points ?? []).length < 2) {
      tempDrawingRef.current = null;
      setTempDrawing(null);
      return false;
    }

    const completed = {
      ...currentTemp,
      id: `drawing-${Date.now()}`,
    };
    delete completed.previewPoint;

    appendDrawing(completed);
    tempDrawingRef.current = null;
    setTempDrawing(null);
    setTool(null);
    return true;
  }, [appendDrawing]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.altKey && !event.repeat && ['l', 's'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        quickOpenBacktestPositionRef.current?.(event.key.toLowerCase() === 'l' ? 'long' : 'short');
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();

        if (!event.repeat) {
          if (!replayMode) {
            const nextIndex = Math.min(
              Math.max(0, Math.floor(allCandles.length * 0.3)),
              Math.max(0, allCandles.length - 1)
            );

            setReplayMode(true);
            setFollowReplay(true);
            setReplayIndex(nextIndex);
            setSelectedReplayPrice(allCandles[nextIndex]?.close ?? null);
            setIsReplayPricePickActive(false);
            setIsPlaying(true);
          } else if (replayIndex < allCandles.length - 1) {
            setIsPlaying((prev) => !prev);
          }
        }
      }

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        const multiplier = event.shiftKey ? 5 : 1;

        if (handleNudgeSelectedDrawing(event.key, multiplier)) {
          event.preventDefault();
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        if (handleUndoDrawings()) {
          event.preventDefault();
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        if (handleDuplicateSelectedDrawing()) {
          event.preventDefault();
        }
      }

      if (event.key === 'Enter') {
        if (handleFinishPathDrawing()) {
          event.preventDefault();
        }
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedDrawingIdRef.current) {
        event.preventDefault();
        pushDrawingUndoSnapshot(selectedDrawingIdRef.current);
        const next = drawingsRef.current.filter((d) => d.id !== selectedDrawingIdRef.current);
        saveDrawings(next);
        setSelectedDrawingId(null);
      }

      if (event.key === 'Escape') {
        tempDrawingRef.current = null;
        setTempDrawing(null);
        setTool(null);
        setTextInput(null);
        resizeDrawingRef.current = null;
        dragDrawingRef.current = null;
        dragBacktestOrderRef.current = null;
        setIsReplayPricePickActive(false);
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacePressed(false);
        dragDrawingRef.current = null;
        resizeDrawingRef.current = null;
        dragBacktestOrderRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [allCandles, handleDuplicateSelectedDrawing, handleFinishPathDrawing, handleNudgeSelectedDrawing, handleUndoDrawings, pushDrawingUndoSnapshot, replayIndex, replayMode, saveDrawings]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const getRelativePoint = (event) => {
      const rect = el.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const setChartMouseInteractions = (enabled) => {
      const chart = chartRef.current;
      if (!chart) return;

      chart.applyOptions({
        handleScroll: enabled,
        handleScale: enabled,
      });
    };

    const restoreChartMouseInteractions = () => {
      setChartMouseInteractions(isSpacePressedRef.current || !toolRef.current);
    };

    const handleMouseDown = (event) => {
      if (
        event.target?.closest?.(
          '[data-chart-ui], button, input, textarea, select, [contenteditable="true"]'
        )
      ) {
        return;
      }

      if (isSpacePressedRef.current) {
        dragDrawingRef.current = null;
        return;
      }

      const { x, y } = getRelativePoint(event);

      const backtestOrderHit = hitTestBacktestOrder(x, y);
      if (backtestOrderHit?.action === 'cancel') {
        event.preventDefault();
        event.stopPropagation();
        cancelBacktestPositionRef.current?.(backtestOrderHit.positionId);
        return;
      }

      if (
        backtestOrderHit &&
        (
          backtestOrderHit.isDraft ||
          backtestOrderHit.status === 'pending' ||
          backtestOrderHit.kind !== 'entry'
        )
      ) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();
        setChartMouseInteractions(false);
        dragBacktestOrderRef.current = {
          positionId: backtestOrderHit.positionId,
          status: backtestOrderHit.status,
          kind: backtestOrderHit.kind,
          price: backtestOrderHit.price,
          isDraft: backtestOrderHit.isDraft,
        };
        dragDrawingRef.current = null;
        resizeDrawingRef.current = null;
        return;
      }

      const resizeHit = hitTestResizeHandle(x, y);
      if (resizeHit) {
        const drawing = drawingsRef.current.find((d) => d.id === resizeHit.drawingId);
        if (!drawing) return;

        event.preventDefault();
        event.stopPropagation();
        setChartMouseInteractions(false);
        resizeDrawingRef.current = {
          ...resizeHit,
          originalDrawing: drawing,
        };
        dragDrawingRef.current = null;
        setSelectedDrawingId(resizeHit.drawingId);
        return;
      }

      if (toolRef.current === PATH_TOOL_TYPE) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        const currentTemp = tempDrawingRef.current;
        const savedToolSettings = getToolSettingsForType(PATH_TOOL_TYPE);
        const nextTemp = isPathDrawing(currentTemp)
          ? {
              ...currentTemp,
              points: [...(currentTemp.points ?? []), coords],
              previewPoint: coords,
            }
          : {
              id: `temp-${Date.now()}`,
              type: PATH_TOOL_TYPE,
              points: [coords],
              previewPoint: coords,
              strokeWidth: savedToolSettings.strokeWidth ?? 1,
              lineStyle: savedToolSettings.lineStyle ?? 'solid',
              color: savedToolSettings.color ?? drawingColorRef.current,
              labelText: savedToolSettings.labelText ?? '',
              labelVertical: savedToolSettings.labelVertical ?? 'top',
              labelHorizontal: savedToolSettings.labelHorizontal ?? 'center',
              textBold: Boolean(savedToolSettings.textBold),
              textItalic: Boolean(savedToolSettings.textItalic),
            };

        tempDrawingRef.current = nextTemp;
        setTempDrawing(nextTemp);
        return;
      }

      if (TWO_POINT_TOOL_TYPES.includes(toolRef.current)) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        const currentTemp = tempDrawingRef.current;

        if (!currentTemp) {
          const savedToolSettings = getToolSettingsForType(toolRef.current);
          setTempDrawing({
            id: `temp-${Date.now()}`,
            type: toolRef.current,
            start: coords,
            end: coords,
            strokeWidth: savedToolSettings.strokeWidth ?? 1,
            lineStyle: savedToolSettings.lineStyle ?? 'solid',
            color: savedToolSettings.color ?? drawingColorRef.current,
            labelText: savedToolSettings.labelText ?? '',
            labelVertical: savedToolSettings.labelVertical ?? 'top',
            labelHorizontal: savedToolSettings.labelHorizontal ?? 'center',
            textBold: Boolean(savedToolSettings.textBold),
            textItalic: Boolean(savedToolSettings.textItalic),
          });
        } else {
          const endPoint = currentTemp.type === 'horizontal-ray'
            ? { ...coords, price: currentTemp.start.price }
            : coords;

          if (currentTemp.type === 'fib-extension' && !currentTemp.anchor) {
            setTempDrawing({
              ...currentTemp,
              end: endPoint,
              anchor: endPoint,
            });
            return;
          }

          const completed = {
            id: `drawing-${Date.now()}`,
            type: currentTemp.type,
            start: currentTemp.start,
            end: endPoint,
            strokeWidth: currentTemp.strokeWidth ?? 1,
            lineStyle: currentTemp.lineStyle ?? 'solid',
            color: currentTemp.color ?? drawingColorRef.current,
            labelText: currentTemp.labelText ?? '',
            labelVertical: currentTemp.labelVertical ?? 'top',
            labelHorizontal: currentTemp.labelHorizontal ?? 'center',
            textBold: Boolean(currentTemp.textBold),
            textItalic: Boolean(currentTemp.textItalic),
          };

          if (currentTemp.type === 'fib-extension') {
            completed.end = currentTemp.end;
            completed.anchor = coords;
          }

          if (isPositionDrawing(completed)) {
            completed.stop = getDefaultPositionStop(completed.type, completed.start, completed.end);
          }

          appendDrawing(completed);
          setTempDrawing(null);
          setTool(null);
        }
        return;
      }

      if (toolRef.current === 'text') {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        const savedToolSettings = getToolSettingsForType('text');
        setTextInput({
          x,
          y,
          point: coords,
        });
        setTextDraft(savedToolSettings.labelText ?? '');
        return;
      }

      const hitId = hitTestDrawing(x, y);
      if (hitId) {
        event.preventDefault();
        event.stopPropagation();
        setChartMouseInteractions(false);
        setSelectedDrawingId(hitId);
        resizeDrawingRef.current = null;

        const coords = getChartCoordinates(x, y);
        const drawing = drawingsRef.current.find((d) => d.id === hitId);
        if (coords && drawing) {
          let anchor;
          if (isTwoPointDrawing(drawing)) {
            anchor = drawing.start;
          } else if (isPathDrawing(drawing)) {
            anchor = drawing.points?.[0];
          } else if (drawing.type === 'text') {
            anchor = drawing.point;
          }

          dragDrawingRef.current = {
            drawingId: hitId,
            startMouse: coords,
            originalDrawing: drawing,
            anchor,
          };
        }
        return;
      }

      setSelectedDrawingId(null);
      dragDrawingRef.current = null;
      resizeDrawingRef.current = null;
      // no replay-price auto-drag here; native chart behavior stays active
    };

    const handleMouseMove = (event) => {
      if (isSpacePressedRef.current) return;

      const { x, y } = getRelativePoint(event);

      if (TWO_POINT_TOOL_TYPES.includes(toolRef.current) && tempDrawingRef.current) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        setTempDrawing((prev) => {
          if (!prev) return prev;
          const endPoint = prev.type === 'horizontal-ray'
            ? { ...coords, price: prev.start.price }
            : coords;

          if (prev.type === 'fib-extension' && prev.anchor) {
            return { ...prev, anchor: coords };
          }

          return { ...prev, end: endPoint };
        });
        return;
      }

      if (toolRef.current === PATH_TOOL_TYPE && isPathDrawing(tempDrawingRef.current)) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        const nextTemp = {
          ...tempDrawingRef.current,
          previewPoint: coords,
        };
        tempDrawingRef.current = nextTemp;
        setTempDrawing(nextTemp);
        return;
      }

      if (resizeDrawingRef.current) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        const { drawingId, handle, originalDrawing } = resizeDrawingRef.current;
        const resized = { ...originalDrawing };

        if (isHorizontalRayDrawing(resized)) {
          if (handle === 'start') {
            resized.start = coords;
            resized.end = { ...resized.end, price: coords.price };
          }
        } else if (isLineLikeDrawing(resized)) {
          resized[handle] = coords;
        }

        if (isPathDrawing(resized) && handle.startsWith('point:')) {
          const index = Number(handle.slice('point:'.length));
          if (Number.isInteger(index) && Array.isArray(resized.points) && resized.points[index]) {
            resized.points = resized.points.map((point, pointIndex) => (
              pointIndex === index ? coords : point
            ));
          }
        }

        if (isPositionDrawing(resized)) {
          resized[handle] = coords;
        }

        if (resized.type === 'rect') {
          if (handle === 'start') {
            resized.start = coords;
          } else if (handle === 'end') {
            resized.end = coords;
          } else if (handle === 'start-x-end-y') {
            resized.start = { ...resized.start, time: coords.time };
            resized.end = { ...resized.end, price: coords.price };
          } else if (handle === 'end-x-start-y') {
            resized.end = { ...resized.end, time: coords.time };
            resized.start = { ...resized.start, price: coords.price };
          } else if (handle === 'start-time') {
            resized.start = { ...resized.start, time: coords.time };
          } else if (handle === 'end-time') {
            resized.end = { ...resized.end, time: coords.time };
          } else if (handle === 'start-price') {
            resized.start = { ...resized.start, price: coords.price };
          } else if (handle === 'end-price') {
            resized.end = { ...resized.end, price: coords.price };
          }
        }

        const next = drawingsRef.current.map((d) => (d.id === drawingId ? resized : d));
        setDrawings(next);
        drawingsRef.current = next;
        return;
      }

      if (dragBacktestOrderRef.current) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        const dragState = {
          ...dragBacktestOrderRef.current,
          price: coords.price,
        };
        dragBacktestOrderRef.current = dragState;

        if (dragState.isDraft) {
          const value = String(Number(coords.price.toFixed(8)));
          setBacktestOrderDraft((currentDraft) => {
            if (!currentDraft) return currentDraft;

            if (dragState.kind === 'entry') {
              return { ...currentDraft, entryPrice: value, effectiveEntryPrice: coords.price };
            }

            if (dragState.kind === 'sl') {
              return { ...currentDraft, stopLoss: value };
            }

            if (dragState.kind === 'tp') {
              return { ...currentDraft, takeProfit: value };
            }

            return currentDraft;
          });
          setOrderLineDraftPatch({
            kind: dragState.kind,
            value,
            version: Date.now(),
          });
          return;
        }

        const updates = {};
        if (dragState.kind === 'entry' && dragState.status === 'pending') {
          updates.entryPrice = coords.price;
        } else if (dragState.kind === 'sl') {
          updates.stopLoss = coords.price;
        } else if (dragState.kind === 'tp') {
          updates.takeProfit = coords.price;
        }

        updateLocalBacktestPositionLine(dragState.positionId, updates);
        return;
      }

      if (dragDrawingRef.current) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        const { drawingId, startMouse, originalDrawing } = dragDrawingRef.current;
        const deltaTime = coords.time - startMouse.time;
        const deltaLogical =
          Number.isFinite(coords.logical) && Number.isFinite(startMouse.logical)
            ? coords.logical - startMouse.logical
            : undefined;
        const deltaPrice = coords.price - startMouse.price;

        const moved = offsetDrawing(originalDrawing, deltaTime, deltaPrice, deltaLogical);
        const next = drawingsRef.current.map((d) => (d.id === drawingId ? moved : d));
        setDrawings(next);
        drawingsRef.current = next;
      }
    };

    const handleMouseUp = () => {
      if (dragBacktestOrderRef.current) {
        const dragState = dragBacktestOrderRef.current;
        dragBacktestOrderRef.current = null;
        restoreChartMouseInteractions();
        if (!dragState.isDraft) {
          handleUpdateBacktestPositionRisk(dragState);
        }
      }

      if (resizeDrawingRef.current) {
        saveDrawings(drawingsRef.current);
        resizeDrawingRef.current = null;
        restoreChartMouseInteractions();
      }

      if (dragDrawingRef.current) {
        saveDrawings(drawingsRef.current);
        dragDrawingRef.current = null;
        restoreChartMouseInteractions();
      }
    };

    const handleDoubleClick = (event) => {
      if (toolRef.current !== PATH_TOOL_TYPE) return;

      event.preventDefault();
      event.stopPropagation();
      handleFinishPathDrawing();
    };

    el.addEventListener('mousedown', handleMouseDown, true);
    el.addEventListener('dblclick', handleDoubleClick, true);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown, true);
      el.removeEventListener('dblclick', handleDoubleClick, true);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [appendDrawing, getChartCoordinates, getDefaultPositionStop, getToolSettingsForType, handleFinishPathDrawing, handleUpdateBacktestPositionRisk, hitTestBacktestOrder, hitTestDrawing, hitTestResizeHandle, saveDrawings, updateLocalBacktestPositionLine]);

  useEffect(() => {
    async function fetchKlines() {
      const requestId = fetchRequestIdRef.current + 1;
      fetchRequestIdRef.current = requestId;
      candleFetchAbortRef.current?.abort();
      const controller = new AbortController();
      candleFetchAbortRef.current = controller;
      const wasInReplay = replayMode;
      const previousSelectedReplayPrice = selectedReplayPriceRef.current;
      const previousReplayTime = wasInReplay ? allCandles[replayIndex]?.time : null;
      const drawingTimes = wasInReplay ? getDrawingTimes(drawingsRef.current) : [];
      const shouldFrameDrawings = wasInReplay && drawingTimes.length > 0;
      const anchorTimes = [
        previousReplayTime,
        ...drawingTimes,
      ].filter((time) => Number.isFinite(Number(time))).map(Number);
      const anchorStart = anchorTimes.length ? Math.min(...anchorTimes) : null;
      const anchorEnd = anchorTimes.length ? Math.max(...anchorTimes) : null;
      const replayAnchorTime =
        Number.isFinite(Number(previousReplayTime))
          ? Number(previousReplayTime)
          : anchorEnd;
      const replayProgress =
        wasInReplay && allCandles.length > 1
          ? replayIndex / (allCandles.length - 1)
          : 0.3;
      let hasUsableCache = false;

      setLoading(true);
      setError('');
      setIsPlaying(false);
      setFollowReplay(!shouldFrameDrawings);
      setSelectedDrawingId(null);
      setTempDrawing(null);
      setTextInput(null);
      setIsReplayPricePickActive(false);
      pendingVisibleLogicalRangeRef.current = null;

      try {
        const interval = INTERVAL_MAP[timeframe];
        if (!interval) throw new Error(`Unsupported timeframe: ${timeframe}`);

        const rememberCandles = (cacheKey, candles) => {
          const cache = candleCacheRef.current;
          if (cache.has(cacheKey)) {
            cache.delete(cacheKey);
          }

          cache.set(cacheKey, {
            candles,
            cachedAt: Date.now(),
          });

          while (cache.size > CANDLE_CACHE_LIMIT) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
          }
        };

        const fetchCandles = async (requestParams, signal = controller.signal) => {
          const fetchOptions = {
            headers: { Accept: 'application/json' },
          };

          if (signal) {
            fetchOptions.signal = signal;
          }

          const response = await fetch(`/api/klines?${requestParams.toString()}`, fetchOptions);
          const result = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(result?.message || `HTTP ${response.status}`);
          }

          if (!result?.success) {
            throw new Error(result?.message || 'Failed to fetch candles');
          }

          const normalizedCandles = normalizeApiCandles(result.candles);

          if (!normalizedCandles.length) {
            throw new Error('No valid candle data returned');
          }

          return normalizedCandles;
        };

        const applyCandles = (normalized, { updateReplayState = true } = {}) => {
          setAllCandles(normalized);
          setLoadedTimeframe(timeframe);

          if (!updateReplayState) return;

          let nextReplayIndex = Math.min(
            normalized.length - 1,
            Math.max(0, Math.round((normalized.length - 1) * replayProgress))
          );

          if (wasInReplay && previousReplayTime != null) {
            const nearestReplayIndex = findNearestCandleIndex(normalized, previousReplayTime);
            if (nearestReplayIndex >= 0) {
              nextReplayIndex = nearestReplayIndex;
            }
          }

          if (shouldFrameDrawings) {
            const intervalSeconds = TIMEFRAME_SECONDS[timeframe] ?? 60;
            const frameLogicals = [
              previousReplayTime,
              ...drawingTimes,
            ]
              .map((time) => estimateDrawingLogicalFromTime(normalized, time, intervalSeconds))
              .filter((logical) => Number.isFinite(logical));

            if (frameLogicals.length) {
              const minLogical = Math.min(...frameLogicals, nextReplayIndex);
              const maxLogical = Math.max(...frameLogicals, nextReplayIndex);
              const span = Math.max(maxLogical - minLogical, 6);
              const padding = Math.max(6, span * 0.18);

              pendingVisibleLogicalRangeRef.current = {
                from: Math.max(minLogical - padding, -20),
                to: maxLogical + padding,
              };
            }
          }

          setReplayIndex(nextReplayIndex);
          setReplayMode(wasInReplay);
          setSelectedReplayPrice(
            wasInReplay
              ? previousSelectedReplayPrice ?? normalized[nextReplayIndex]?.close ?? null
              : null
          );
        };

        const params = new URLSearchParams({
          symbol,
          exchange,
          interval,
          category: marketCategory,
          limit: '1000',
          max_candles: wasInReplay ? '20000' : '5000',
        });

        if (wasInReplay && replayAnchorTime != null) {
          const intervalSeconds = TIMEFRAME_SECONDS[timeframe] ?? 60;
          const requestedCandles = 20000;
          const windowSeconds = intervalSeconds * requestedCandles;
          const forwardCandles = Math.max(250, Math.round(requestedCandles * 0.05));
          const nowMs = Date.now();
          const replayFocusedEnd = replayAnchorTime + (intervalSeconds * forwardCandles);
          const minimumEndForAnchors =
            anchorStart != null && anchorEnd != null && anchorEnd - anchorStart <= windowSeconds
              ? Math.min(anchorEnd + (intervalSeconds * 10), anchorStart + windowSeconds)
              : null;
          const anchoredEndSeconds = Math.max(
            replayFocusedEnd,
            minimumEndForAnchors ?? replayFocusedEnd
          );
          const anchoredEndMs = Math.min(nowMs, Math.round(anchoredEndSeconds * 1000));

          params.set('end', String(anchoredEndMs));
        }

        const cacheKey = buildCandleCacheKey({
          exchange,
          marketCategory,
          symbol,
          timeframe,
          end: params.get('end') ?? 'latest',
        });
        const cachedCandles = candleCacheRef.current.get(cacheKey)?.candles;

        if (cachedCandles?.length) {
          hasUsableCache = true;
          applyCandles(cachedCandles);
          setLoading(false);

          loadStoredDrawings()
            .then((saved) => {
              if (fetchRequestIdRef.current !== requestId) return;
              setDrawings(saved);
              drawingsRef.current = saved;
            })
            .catch(() => {
              if (fetchRequestIdRef.current !== requestId) return;
              setDrawings([]);
              drawingsRef.current = [];
            });
        }

        const normalized = await fetchCandles(params);

        if (fetchRequestIdRef.current !== requestId) return;

        rememberCandles(cacheKey, normalized);
        applyCandles(normalized);

        if (!wasInReplay) {
          const prefetchTimeframes = PREFETCH_TIMEFRAME_MAP[timeframe] ?? [];
          prefetchTimeframes.forEach((prefetchTimeframe) => {
            const prefetchInterval = INTERVAL_MAP[prefetchTimeframe];
            if (!prefetchInterval) return;

            const prefetchCacheKey = buildCandleCacheKey({
              exchange,
              marketCategory,
              symbol,
              timeframe: prefetchTimeframe,
            });

            if (candleCacheRef.current.has(prefetchCacheKey)) return;

            const prefetchParams = new URLSearchParams({
              symbol,
              exchange,
              interval: prefetchInterval,
              category: marketCategory,
              limit: '1000',
              max_candles: '5000',
            });

            fetchCandles(prefetchParams, null)
              .then((prefetchedCandles) => {
                rememberCandles(prefetchCacheKey, prefetchedCandles);
              })
              .catch(() => {});
          });
        }

        try {
          const saved = await loadStoredDrawings();
          if (fetchRequestIdRef.current !== requestId) return;
          setDrawings(saved);
          drawingsRef.current = saved;
        } catch {
          if (fetchRequestIdRef.current !== requestId) return;
          setDrawings([]);
          drawingsRef.current = [];
        }
      } catch (err) {
        if (fetchRequestIdRef.current !== requestId) return;
        if (err?.name === 'AbortError') return;
        setError(err.message || 'Failed to load chart');

        if (!hasUsableCache && !allCandles.length) {
          setAllCandles([]);
          setReplayMode(false);
          setSelectedReplayPrice(null);
          setDrawings([]);
          drawingsRef.current = [];
        } else if (wasInReplay) {
          setReplayMode(true);
          setSelectedReplayPrice(previousSelectedReplayPrice ?? allCandles[replayIndex]?.close ?? null);
        }
      } finally {
        if (fetchRequestIdRef.current === requestId) {
          if (candleFetchAbortRef.current === controller) {
            candleFetchAbortRef.current = null;
          }
          setLoading(false);
        }
      }
    }

    fetchKlines();

    return () => {
      candleFetchAbortRef.current?.abort();
    };
  }, [exchange, marketCategory, symbol, timeframe, getDrawingTimes, loadStoredDrawings]);

  const startReplayMode = (startIndex = Math.max(0, Math.floor(allCandles.length * 0.3))) => {
    const nextIndex = Math.min(Math.max(0, startIndex), Math.max(0, allCandles.length - 1));

    setReplayMode(true);
    setFollowReplay(true);
    setReplayIndex(nextIndex);
    setSelectedReplayPrice(allCandles[nextIndex]?.close ?? null);
    setIsReplayPricePickActive(false);
  };

  const toggleReplayMode = () => {
    setIsPlaying(false);

    if (!replayMode) {
      startReplayMode();
      return;
    }

    setReplayMode(false);
    setFollowReplay(true);
    setReplayIndex(Math.max(0, allCandles.length - 1));
    setSelectedReplayPrice(null);
    setTool(null);
    setTempDrawing(null);
    setTextInput(null);
    setIsReplayPricePickActive(false);
  };

  const stepBackward = () => {
    setIsPlaying(false);
    setFollowReplay(false);

    if (!replayMode) {
      const startIndex = Math.max(0, allCandles.length - 2);
      startReplayMode(startIndex);
      return;
    }

    setReplayIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      setSelectedReplayPrice(allCandles[next]?.close ?? null);
      return next;
    });
  };

  const stepForward = () => {
    setIsPlaying(false);
    setFollowReplay(false);

    if (!replayMode) {
      startReplayMode();
      return;
    }

    setReplayIndex((prev) => {
      const next = Math.min(prev + 1, allCandles.length - 1);
      setSelectedReplayPrice(allCandles[next]?.close ?? null);
      return next;
    });
  };

  const togglePlay = () => {
    if (!replayMode) {
      startReplayMode();
      setIsPlaying(true);
      return;
    }
    if (replayIndex >= allCandles.length - 1) return;
    setIsPlaying((prev) => !prev);
  };

  const resetReplay = () => {
    setIsPlaying(false);
    setFollowReplay(true);
    const latestIndex = Math.max(0, allCandles.length - 1);
    setReplayMode(true);
    setReplayIndex(latestIndex);
    setSelectedReplayPrice(allCandles[latestIndex]?.close ?? null);
    setTool(null);
    setTempDrawing(null);
    setTextInput(null);
    setIsReplayPricePickActive(false);
  };

  const handleFollowReplay = () => {
    setFollowReplay(true);
    const chart = chartRef.current;
    if (!chart) return;

    isProgrammaticRangeChangeRef.current = true;
    chart.timeScale().scrollToPosition(5, false);

    requestAnimationFrame(() => {
      isProgrammaticRangeChangeRef.current = false;
    });
  };

  const handleSaveText = () => {
    if (!textInput || !textDraft.trim()) {
      setTextInput(null);
      return;
    }

    const textSettings = getToolSettingsForType('text');
    const drawing = {
      id: `drawing-${Date.now()}`,
      type: 'text',
      point: textInput.point,
      text: textDraft.trim(),
      color: textSettings.color ?? drawingColor,
      labelText: textDraft.trim(),
      textBold: Boolean(textSettings.textBold),
      textItalic: Boolean(textSettings.textItalic),
    };

    appendDrawing(drawing);
    saveToolSettingsForType('text', {
      color: drawing.color,
      labelText: drawing.text,
      textBold: drawing.textBold,
      textItalic: drawing.textItalic,
    });

    setTextInput(null);
    setTextDraft('');
    setTool(null);
  };

  const handleToolChange = (nextTool) => {
    const resolvedTool = typeof nextTool === 'function' ? nextTool(toolRef.current) : nextTool;

    setTool(resolvedTool);
    if (resolvedTool) {
      setSelectedDrawingId(null);
    }
    setTempDrawing(null);
    setTextInput(null);
    setIsReplayPricePickActive(false);
  };

  const handleClearDrawings = () => {
    pushDrawingUndoSnapshot(selectedDrawingIdRef.current);
    saveDrawings([]);
    setSelectedDrawingId(null);
  };

  const handleDeleteSelectedDrawing = () => {
    if (!selectedDrawingId) return;

    pushDrawingUndoSnapshot(selectedDrawingId);
    const next = drawings.filter((d) => d.id !== selectedDrawingId);
    saveDrawings(next);
    setSelectedDrawingId(null);
  };

  const handleDrawingWidthChange = (strokeWidth) => {
    const selectedId = selectedDrawingIdRef.current;
    const selected = drawingsRef.current.find((drawing) => drawing.id === selectedId);
    const targetType = selected?.type ?? tempDrawingRef.current?.type ?? toolRef.current;

    if (!targetType) return;

    saveToolSettingsForType(targetType, { strokeWidth });

    if (tempDrawingRef.current?.type === targetType) {
      setTempDrawing((prev) => (prev ? { ...prev, strokeWidth } : prev));
    }

    if (!selectedId) return;

    const next = drawingsRef.current.map((drawing) => {
      if (drawing.id !== selectedId) return drawing;
      if (!isLineLikeDrawing(drawing) && !isPathDrawing(drawing) && !isPositionDrawing(drawing) && drawing.type !== 'rect') return drawing;

      return {
        ...drawing,
        strokeWidth,
      };
    });

    saveDrawings(next);
  };

  const handleDrawingLineStyleChange = (lineStyle) => {
    const selectedId = selectedDrawingIdRef.current;
    const selected = drawingsRef.current.find((drawing) => drawing.id === selectedId);
    const targetType = selected?.type ?? tempDrawingRef.current?.type ?? toolRef.current;
    const normalizedStyle = lineStyle === 'dashed' ? 'dashed' : 'solid';

    if (!targetType) return;

    saveToolSettingsForType(targetType, { lineStyle: normalizedStyle });

    if (tempDrawingRef.current?.type === targetType) {
      setTempDrawing((prev) => (prev ? { ...prev, lineStyle: normalizedStyle } : prev));
    }

    if (!selectedId) return;

    const next = drawingsRef.current.map((drawing) => {
      if (drawing.id !== selectedId) return drawing;
      if (!isLineLikeDrawing(drawing) && !isPathDrawing(drawing) && drawing.type !== 'rect') return drawing;

      return {
        ...drawing,
        lineStyle: normalizedStyle,
      };
    });

    saveDrawings(next);
  };

  const handleDrawingColorChange = (color) => {
    const selectedId = selectedDrawingIdRef.current;
    const selected = drawingsRef.current.find((drawing) => drawing.id === selectedId);
    const targetType = selected?.type ?? tempDrawingRef.current?.type ?? toolRef.current;

    setDrawingColor(color);

    if (tempDrawingRef.current) {
      setTempDrawing((prev) => (prev ? { ...prev, color } : prev));
    }

    if (targetType) {
      saveToolSettingsForType(targetType, { color });
    }

    if (!selectedId) return;

    const next = drawingsRef.current.map((drawing) => (
      drawing.id === selectedId
        ? { ...drawing, color }
        : drawing
    ));

    saveDrawings(next);
  };

  const handleDrawingLabelChange = (updates) => {
    const selectedId = selectedDrawingIdRef.current;
    const selected = drawingsRef.current.find((drawing) => drawing.id === selectedId);
    const targetType = selected?.type ?? tempDrawingRef.current?.type ?? toolRef.current;

    if (!targetType) return;

    const settingsUpdate = targetType === 'text'
      ? {
          ...(updates.labelText !== undefined || updates.text !== undefined
            ? { labelText: updates.labelText ?? updates.text ?? '' }
            : {}),
          ...(updates.textBold !== undefined ? { textBold: Boolean(updates.textBold) } : {}),
          ...(updates.textItalic !== undefined ? { textItalic: Boolean(updates.textItalic) } : {}),
        }
      : updates;

    saveToolSettingsForType(targetType, settingsUpdate);

    if (targetType === 'text' && typeof settingsUpdate.labelText === 'string') {
      setTextDraft(settingsUpdate.labelText);
    }

    if (tempDrawingRef.current?.type === targetType) {
      setTempDrawing((prev) => (prev ? { ...prev, ...updates } : prev));
    }

    if (!selectedId) return;

    const next = drawingsRef.current.map((drawing) => {
      if (
        drawing.id !== selectedId ||
        (!isLineLikeDrawing(drawing) && !isPathDrawing(drawing) && !isPositionDrawing(drawing) && drawing.type !== 'rect' && drawing.type !== 'text')
      ) {
        return drawing;
      }

      return {
        ...drawing,
        ...updates,
      };
    });

    saveDrawings(next);
  };

  const handleSaveSelectedToolPreset = (presetName) => {
    const selected = drawingsRef.current.find((drawing) => drawing.id === selectedDrawingIdRef.current);
    if (!selected || !PRESET_ENABLED_TOOL_TYPES.includes(selected.type)) return;

    const settings = buildToolSettingsFromDrawing(selected);
    const fallbackName = (
      selected.type === 'text'
        ? selected.text
        : selected.labelText
    )?.trim();
    const normalizedPresetName = (presetName ?? fallbackName ?? '').trim();

    if (!normalizedPresetName) return;

    saveToolPreset(selected.type, {
      name: normalizedPresetName,
      settings,
    });
    saveToolSettingsForType(selected.type, settings);
  };

  const handleApplyToolPreset = (type, preset) => {
    if (!type || !preset?.settings) return;

    const settings = preset.settings;

    saveToolSettingsForType(type, settings);

    if (settings.color) {
      setDrawingColor(settings.color);
    }

    if (toolRef.current === 'text' && settings.labelText) {
      setTextDraft(settings.labelText);
    }

    if (tempDrawingRef.current?.type === type) {
      setTempDrawing((prev) => (prev ? { ...prev, ...settings } : prev));
    }

    if (selectedDrawingIdRef.current) {
      const next = drawingsRef.current.map((drawing) => {
        if (drawing.id !== selectedDrawingIdRef.current || drawing.type !== type) {
          return drawing;
        }

        return {
          ...drawing,
          ...settings,
          ...(type === 'text' && settings.labelText ? { text: settings.labelText } : {}),
        };
      });

      saveDrawings(next);
    }
  };

  const handleDeleteToolPreset = (type, preset) => {
    deleteToolPreset(type, preset);
  };

  const handleCancelText = () => {
    setTextInput(null);
    setTool(null);
  };

  const handleSymbolChange = useCallback((value) => {
    const [nextExchange, nextCategory, ...symbolParts] = String(value).split(':');
    const nextSymbol = symbolParts.join(':') || nextCategory || nextExchange;

    setExchange(symbolParts.length ? nextExchange : 'bybit');
    setMarketCategory(symbolParts.length ? nextCategory : 'spot');
    setSymbol(nextSymbol);
  }, []);

  const handleAddSymbol = async (symbolToAdd) => {
    if (symbolToAdd?.preventDefault) {
      symbolToAdd.preventDefault();
    }

    const requestedSymbol = typeof symbolToAdd === 'string' ? symbolToAdd : symbolToAdd?.symbol;
    const requestedExchange = typeof symbolToAdd === 'object' ? symbolToAdd?.exchange : null;
    const selectedAvailableSymbol = availableSymbols.find((item) => (
      item.symbol === requestedSymbol
      && (!requestedExchange || item.exchange === requestedExchange)
      && (item.category ?? 'spot') === marketCategory
    ));
    const rawSymbol = selectedAvailableSymbol?.symbol ?? requestedSymbol ?? '';
    const normalizedSymbol = (selectedAvailableSymbol?.symbol ?? rawSymbol).trim().toUpperCase();
    if (!normalizedSymbol) return;

    setIsSavingSymbol(true);
    setSymbolError('');

    try {
      const response = await fetch('/api/market-symbols', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: normalizedSymbol,
          exchange: selectedAvailableSymbol?.exchange ?? 'bybit',
          exchange_symbol: selectedAvailableSymbol?.exchange_symbol ?? normalizedSymbol,
          coin_name: selectedAvailableSymbol?.coin_name ?? selectedAvailableSymbol?.baseCoin ?? normalizedSymbol,
          base_coin: selectedAvailableSymbol?.baseCoin ?? '',
          quote_coin: selectedAvailableSymbol?.quoteCoin ?? '',
          category: selectedAvailableSymbol?.category ?? marketCategory,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save symbol');
      }

      const savedSymbol = result.symbol;

      setSymbols((currentSymbols) => {
        if (currentSymbols.some((item) => (
          item.symbol === savedSymbol.symbol
          && (item.exchange ?? 'bybit') === (savedSymbol.exchange ?? 'bybit')
          && (item.category ?? 'spot') === (savedSymbol.category ?? 'spot')
        ))) {
          return currentSymbols.map((item) => (
            item.symbol === savedSymbol.symbol
            && (item.exchange ?? 'bybit') === (savedSymbol.exchange ?? 'bybit')
            && (item.category ?? 'spot') === (savedSymbol.category ?? 'spot')
              ? savedSymbol
              : item
          ));
        }

        return [...currentSymbols, savedSymbol].sort((a, b) => (
          a.symbol.localeCompare(b.symbol)
          || (a.exchange ?? '').localeCompare(b.exchange ?? '')
          || (a.category ?? '').localeCompare(b.category ?? '')
        ));
      });
      setExchange(savedSymbol.exchange ?? 'bybit');
      setMarketCategory(savedSymbol.category ?? 'spot');
      setSymbol(savedSymbol.symbol);
    } catch (err) {
      setSymbolError(err.message || 'Failed to save symbol');
    } finally {
      setIsSavingSymbol(false);
    }
  };

  const captureBacktestSnapshot = async () => {
    try {
      return await captureChartSnapshot(wrapperRef.current, chartTheme.background);
    } catch {
      return null;
    }
  };

  const handleOpenBacktestPosition = async ({
    side,
    orderType = 'market',
    notional,
    leverage,
    entryPrice,
    stopLoss,
    takeProfit,
  }) => {
    const fillPrice = getPositiveNumber(entryPrice) ?? getPositiveNumber(executionPrice);

    if (['conditional', 'limit', 'trigger'].includes(orderType) && getPositiveNumber(entryPrice) == null) {
      setBacktestError('Set an entry price for a pending order.');
      return;
    }

    if (fillPrice == null) {
      setBacktestError('No valid entry price is available for this position.');
      return;
    }

    setIsBacktestLoading(true);
    setBacktestError('');

    try {
      const previousPositionIds = new Set([
        ...(backtestAccount?.openPositions ?? []).map((position) => position.id),
        ...(backtestAccount?.pendingPositions ?? []).map((position) => position.id),
      ]);
      const snapshot = await captureBacktestSnapshot();
      const response = await axios.post('/market-backtest/positions', {
        symbol,
        session_id: backtestAccount?.activeSession?.id,
        exchange,
        category: marketCategory,
        timeframe,
        side,
        order_type: orderType,
        notional,
        leverage,
        price: fillPrice,
        executed_at_time: executionTime,
        ...(getPositiveNumber(stopLoss) != null ? { stop_loss: getPositiveNumber(stopLoss) } : {}),
        ...(getPositiveNumber(takeProfit) != null ? { take_profit: getPositiveNumber(takeProfit) } : {}),
      });

      const nextAccount = response.data?.account ?? null;
      setBacktestAccount(nextAccount);

      const createdPosition = [
        ...(nextAccount?.openPositions ?? []),
        ...(nextAccount?.pendingPositions ?? []),
      ].find((position) => !previousPositionIds.has(position.id));

      if (createdPosition && snapshot) {
        uploadBacktestSnapshot(createdPosition.id, 'entry', snapshot).catch(() => {});
      }
    } catch (err) {
      setBacktestError(err.response?.data?.message ?? err.message ?? 'Failed to open position');
    } finally {
      setIsBacktestLoading(false);
    }
  };

  quickOpenBacktestPositionRef.current = (side) => {
    const maxMargin = getMaxBacktestMarginForCash(
      backtestAccountRef.current?.cashBalance,
      1,
      backtestAccountRef.current?.feeRate ?? 0.0004
    );
    const notional = maxMargin == null ? 1000 : Math.max(Math.min(1000, maxMargin), 0);

    if (notional < 1) {
      setBacktestError('Insufficient paper balance for the minimum 1 USDT margin plus entry fee.');
      return;
    }

    handleOpenBacktestPosition({
      side,
      orderType: 'market',
      notional,
      leverage: 1,
    });
  };

  const uploadBacktestSnapshot = async (positionId, type, snapshot) => {
    if (!positionId || !snapshot) return;

    const formData = new FormData();
    formData.append('type', type);
    formData.append('snapshot', snapshot, `${type}-snapshot.png`);

    if (executionTime != null) {
      formData.append('captured_at_time', executionTime);
    }

    await axios.post(`/market-backtest/positions/${positionId}/snapshot`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const handleStartBacktestSession = async () => {
    setIsBacktestLoading(true);
    setBacktestError('');

    try {
      const response = await axios.post('/market-backtest/sessions', {
        symbol,
        exchange,
        category: marketCategory,
        timeframe,
        started_at_time: executionTime,
      });

      setBacktestAccount(response.data?.account ?? null);
    } catch (err) {
      setBacktestError(err.response?.data?.message ?? err.message ?? 'Failed to start session');
    } finally {
      setIsBacktestLoading(false);
    }
  };

  const handleEndBacktestSession = async () => {
    const sessionId = backtestAccount?.activeSession?.id;
    if (!sessionId) return;

    setIsBacktestLoading(true);
    setBacktestError('');

    try {
      const response = await axios.post(`/market-backtest/sessions/${sessionId}/end`, {
        ended_at_time: executionTime,
      });

      setBacktestAccount(response.data?.account ?? null);
    } catch (err) {
      setBacktestError(err.response?.data?.message ?? err.message ?? 'Failed to end session');
    } finally {
      setIsBacktestLoading(false);
    }
  };

  const handleTriggerBacktestPosition = async (
    positionId,
    entryPrice,
    entryTime = executionTime,
    { silent = false } = {}
  ) => {
    const triggerPrice = getPositiveNumber(entryPrice);

    if (!positionId || triggerPrice == null) {
      setBacktestError('No valid pending entry price is available.');
      return false;
    }

    if (!silent) {
      setIsBacktestLoading(true);
      setBacktestError('');
    }

    try {
      const snapshot = await captureBacktestSnapshot();
      const response = await axios.post(`/market-backtest/positions/${positionId}/trigger`, {
        price: triggerPrice,
        executed_at_time: entryTime,
      });

      setBacktestAccount(response.data?.account ?? null);
      if (snapshot) {
        uploadBacktestSnapshot(positionId, 'entry', snapshot).catch(() => {});
      }
      return true;
    } catch (err) {
      setBacktestError(err.response?.data?.message ?? err.message ?? 'Failed to trigger pending entry');
      return false;
    } finally {
      if (!silent) {
        setIsBacktestLoading(false);
      }
    }
  };

  triggerBacktestPositionRef.current = handleTriggerBacktestPosition;

  const handleCancelBacktestPosition = async (positionId) => {
    if (!positionId) return;

    setIsBacktestLoading(true);
    setBacktestError('');

    try {
      const response = await axios.post(`/market-backtest/positions/${positionId}/cancel`);
      setBacktestAccount(response.data?.account ?? null);
    } catch (err) {
      setBacktestError(err.response?.data?.message ?? err.message ?? 'Failed to cancel pending entry');
    } finally {
      setIsBacktestLoading(false);
    }
  };

  cancelBacktestPositionRef.current = handleCancelBacktestPosition;

  const handleCloseBacktestPosition = async (
    positionId,
    closePrice = executionPrice,
    closeTime = executionTime,
    { silent = false } = {}
  ) => {
    const exitPrice = getPositiveNumber(closePrice);

    if (!positionId || exitPrice == null) {
      setBacktestError('No replay price is available for closing.');
      return;
    }

    if (!silent) {
      setIsBacktestLoading(true);
      setBacktestError('');
    }

    try {
      const snapshot = await captureBacktestSnapshot();
      const response = await axios.post(`/market-backtest/positions/${positionId}/close`, {
        price: exitPrice,
        executed_at_time: closeTime,
      });

      setBacktestAccount(response.data?.account ?? null);
      if (snapshot) {
        uploadBacktestSnapshot(positionId, 'exit', snapshot).catch(() => {});
      }
      return true;
    } catch (err) {
      setBacktestError(err.response?.data?.message ?? err.message ?? 'Failed to close position');
      return false;
    } finally {
      if (!silent) {
        setIsBacktestLoading(false);
      }
    }
  };

  closeBacktestPositionRef.current = handleCloseBacktestPosition;

  const handleResetBacktestAccount = async (startingBalance = null) => {
    setIsBacktestLoading(true);
    setBacktestError('');

    try {
      const response = await axios.post('/market-backtest/reset', {
        ...(getPositiveNumber(startingBalance) != null ? { starting_balance: getPositiveNumber(startingBalance) } : {}),
      });
      setBacktestAccount(response.data?.account ?? null);
    } catch (err) {
      setBacktestError(err.response?.data?.message ?? err.message ?? 'Failed to reset backtest account');
    } finally {
      setIsBacktestLoading(false);
    }
  };

  useEffect(() => {
    if (!replayMode || !executionCandle || !backtestAccount?.pendingPositions?.length) return;

    const candleHigh = Number(executionCandle.high);
    const candleLow = Number(executionCandle.low);
    const candleTime = executionCandle.time;

    if (!Number.isFinite(candleHigh) || !Number.isFinite(candleLow)) return;

    const triggeredEntries = backtestAccount.pendingPositions
      .filter((position) => position.symbol === symbol)
      .filter((position) => Number(position.openedAtTime) !== Number(candleTime))
      .map((position) => {
        const entryPrice = Number(position.entryPrice);

        if (!Number.isFinite(entryPrice) || entryPrice <= 0) return null;
        if (candleLow > entryPrice || candleHigh < entryPrice) return null;

        return {
          id: position.id,
          entryPrice,
          key: `${position.id}:${candleTime}:entry`,
        };
      })
      .filter(Boolean)
      .filter((item) => !autoTriggeredPositionRef.current.has(item.key));

    if (!triggeredEntries.length) return;

    let cancelled = false;

    const openTriggeredEntries = async () => {
      setBacktestError('');

      for (const item of triggeredEntries) {
        if (cancelled) return;
        autoTriggeredPositionRef.current.add(item.key);
        const didOpen = await triggerBacktestPositionRef.current?.(item.id, item.entryPrice, candleTime, { silent: true });
        if (!didOpen) {
          autoTriggeredPositionRef.current.delete(item.key);
        }
      }
    };

    openTriggeredEntries();

    return () => {
      cancelled = true;
    };
  }, [backtestAccount, executionCandle, replayMode, symbol]);

  useEffect(() => {
    if (!replayMode || !executionCandle || !backtestAccount?.openPositions?.length) return;

    const candleHigh = Number(executionCandle.high);
    const candleLow = Number(executionCandle.low);
    const candleTime = executionCandle.time;

    if (!Number.isFinite(candleHigh) || !Number.isFinite(candleLow)) return;

    const triggeredPositions = backtestAccount.openPositions
      .filter((position) => position.symbol === symbol)
      .filter((position) => Number(position.openedAtTime) !== Number(candleTime))
      .map((position) => {
        const stopLoss = Number(position.stopLoss);
        const takeProfit = Number(position.takeProfit);
        const hasStopLoss = Number.isFinite(stopLoss) && stopLoss > 0;
        const hasTakeProfit = Number.isFinite(takeProfit) && takeProfit > 0;
        let exitPrice = null;
        let trigger = null;

        if (position.side === 'long') {
          if (hasStopLoss && candleLow <= stopLoss) {
            exitPrice = stopLoss;
            trigger = 'sl';
          } else if (hasTakeProfit && candleHigh >= takeProfit) {
            exitPrice = takeProfit;
            trigger = 'tp';
          }
        }

        if (position.side === 'short') {
          if (hasStopLoss && candleHigh >= stopLoss) {
            exitPrice = stopLoss;
            trigger = 'sl';
          } else if (hasTakeProfit && candleLow <= takeProfit) {
            exitPrice = takeProfit;
            trigger = 'tp';
          }
        }

        if (!exitPrice) return null;

        return {
          id: position.id,
          exitPrice,
          trigger,
          key: `${position.id}:${candleTime}:${trigger}`,
        };
      })
      .filter(Boolean)
      .filter((item) => !autoClosedPositionRef.current.has(item.key));

    if (!triggeredPositions.length) return;

    let cancelled = false;

    const closeTriggeredPositions = async () => {
      setBacktestError('');

      for (const item of triggeredPositions) {
        if (cancelled) return;
        autoClosedPositionRef.current.add(item.key);
        const didClose = await closeBacktestPositionRef.current?.(item.id, item.exitPrice, candleTime, { silent: true });
        if (!didClose) {
          autoClosedPositionRef.current.delete(item.key);
        }
      }
    };

    closeTriggeredPositions();

    return () => {
      cancelled = true;
    };
  }, [backtestAccount, executionCandle, replayMode, symbol]);

  const handleToggleFullscreen = () => {
    setIsFullscreen((current) => !current);
    scheduleOverlayRender();
  };

  return (
    <div
      ref={fullscreenRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-[9999] flex h-[100dvh] flex-col gap-3 overflow-hidden bg-black-screen-color p-4'
          : 'space-y-4'
      }
    >
      <ChartHeader
        symbol={symbol}
        exchange={exchange}
        marketCategory={marketCategory}
        symbols={symbols}
        availableSymbols={availableSymbols}
        isSavingSymbol={isSavingSymbol}
        isLoadingAvailableSymbols={isLoadingAvailableSymbols}
        symbolError={symbolError}
        timeframe={timeframe}
        replayMode={replayMode}
        currentPrice={currentPrice}
        selectedReplayPrice={selectedReplayPrice}
        candleColors={candleColors}
        candleSize={candleSize}
        onSymbolChange={handleSymbolChange}
        onCategoryChange={setMarketCategory}
        onAddSymbol={handleAddSymbol}
        onTimeframeChange={setTimeframe}
        onToggleReplayMode={toggleReplayMode}
        onCandleColorChange={setCandleColors}
        onCandleSizeChange={setCandleSize}
        chartTheme={chartTheme}
      />

      <div className={isFullscreen ? 'min-h-0 flex-1' : 'min-h-0'}>
        <div className={`relative min-w-0 ${isFullscreen ? 'h-full' : ''}`}>
          <ChartStage
            wrapperRef={wrapperRef}
            containerRef={containerRef}
            isFullscreen={isFullscreen}
            replayMode={replayMode}
            isSpacePressed={isSpacePressed}
            isReplayPricePickActive={isReplayPricePickActive}
            tool={tool}
            chartTheme={chartTheme}
            overlaySize={overlaySize}
            renderedDrawings={renderedDrawings}
            renderedBacktestOrders={renderedBacktestOrders}
            selectedDrawingId={selectedDrawingId}
            textInput={textInput}
            textDraft={textDraft}
            onTextDraftChange={setTextDraft}
            onSaveText={handleSaveText}
            onCancelText={handleCancelText}
            onToggleFullscreen={handleToggleFullscreen}
          />

          {(loading || error) && (
            <div
              data-chart-ui="chart-status"
              className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg text-sm font-medium backdrop-blur-[1px] ${
                loading
                  ? chartTheme.mode === 'dark'
                    ? 'text-white'
                    : 'text-slate-700'
                  : 'text-red-400'
              }`}
              style={{ backgroundColor: chartTheme.overlay }}
            >
              {loading ? (
                <ChartDotsLoader isDark={chartTheme.mode === 'dark'} />
              ) : error}
            </div>
          )}

          <ReplayPanel
            className="absolute left-3 top-3 z-30"
            replayMode={replayMode}
            isPlaying={isPlaying}
            followReplay={followReplay}
            isReplayPricePickActive={isReplayPricePickActive}
            playbackSpeed={playbackSpeed}
            replayIndex={replayIndex}
            candleCount={allCandles.length}
            tool={tool}
            drawingColor={drawingColor}
            drawings={drawings}
            selectedDrawingId={selectedDrawingId}
            selectedDrawing={selectedDrawing}
            toolSettings={toolSettings}
            symbol={symbol}
            executionPrice={executionPrice}
            backtestAccount={backtestAccount}
            backtestError={backtestError}
            isBacktestLoading={isBacktestLoading}
            onStepBackward={stepBackward}
            onTogglePlay={togglePlay}
            onStepForward={stepForward}
            onResetReplay={resetReplay}
            onFollowReplay={handleFollowReplay}
            onToggleReplayPricePick={() => setIsReplayPricePickActive((prev) => !prev)}
            onPlaybackSpeedChange={setPlaybackSpeed}
            onToolChange={handleToolChange}
            onDrawingColorChange={handleDrawingColorChange}
            onDrawingWidthChange={handleDrawingWidthChange}
            onDrawingLineStyleChange={handleDrawingLineStyleChange}
            onDrawingLabelChange={handleDrawingLabelChange}
            onSaveSelectedToolPreset={handleSaveSelectedToolPreset}
            onApplyToolPreset={handleApplyToolPreset}
            onDeleteToolPreset={handleDeleteToolPreset}
            onClearDrawings={handleClearDrawings}
            onDuplicateSelectedDrawing={handleDuplicateSelectedDrawing}
            onDeleteSelectedDrawing={handleDeleteSelectedDrawing}
            onStartBacktestSession={handleStartBacktestSession}
            onEndBacktestSession={handleEndBacktestSession}
            onOpenBacktestPosition={handleOpenBacktestPosition}
            onCloseBacktestPosition={handleCloseBacktestPosition}
            onCancelBacktestPosition={handleCancelBacktestPosition}
            onResetBacktestAccount={handleResetBacktestAccount}
            orderLineDraftPatch={orderLineDraftPatch}
            onBacktestOrderDraftChange={setBacktestOrderDraft}
            chartTheme={chartTheme}
          />
        </div>
      </div>
    </div>
  );
}
