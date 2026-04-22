import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';

const INTERVAL_MAP = {
  '1m': '1',
  '3m': '3',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '2h': '120',
  '4h': '240',
  '6h': '360',
  '12h': '720',
  '1d': 'D',
  '1w': 'W',
  '1M': 'M',
};

const TIMEFRAMES = [
  { value: '1m', label: '1 Minute' },
  { value: '3m', label: '3 Minutes' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '2h', label: '2 Hours' },
  { value: '4h', label: '4 Hours' },
  { value: '6h', label: '6 Hours' },
  { value: '12h', label: '12 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
  { value: '1M', label: '1 Month' },
];

const POPULAR_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'MATICUSDT',
  'LINKUSDT',
  'AVAXUSDT',
];

const CHART_HEIGHT = 520;
const DRAWING_COLOR = '#60a5fa';
const DRAWING_FILL = 'rgba(96, 165, 250, 0.16)';

function formatPrice(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '---';
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function normalizeApiCandles(rawCandles) {
  if (!Array.isArray(rawCandles)) return [];

  return rawCandles
    .map((c) => {
      const rawTime =
        c?.time ??
        c?.timestamp ??
        c?.openTime ??
        c?.open_time ??
        c?.t ??
        c?.[0];

      const open = c?.open ?? c?.o ?? c?.[1];
      const high = c?.high ?? c?.h ?? c?.[2];
      const low = c?.low ?? c?.l ?? c?.[3];
      const close = c?.close ?? c?.c ?? c?.[4];
      const volume = c?.volume ?? c?.v ?? c?.[5] ?? 0;

      let time = Number(rawTime);
      if (!Number.isFinite(time)) return null;

      if (time > 9999999999) {
        time = Math.floor(time / 1000);
      } else {
        time = Math.floor(time);
      }

      const candle = {
        time,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume),
      };

      if (
        !Number.isFinite(candle.time) ||
        !Number.isFinite(candle.open) ||
        !Number.isFinite(candle.high) ||
        !Number.isFinite(candle.low) ||
        !Number.isFinite(candle.close) ||
        !Number.isFinite(candle.volume)
      ) {
        return null;
      }

      return candle;
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
}

function findNearestCandleIndex(candles, targetTime) {
  if (!candles.length || targetTime == null) return -1;

  const numericTargetTime =
    typeof targetTime === 'object' && targetTime !== null
      ? ('timestamp' in targetTime ? Number(targetTime.timestamp) : Number(targetTime.time))
      : Number(targetTime);

  if (!Number.isFinite(numericTargetTime)) return -1;

  let nearestIndex = 0;
  let nearestDelta = Number.POSITIVE_INFINITY;

  for (let i = 0; i < candles.length; i += 1) {
    const delta = Math.abs(candles[i].time - numericTargetTime);
    if (delta < nearestDelta) {
      nearestDelta = delta;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

function normalizeRect(a, b) {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return Math.hypot(point.x - projX, point.y - projY);
}

function buildStorageKey(symbol, timeframe) {
  return `replay-drawings:${symbol}:${timeframe}`;
}

function offsetDrawing(drawing, deltaTime, deltaPrice) {
  if (drawing.type === 'line' || drawing.type === 'rect') {
    return {
      ...drawing,
      start: {
        time: drawing.start.time + deltaTime,
        price: drawing.start.price + deltaPrice,
      },
      end: {
        time: drawing.end.time + deltaTime,
        price: drawing.end.price + deltaPrice,
      },
    };
  }

  if (drawing.type === 'text') {
    return {
      ...drawing,
      point: {
        time: drawing.point.time + deltaTime,
        price: drawing.point.price + deltaPrice,
      },
    };
  }

  return drawing;
}

export default function TradingViewReplayChart({
  initialSymbol = 'BTCUSDT',
  initialTimeframe = '15m',
}) {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const replayTimerRef = useRef(null);
  const isProgrammaticRangeChangeRef = useRef(false);
  const selectedPriceLineRef = useRef(null);
  const isDraggingReplayPriceRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const toolRef = useRef(null);
  const tempDrawingRef = useRef(null);
  const drawingsRef = useRef([]);
  const selectedDrawingIdRef = useRef(null);
  const dragDrawingRef = useRef(null);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState(initialTimeframe);

  const [allCandles, setAllCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [followReplay, setFollowReplay] = useState(true);

  const [selectedReplayPrice, setSelectedReplayPrice] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const [tool, setTool] = useState(null); // 'line' | 'rect' | 'text' | null
  const [drawings, setDrawings] = useState([]);
  const [tempDrawing, setTempDrawing] = useState(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: CHART_HEIGHT });

  const [textInput, setTextInput] = useState(null);
  const [textDraft, setTextDraft] = useState('');

  const visibleCandles = useMemo(() => {
    if (!replayMode) return allCandles;
    return allCandles.slice(0, replayIndex + 1);
  }, [allCandles, replayMode, replayIndex]);

  const visibleVolume = useMemo(() => {
    return visibleCandles.map((c) => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? '#26a69a88' : '#ef535088',
    }));
  }, [visibleCandles]);

  const currentPrice = useMemo(() => {
    if (!visibleCandles.length) return null;
    return visibleCandles[visibleCandles.length - 1].close;
  }, [visibleCandles]);

  useEffect(() => {
    isSpacePressedRef.current = isSpacePressed;
  }, [isSpacePressed]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

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
    if (!wrapperRef.current) return;

    const updateSize = () => {
      const rect = wrapperRef.current.getBoundingClientRect();
      setOverlaySize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height || CHART_HEIGHT),
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapperRef.current);

    return () => observer.disconnect();
  }, []);

  const saveDrawings = useCallback((nextDrawings) => {
    setDrawings(nextDrawings);
    drawingsRef.current = nextDrawings;
    try {
      localStorage.setItem(buildStorageKey(symbol, timeframe), JSON.stringify(nextDrawings));
    } catch {}
  }, [symbol, timeframe]);

  const appendDrawing = useCallback((drawing) => {
    const next = [...drawingsRef.current, drawing];
    saveDrawings(next);
    setSelectedDrawingId(drawing.id);
  }, [saveDrawings]);

  const getChartCoordinates = useCallback((x, y) => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series || !allCandles.length) return null;

    const rawTime = chart.timeScale().coordinateToTime(x);
    const rawPrice = series.coordinateToPrice(y);

    if (rawTime == null || rawPrice == null) return null;

    const nearestIndex = findNearestCandleIndex(allCandles, rawTime);
    if (nearestIndex < 0) return null;

    return {
      time: allCandles[nearestIndex].time,
      price: Number(rawPrice),
    };
  }, [allCandles]);

  const toScreen = useCallback((time, price) => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return null;

    const x = chart.timeScale().timeToCoordinate(time);
    const y = series.priceToCoordinate(price);

    if (x == null || y == null) return null;
    return { x, y };
  }, []);

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

  const renderedDrawings = useMemo(() => {
    const all = [...drawings, ...(tempDrawing ? [tempDrawing] : [])];

    return all.map((drawing) => {
      if (drawing.type === 'line') {
        const p1 = toScreen(drawing.start.time, drawing.start.price);
        const p2 = toScreen(drawing.end.time, drawing.end.price);
        if (!p1 || !p2) return null;
        return { ...drawing, screen: { p1, p2 } };
      }

      if (drawing.type === 'rect') {
        const p1 = toScreen(drawing.start.time, drawing.start.price);
        const p2 = toScreen(drawing.end.time, drawing.end.price);
        if (!p1 || !p2) return null;
        return { ...drawing, screen: { p1, p2 } };
      }

      if (drawing.type === 'text') {
        const p = toScreen(drawing.point.time, drawing.point.price);
        if (!p) return null;
        return { ...drawing, screen: { p } };
      }

      return null;
    }).filter(Boolean);
  }, [drawings, tempDrawing, toScreen, replayIndex, overlaySize]);

  const hitTestDrawing = useCallback((x, y) => {
    const point = { x, y };

    for (let i = renderedDrawings.length - 1; i >= 0; i -= 1) {
      const d = renderedDrawings[i];

      if (d.type === 'line') {
        const { p1, p2 } = d.screen;
        if (distanceToSegment(point, p1, p2) <= 8) return d.id;
      }

      if (d.type === 'rect') {
        const { p1, p2 } = d.screen;
        const rect = normalizeRect(p1, p2);
        const inside =
          x >= rect.left &&
          x <= rect.left + rect.width &&
          y >= rect.top &&
          y <= rect.top + rect.height;

        if (inside) return d.id;
      }

      if (d.type === 'text') {
        const { p } = d.screen;
        if (Math.abs(x - p.x) <= 80 && Math.abs(y - p.y) <= 24) return d.id;
      }
    }

    return null;
  }, [renderedDrawings]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 800,
      height: CHART_HEIGHT,
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
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      borderVisible: true,
      priceLineVisible: true,
      lastValueVisible: true,
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
      if (isProgrammaticRangeChangeRef.current) return;
      setFollowReplay(false);
    };

    const handleChartClick = (param) => {
      if (!replayMode) return;
      if (isSpacePressedRef.current) return;
      if (toolRef.current) return;
      if (dragDrawingRef.current) return;
      if (!param?.point) return;
      setReplayPointFromCoordinates(param.point.x, param.point.y, true);
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
      });
    });

    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }

      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.unsubscribeClick(handleChartClick);

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [replayMode, setReplayPointFromCoordinates]);

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
  }, [visibleCandles, visibleVolume]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !allCandles.length) return;

    isProgrammaticRangeChangeRef.current = true;
    chart.timeScale().fitContent();

    requestAnimationFrame(() => {
      isProgrammaticRangeChangeRef.current = false;
    });
  }, [allCandles, symbol, timeframe]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !replayMode || !followReplay || !visibleCandles.length) return;

    isProgrammaticRangeChangeRef.current = true;
    chart.timeScale().scrollToPosition(5, false);

    requestAnimationFrame(() => {
      isProgrammaticRangeChangeRef.current = false;
    });
  }, [replayIndex, replayMode, followReplay, visibleCandles.length]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.applyOptions({
      handleScroll: isSpacePressed || !replayMode,
      handleScale: isSpacePressed || !replayMode,
    });
  }, [isSpacePressed, replayMode]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    if (selectedPriceLineRef.current) {
      candleSeries.removePriceLine(selectedPriceLineRef.current);
      selectedPriceLineRef.current = null;
    }

    if (replayMode && selectedReplayPrice != null) {
      selectedPriceLineRef.current = candleSeries.createPriceLine({
        price: selectedReplayPrice,
        color: '#60a5fa',
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
  }, [replayMode, selectedReplayPrice]);

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

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacePressed(true);
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedDrawingIdRef.current) {
        event.preventDefault();
        const next = drawingsRef.current.filter((d) => d.id !== selectedDrawingIdRef.current);
        saveDrawings(next);
        setSelectedDrawingId(null);
      }

      if (event.key === 'Escape') {
        setTempDrawing(null);
        setTool(null);
        setTextInput(null);
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacePressed(false);
        isDraggingReplayPriceRef.current = false;
        dragDrawingRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [saveDrawings]);

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

    const handleMouseDown = (event) => {
      if (!replayMode) return;
      if (isSpacePressedRef.current) {
        isDraggingReplayPriceRef.current = false;
        dragDrawingRef.current = null;
        return;
      }

      const { x, y } = getRelativePoint(event);

      if (toolRef.current === 'line' || toolRef.current === 'rect') {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        const currentTemp = tempDrawingRef.current;

        if (!currentTemp) {
          setTempDrawing({
            id: `temp-${Date.now()}`,
            type: toolRef.current,
            start: coords,
            end: coords,
          });
        } else {
          const completed = {
            id: `drawing-${Date.now()}`,
            type: currentTemp.type,
            start: currentTemp.start,
            end: coords,
          };
          appendDrawing(completed);
          setTempDrawing(null);
        }
        return;
      }

      if (toolRef.current === 'text') {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        setTextInput({
          x,
          y,
          point: coords,
        });
        setTextDraft('');
        return;
      }

      const hitId = hitTestDrawing(x, y);
      if (hitId) {
        setSelectedDrawingId(hitId);

        const coords = getChartCoordinates(x, y);
        const drawing = drawingsRef.current.find((d) => d.id === hitId);
        if (coords && drawing) {
          let anchor;
          if (drawing.type === 'line' || drawing.type === 'rect') {
            anchor = drawing.start;
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
      isDraggingReplayPriceRef.current = true;
      setReplayPointFromCoordinates(x, y, true);
    };

    const handleMouseMove = (event) => {
      if (!replayMode) return;
      if (isSpacePressedRef.current) return;

      const { x, y } = getRelativePoint(event);

      if ((toolRef.current === 'line' || toolRef.current === 'rect') && tempDrawingRef.current) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        setTempDrawing((prev) => {
          if (!prev) return prev;
          return { ...prev, end: coords };
        });
        return;
      }

      if (dragDrawingRef.current) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        const { drawingId, startMouse, originalDrawing } = dragDrawingRef.current;
        const deltaTime = coords.time - startMouse.time;
        const deltaPrice = coords.price - startMouse.price;

        const moved = offsetDrawing(originalDrawing, deltaTime, deltaPrice);
        const next = drawingsRef.current.map((d) => (d.id === drawingId ? moved : d));
        setDrawings(next);
        drawingsRef.current = next;
        return;
      }

      if (isDraggingReplayPriceRef.current) {
        setReplayPointFromCoordinates(x, y, true);
      }
    };

    const handleMouseUp = () => {
      isDraggingReplayPriceRef.current = false;

      if (dragDrawingRef.current) {
        saveDrawings(drawingsRef.current);
        dragDrawingRef.current = null;
      }
    };

    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [appendDrawing, getChartCoordinates, hitTestDrawing, replayMode, saveDrawings, setReplayPointFromCoordinates]);

  useEffect(() => {
    async function fetchKlines() {
      setLoading(true);
      setError('');
      setIsPlaying(false);
      setReplayMode(false);
      setFollowReplay(true);
      setSelectedReplayPrice(null);
      setSelectedDrawingId(null);
      setTempDrawing(null);
      setTool(null);
      setTextInput(null);

      try {
        const interval = INTERVAL_MAP[timeframe];
        if (!interval) throw new Error(`Unsupported timeframe: ${timeframe}`);

        const params = new URLSearchParams({
          symbol,
          interval,
          category: 'spot',
          limit: '1000',
        });

        const response = await fetch(`/api/klines?${params.toString()}`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch candles');
        }

        const normalized = normalizeApiCandles(result.candles);

        if (!normalized.length) {
          throw new Error('No valid candle data returned');
        }

        setAllCandles(normalized);
        setReplayIndex(Math.max(0, Math.floor(normalized.length * 0.3)));

        try {
          const raw = localStorage.getItem(buildStorageKey(symbol, timeframe));
          const saved = raw ? JSON.parse(raw) : [];
          setDrawings(Array.isArray(saved) ? saved : []);
          drawingsRef.current = Array.isArray(saved) ? saved : [];
        } catch {
          setDrawings([]);
          drawingsRef.current = [];
        }
      } catch (err) {
        setError(err.message || 'Failed to load chart');
        setAllCandles([]);
        setDrawings([]);
        drawingsRef.current = [];
      } finally {
        setLoading(false);
      }
    }

    fetchKlines();
  }, [symbol, timeframe]);

  const toggleReplayMode = () => {
    setIsPlaying(false);

    if (!replayMode) {
      const startIndex = Math.max(0, Math.floor(allCandles.length * 0.3));
      setReplayMode(true);
      setFollowReplay(true);
      setReplayIndex(startIndex);
      setSelectedReplayPrice(allCandles[startIndex]?.close ?? null);
      return;
    }

    setReplayMode(false);
    setFollowReplay(true);
    setReplayIndex(Math.max(0, allCandles.length - 1));
    setSelectedReplayPrice(null);
    setTool(null);
    setTempDrawing(null);
    setTextInput(null);
  };

  const stepBackward = () => {
    setIsPlaying(false);
    setFollowReplay(false);
    setReplayIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      setSelectedReplayPrice(allCandles[next]?.close ?? null);
      return next;
    });
  };

  const stepForward = () => {
    setIsPlaying(false);
    setFollowReplay(false);
    setReplayIndex((prev) => {
      const next = Math.min(prev + 1, allCandles.length - 1);
      setSelectedReplayPrice(allCandles[next]?.close ?? null);
      return next;
    });
  };

  const togglePlay = () => {
    if (!replayMode) return;
    if (replayIndex >= allCandles.length - 1) return;
    setIsPlaying((prev) => !prev);
  };

  const resetReplay = () => {
    setIsPlaying(false);
    setReplayMode(false);
    setFollowReplay(true);
    setReplayIndex(Math.max(0, allCandles.length - 1));
    setSelectedReplayPrice(null);
    setTool(null);
    setTempDrawing(null);
    setTextInput(null);
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

    appendDrawing({
      id: `drawing-${Date.now()}`,
      type: 'text',
      point: textInput.point,
      text: textDraft.trim(),
    });

    setTextInput(null);
    setTextDraft('');
    setTool(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-800 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Symbol</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white"
            >
              {POPULAR_SYMBOLS.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf.value} value={tf.value}>
                  {tf.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Replay</label>
            <button
              onClick={toggleReplayMode}
              className={`w-full rounded-lg p-2 text-lg font-bold text-white ${
                replayMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {replayMode ? 'Exit Replay Mode' : 'Replay Mode'}
            </button>
          </div>

          <div className="flex items-end">
            <div className="text-white">
              <div className="text-sm text-gray-400">
                {replayMode ? 'Replay Price' : 'Current Price'}
              </div>
              <div className="text-2xl font-bold text-green-500">
                ${formatPrice(currentPrice)}
              </div>
              {replayMode && (
                <div className="mt-1 text-xs text-blue-400">
                  Selected: ${formatPrice(selectedReplayPrice)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {replayMode && (
        <div className="rounded-lg bg-gray-800 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={stepBackward}
              className="rounded-lg bg-gray-700 px-3 py-2 text-white hover:bg-gray-600"
            >
              ◀
            </button>

            <button
              onClick={togglePlay}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={stepForward}
              className="rounded-lg bg-gray-700 px-3 py-2 text-white hover:bg-gray-600"
            >
              ▶
            </button>

            <button
              onClick={resetReplay}
              className="rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-500"
            >
              Reset
            </button>

            <button
              onClick={handleFollowReplay}
              className={`rounded-lg px-3 py-2 text-white ${
                followReplay ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {followReplay ? 'Following' : 'Follow Replay'}
            </button>

            <div className="ml-4 flex flex-wrap items-center gap-1">
              <span className="text-xs text-white">Speed:</span>
              {[
                { label: '0.25x', value: 3000 },
                { label: '0.5x', value: 2000 },
                { label: '1x', value: 1000 },
                { label: '2x', value: 500 },
                { label: '4x', value: 250 },
                { label: '10x', value: 100 },
              ].map((speed) => (
                <button
                  key={speed.value}
                  onClick={() => setPlaybackSpeed(speed.value)}
                  className={`rounded px-2 py-1 text-xs text-white ${
                    playbackSpeed === speed.value ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  {speed.label}
                </button>
              ))}
            </div>

            <div className="ml-auto text-xs text-gray-300">
              Candle {Math.min(replayIndex + 1, allCandles.length)} / {allCandles.length}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setTool((prev) => prev === 'line' ? null : 'line');
                setTempDrawing(null);
                setTextInput(null);
              }}
              className={`rounded-lg px-3 py-2 text-white ${tool === 'line' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Line
            </button>

            <button
              onClick={() => {
                setTool((prev) => prev === 'rect' ? null : 'rect');
                setTempDrawing(null);
                setTextInput(null);
              }}
              className={`rounded-lg px-3 py-2 text-white ${tool === 'rect' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Box
            </button>

            <button
              onClick={() => {
                setTool((prev) => prev === 'text' ? null : 'text');
                setTempDrawing(null);
                setTextInput(null);
              }}
              className={`rounded-lg px-3 py-2 text-white ${tool === 'text' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Text
            </button>

            <button
              onClick={() => {
                saveDrawings([]);
                setSelectedDrawingId(null);
              }}
              disabled={!drawings.length}
              className="rounded-lg bg-red-600 px-3 py-2 text-white disabled:opacity-40"
            >
              Clear Drawings
            </button>

            <button
              onClick={() => {
                if (!selectedDrawingId) return;
                const next = drawings.filter((d) => d.id !== selectedDrawingId);
                saveDrawings(next);
                setSelectedDrawingId(null);
              }}
              disabled={!selectedDrawingId}
              className="rounded-lg bg-red-700 px-3 py-2 text-white disabled:opacity-40"
            >
              Delete Selected
            </button>
          </div>

          <div className="text-xs text-gray-400">
            Hold Space to pan. Release Space to interact. With no tool selected, click or drag to move replay. Drawings can be selected and dragged.
          </div>
        </div>
      )}

      {loading && (
        <div className="flex h-24 items-center justify-center rounded-lg bg-gray-900 text-white">
          Loading...
        </div>
      )}

      {!loading && error && (
        <div className="flex h-24 items-center justify-center rounded-lg bg-gray-900 text-red-400">
          {error}
        </div>
      )}

      <div
        ref={wrapperRef}
        className="relative overflow-hidden rounded-lg bg-[#081631]"
        style={{
          height: `${CHART_HEIGHT}px`,
          cursor: replayMode
            ? (isSpacePressed ? 'grab' : tool ? 'crosshair' : 'default')
            : 'default',
        }}
      >
        <div ref={containerRef} className="absolute inset-0 z-0" />

        <svg
          className="pointer-events-none absolute inset-0 z-10"
          width={overlaySize.width}
          height={overlaySize.height}
          style={{ width: '100%', height: '100%' }}
        >
          {renderedDrawings.map((d) => {
            const isSelected = d.id === selectedDrawingId;
            const stroke = isSelected ? '#fbbf24' : DRAWING_COLOR;
            const strokeWidth = isSelected ? 3 : 2;

            if (d.type === 'line') {
              return (
                <line
                  key={d.id}
                  x1={d.screen.p1.x}
                  y1={d.screen.p1.y}
                  x2={d.screen.p2.x}
                  y2={d.screen.p2.y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={d.id.startsWith('temp-') ? '5,5' : undefined}
                />
              );
            }

            if (d.type === 'rect') {
              const rect = normalizeRect(d.screen.p1, d.screen.p2);
              return (
                <rect
                  key={d.id}
                  x={rect.left}
                  y={rect.top}
                  width={Math.max(rect.width, 1)}
                  height={Math.max(rect.height, 1)}
                  fill={d.id.startsWith('temp-') ? 'rgba(96, 165, 250, 0.08)' : DRAWING_FILL}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={d.id.startsWith('temp-') ? '5,5' : undefined}
                  rx={4}
                />
              );
            }

            return null;
          })}
        </svg>

        {renderedDrawings
          .filter((d) => d.type === 'text')
          .map((d) => {
            const isSelected = d.id === selectedDrawingId;
            return (
              <div
                key={d.id}
                className="pointer-events-none absolute z-10"
                style={{
                  left: d.screen.p.x + 8,
                  top: d.screen.p.y - 10,
                  transform: 'translateY(-50%)',
                }}
              >
                <div
                  className="rounded border px-2 py-1 text-xs text-white shadow-lg"
                  style={{
                    borderColor: isSelected ? '#fbbf24' : DRAWING_COLOR,
                    background: 'rgba(15, 23, 42, 0.9)',
                  }}
                >
                  {d.text}
                </div>
              </div>
            );
          })}

        {textInput && (
          <div
            className="absolute z-20 w-56 rounded-lg border border-blue-500 bg-slate-900 p-3 shadow-2xl"
            style={{
              left: Math.min(textInput.x + 12, Math.max(overlaySize.width - 240, 12)),
              top: Math.max(textInput.y - 12, 12),
            }}
          >
            <div className="mb-2 text-xs font-medium text-gray-300">Text label</div>
            <input
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder="Enter note"
              autoFocus
              className="mb-2 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveText();
                if (e.key === 'Escape') {
                  setTextInput(null);
                  setTool(null);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveText}
                className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setTextInput(null);
                  setTool(null);
                }}
                className="rounded bg-gray-700 px-3 py-2 text-xs font-medium text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}