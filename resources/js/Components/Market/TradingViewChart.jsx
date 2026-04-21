import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';

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

const CHART_HEIGHT = 500;
const DEFAULT_DRAWING_COLOR = '#60a5fa';

function formatPrice(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '---';
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toFixed(2);
}

function buildVolumeData(candles) {
  return candles.map((candle) => ({
    time: candle.time,
    value: candle.volume,
    color: candle.close >= candle.open ? '#26a69a80' : '#ef535080',
  }));
}

function buildStorageKey(symbol, timeframe) {
  return `replay-drawings:${symbol}:${timeframe}`;
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

function logicalToCanvasPoint(point, width, height, visibleCandles, minPrice, maxPrice) {
  if (!point || !visibleCandles.length || width <= 0 || height <= 0) return null;

  const index = visibleCandles.findIndex((c) => c.time === point.time);
  if (index < 0) return null;

  const leftPad = 16;
  const rightPad = 16;
  const topPad = 16;
  const bottomPad = 16;

  const plotWidth = Math.max(width - leftPad - rightPad, 1);
  const plotHeight = Math.max(height - topPad - bottomPad, 1);

  const x =
    visibleCandles.length === 1
      ? leftPad + plotWidth / 2
      : leftPad + (index / (visibleCandles.length - 1)) * plotWidth;

  const safeMin = Number.isFinite(minPrice) ? minPrice : 0;
  const safeMax = Number.isFinite(maxPrice) ? maxPrice : 1;
  const range = Math.max(safeMax - safeMin, 0.0000001);
  const y = topPad + ((safeMax - point.price) / range) * plotHeight;

  return { x, y };
}

function hitTestDrawing(drawing, cursor, width, height, visibleCandles, minPrice, maxPrice) {
  const p1 = logicalToCanvasPoint(drawing.points?.[0], width, height, visibleCandles, minPrice, maxPrice);
  if (!p1) return false;

  if (drawing.type === 'text') {
    return Math.abs(cursor.x - p1.x) <= 60 && Math.abs(cursor.y - p1.y) <= 20;
  }

  const p2 = logicalToCanvasPoint(drawing.points?.[1], width, height, visibleCandles, minPrice, maxPrice);
  if (!p2) return false;

  if (drawing.type === 'line') {
    return distanceToSegment(cursor, p1, p2) <= 8;
  }

  if (drawing.type === 'rect') {
    const rect = normalizeRect(p1, p2);
    const inside =
      cursor.x >= rect.left &&
      cursor.x <= rect.left + rect.width &&
      cursor.y >= rect.top &&
      cursor.y <= rect.top + rect.height;

    if (inside) return true;

    const nearLeft = Math.abs(cursor.x - rect.left) <= 6 && cursor.y >= rect.top && cursor.y <= rect.top + rect.height;
    const nearRight = Math.abs(cursor.x - (rect.left + rect.width)) <= 6 && cursor.y >= rect.top && cursor.y <= rect.top + rect.height;
    const nearTop = Math.abs(cursor.y - rect.top) <= 6 && cursor.x >= rect.left && cursor.x <= rect.left + rect.width;
    const nearBottom = Math.abs(cursor.y - (rect.top + rect.height)) <= 6 && cursor.x >= rect.left && cursor.x <= rect.left + rect.width;
    return nearLeft || nearRight || nearTop || nearBottom;
  }

  return false;
}

const TradingViewChart = ({ symbol = 'BTCUSDT', timeframe = '1h' }) => {
  const chartRef = useRef(null);
  const replayIntervalRef = useRef(null);
  const chartWrapperRef = useRef(null);

  const latestStateRef = useRef({ replayMode: false, replayIndex: 0, allCandles: [] });
  const drawingsRef = useRef([]);
  const drawingToolRef = useRef('none');
  const draftDrawingRef = useRef(null);
  const symbolRef = useRef(symbol);
  const timeframeRef = useRef(timeframe);

  const [allCandles, setAllCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [currentLivePrice, setCurrentLivePrice] = useState(null);

  const [drawingTool, setDrawingTool] = useState('none');
  const [seekMode, setSeekMode] = useState(false);
  const [drawings, setDrawings] = useState([]);
  const [draftDrawing, setDraftDrawing] = useState(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
  const [hoveredDrawingId, setHoveredDrawingId] = useState(null);
  const [textDraft, setTextDraft] = useState('');
  const [textInput, setTextInput] = useState(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: CHART_HEIGHT });
  const [isDraggingPrice, setIsDraggingPrice] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPrice, setDragStartPrice] = useState(null);

  const volumeData = useMemo(() => buildVolumeData(allCandles), [allCandles]);

  const visibleCandles = useMemo(() => {
    if (!replayMode) return allCandles;
    return allCandles.slice(0, replayIndex + 1);
  }, [allCandles, replayMode, replayIndex]);

  const visibleVolume = useMemo(() => {
    if (!replayMode) return volumeData;
    return volumeData.slice(0, replayIndex + 1);
  }, [volumeData, replayMode, replayIndex]);

  const candleCategories = useMemo(
    () => visibleCandles.map((c) => new Date(c.time * 1000).toLocaleString()),
    [visibleCandles]
  );

  const priceStats = useMemo(() => {
    if (!visibleCandles.length) {
      return { min: 0, max: 1 };
    }

    const lows = visibleCandles.map((c) => c.low);
    const highs = visibleCandles.map((c) => c.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const padding = Math.max((max - min) * 0.05, max * 0.002 || 1);

    return {
      min: min - padding,
      max: max + padding,
    };
  }, [visibleCandles]);

  useEffect(() => {
    latestStateRef.current = { replayMode, replayIndex, allCandles };
  }, [replayMode, replayIndex, allCandles]);

  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  useEffect(() => {
    drawingToolRef.current = drawingTool;
  }, [drawingTool]);

  useEffect(() => {
    draftDrawingRef.current = draftDrawing;
  }, [draftDrawing]);

  useEffect(() => {
    symbolRef.current = symbol;
  }, [symbol]);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  useEffect(() => {
    if (!chartWrapperRef.current) return;

    const updateSize = () => {
      const rect = chartWrapperRef.current.getBoundingClientRect();
      setChartSize({
        width: rect.width,
        height: rect.height || CHART_HEIGHT,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(chartWrapperRef.current);

    return () => observer.disconnect();
  }, []);

  const saveDrawings = useCallback((updater) => {
    setDrawings((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(buildStorageKey(symbolRef.current, timeframeRef.current), JSON.stringify(next));
      } catch {
        // ignore localStorage failures
      }
      return next;
    });
  }, []);

  const appendDrawing = useCallback((drawing) => {
    saveDrawings((prev) => [...prev, drawing]);
    setSelectedDrawingId(drawing.id);
  }, [saveDrawings]);

  const removeSelectedDrawing = useCallback(() => {
    setSelectedDrawingId((currentSelectedId) => {
      if (!currentSelectedId) return currentSelectedId;
      saveDrawings((prev) => prev.filter((item) => item.id !== currentSelectedId));
      return null;
    });
  }, [saveDrawings]);

  const screenPointToLogicalPoint = useCallback((x, y, useChartHeight = true) => {
    if (!visibleCandles.length || chartSize.width <= 0 || chartSize.height <= 0) return null;

    const leftPad = 48;
    const rightPad = 60;
    const topPad = 24;
    const bottomPad = 16;

    const plotHeight = chartSize.height * 0.58;
    const plotWidth = Math.max(chartSize.width - leftPad - rightPad, 1);
    const effectivePlotHeight = Math.max(plotHeight - topPad - bottomPad, 1);

    const clampedX = Math.max(leftPad, Math.min(x, leftPad + plotWidth));
    const ratio = visibleCandles.length === 1 ? 0 : (clampedX - leftPad) / plotWidth;
    const index = Math.max(0, Math.min(visibleCandles.length - 1, Math.round(ratio * (visibleCandles.length - 1))));
    const candle = visibleCandles[index];
    if (!candle) return null;

    const clampedY = Math.max(topPad, Math.min(y, topPad + effectivePlotHeight));
    const priceRatio = (clampedY - topPad) / effectivePlotHeight;
    const price = priceStats.max - priceRatio * (priceStats.max - priceStats.min);

    return {
      time: candle.time,
      price,
      x,
      y,
      index,
    };
  }, [visibleCandles, chartSize, priceStats]);

  const renderedDrawings = useMemo(() => {
    return [...drawings, ...(draftDrawing ? [draftDrawing] : [])]
      .map((drawing) => {
        const first = logicalToCanvasPoint(
          drawing.points?.[0],
          chartSize.width,
          chartSize.height * 0.58,
          visibleCandles,
          priceStats.min,
          priceStats.max
        );
        if (!first) return null;

        if (drawing.type === 'text') {
          return { ...drawing, canvasPoints: [first] };
        }

        const second = logicalToCanvasPoint(
          drawing.points?.[1],
          chartSize.width,
          chartSize.height * 0.58,
          visibleCandles,
          priceStats.min,
          priceStats.max
        );
        if (!second) return null;

        return { ...drawing, canvasPoints: [first, second] };
      })
      .filter(Boolean);
  }, [drawings, draftDrawing, chartSize, visibleCandles, priceStats]);

  const chartOption = useMemo(() => {
    const candlestickData = visibleCandles.map((c) => [c.open, c.close, c.low, c.high]);
    const volumeSeriesData = visibleVolume.map((v, idx) => ({
      value: v.value,
      itemStyle: { color: v.color },
      name: candleCategories[idx],
    }));

    return {
      animation: false,
      backgroundColor: '#1a1a2e',
      textStyle: {
        color: '#d1d4dc',
      },
      axisPointer: {
        link: [{ xAxisIndex: [0, 1] }],
        trigger: 'axis',
      },
      grid: [
        { left: 48, right: 60, top: 24, height: '58%' },
        { left: 48, right: 60, top: '76%', height: '16%' },
      ],
      tooltip: {
        show: false,
        trigger: 'none',
      },
      xAxis: [
        {
          type: 'category',
          data: candleCategories,
          scale: true,
          boundaryGap: false,
          axisLine: { lineStyle: { color: '#2B2B43' } },
          axisLabel: { color: '#d1d4dc', hideOverlap: true },
          splitLine: { show: false },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: candleCategories,
          scale: true,
          boundaryGap: false,
          axisLine: { lineStyle: { color: '#2B2B43' } },
          axisLabel: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      ],
      yAxis: [
        {
          scale: true,
          position: 'right',
          axisLine: { lineStyle: { color: '#2B2B43' } },
          axisLabel: { color: '#d1d4dc' },
          splitLine: { lineStyle: { color: '#2B2B43' } },
        },
        {
          scale: true,
          gridIndex: 1,
          position: 'right',
          axisLine: { lineStyle: { color: '#2B2B43' } },
          axisLabel: { color: '#d1d4dc' },
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          zoomLock: false,
          filterMode: 'none',
          moveOnMouseWheel: true,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          preventDefaultMouseMove: false,
          throttle: 50,
        },
        {
          show: true,
          type: 'slider',
          xAxisIndex: [0, 1],
          bottom: 4,
          height: 18,
          borderColor: '#2B2B43',
          backgroundColor: '#111827',
          fillerColor: 'rgba(96, 165, 250, 0.25)',
          handleStyle: { color: '#60a5fa' },
          textStyle: { color: '#d1d4dc' },
          zoomLock: false,
          filterMode: 'none',
          throttle: 50,
        },
      ],
      series: [
        {
          name: 'Price',
          type: 'candlestick',
          data: candlestickData,
          itemStyle: {
            color: '#26a69a',
            color0: '#ef5350',
            borderColor: '#26a69a',
            borderColor0: '#ef5350',
          },
          markLine: selectedPrice !== null ? {
            silent: true,
            symbol: 'none',
            label: {
              show: true,
              position: 'end',
              formatter: () => formatPrice(selectedPrice),
              color: '#60a5fa',
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              padding: [2, 4],
              borderRadius: 2,
            },
            lineStyle: {
              color: '#60a5fa',
              width: 1,
              type: 'dashed',
            },
            data: [{ yAxis: selectedPrice }],
          } : undefined,
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumeSeriesData,
          barWidth: '60%',
        },
      ],
    };
  }, [visibleCandles, visibleVolume, candleCategories, selectedPrice]);

  useEffect(() => {
    const instance = chartRef.current?.getEchartsInstance?.();
    if (!instance) return;

    const zrenderInstance = instance.getZr();
    if (!zrenderInstance) return;

    const onClick = (e) => {
      if (!e || !e.offsetX) return;

      if (e.target && e.target.type !== 'empty') return;

      const logicalPoint = screenPointToLogicalPoint(e.offsetX, e.offsetY);
      if (!logicalPoint) return;

      const cursor = { x: e.offsetX, y: e.offsetY };
      const hit = [...drawingsRef.current].reverse().find((item) =>
        hitTestDrawing(
          item,
          cursor,
          chartSize.width,
          chartSize.height * 0.58,
          visibleCandles,
          priceStats.min,
          priceStats.max
        )
      );

      const currentTool = drawingToolRef.current;
      const currentDraft = draftDrawingRef.current;

      if (currentTool === 'none') {
        if (hit) {
          setSelectedDrawingId(hit.id);
          return;
        }

        if (!seekMode) {
          setSelectedDrawingId(null);
          return;
        }

        const {
          replayMode: latestReplayMode,
          replayIndex: latestReplayIndex,
          allCandles: latestCandles,
        } = latestStateRef.current;

        if (!latestReplayMode) return;

        if (logicalPoint.index >= 0 && logicalPoint.index < latestReplayIndex) {
          setReplayIndex(logicalPoint.index);
          setIsPlaying(false);
          setSelectedPrice(latestCandles[logicalPoint.index]?.close ?? null);
          setSelectedDrawingId(null);
        }
        return;
      }

      setSelectedDrawingId(null);

      if (currentTool === 'text') {
        setTextInput({
          x: logicalPoint.x,
          y: logicalPoint.y,
          point: { time: logicalPoint.time, price: logicalPoint.price },
        });
        setTextDraft('');
        return;
      }

      if (!currentDraft) {
        setDraftDrawing({
          id: `draft-${Date.now()}`,
          type: currentTool,
          points: [
            { time: logicalPoint.time, price: logicalPoint.price },
            { time: logicalPoint.time, price: logicalPoint.price },
          ],
          style: {
            color: DEFAULT_DRAWING_COLOR,
            fillColor: 'rgba(96, 165, 250, 0.18)',
          },
        });
        return;
      }

      const completed = {
        ...currentDraft,
        id: `drawing-${Date.now()}`,
        points: [currentDraft.points[0], { time: logicalPoint.time, price: logicalPoint.price }],
      };

      appendDrawing(completed);
      setDraftDrawing(null);
    };

    const onMouseDown = (e) => {
      if (!e || !e.offsetX) return;

      if (e.target && e.target.type !== 'empty') return;

      const isOnPriceAxis = e.offsetX > chartSize.width - 70;
      
      if (isOnPriceAxis && drawingTool === 'none') {
        setIsDraggingPrice(true);
        setDragStartY(e.offsetY);
        
        const logicalPoint = screenPointToLogicalPoint(e.offsetX, e.offsetY);
        if (logicalPoint) {
          setDragStartPrice(logicalPoint.price);
        }
      }
    };

    const onMouseUp = () => {
      setIsDraggingPrice(false);
    };

    const onMouseMove = (e) => {
      if (!e || !e.offsetX) return;

      if (e.target && e.target.type !== 'empty') return;

      if (isDraggingPrice) {
        const chartHeight = chartSize.height * 0.58;
        const topPad = 24;
        const bottomPad = 16;
        const plotHeight = Math.max(chartHeight - topPad - bottomPad, 1);
        
        const deltaY = e.offsetY - dragStartY;
        const priceDelta = (-deltaY / plotHeight) * (priceStats.max - priceStats.min);
        const newPrice = Math.max(priceStats.min, Math.min(priceStats.max, dragStartPrice + priceDelta));
        
        setSelectedPrice(newPrice);
        return;
      }

      const logicalPoint = screenPointToLogicalPoint(e.offsetX, e.offsetY);
      if (!logicalPoint) return;

      if (logicalPoint.index >= 0 && visibleCandles[logicalPoint.index]) {
        const candle = visibleCandles[logicalPoint.index];
        setSelectedPrice((prev) => {
          const next = candle.close;
          return prev === next ? prev : next;
        });
      }

      const nextPoint = { x: e.offsetX, y: e.offsetY };
      const hit =
        [...drawingsRef.current].reverse().find((item) =>
          hitTestDrawing(
            item,
            nextPoint,
            chartSize.width,
            chartSize.height * 0.58,
            visibleCandles,
            priceStats.min,
            priceStats.max
          )
        ) || null;

      setHoveredDrawingId((prev) => {
        const next = hit?.id ?? null;
        return prev === next ? prev : next;
      });

      const currentDraft = draftDrawingRef.current;
      if (currentDraft && (currentDraft.type === 'line' || currentDraft.type === 'rect')) {
        setDraftDrawing((prev) => {
          if (!prev || !prev.points?.[0]) return prev;

          const nextSecond = { time: logicalPoint.time, price: logicalPoint.price };
          const prevSecond = prev.points?.[1];

          if (
            prevSecond &&
            prevSecond.time === nextSecond.time &&
            prevSecond.price === nextSecond.price
          ) {
            return prev;
          }

          return {
            ...prev,
            points: [prev.points[0], nextSecond],
          };
        });
      }
    };

    zrenderInstance.on('click', onClick);
    zrenderInstance.on('mousedown', onMouseDown);
    zrenderInstance.on('mouseup', onMouseUp);
    zrenderInstance.on('mousemove', onMouseMove);
    zrenderInstance.on('globalout', onMouseUp);

    return () => {
      zrenderInstance.off('click', onClick);
      zrenderInstance.off('mousedown', onMouseDown);
      zrenderInstance.off('mouseup', onMouseUp);
      zrenderInstance.off('mousemove', onMouseMove);
      zrenderInstance.off('globalout', onMouseUp);
    };
  }, [appendDrawing, screenPointToLogicalPoint, visibleCandles, chartSize, priceStats, seekMode, isDraggingPrice, dragStartY, dragStartPrice]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchKlines() {
      setLoading(true);
      setError(null);
      setIsPlaying(false);
      setDraftDrawing(null);
      setSelectedDrawingId(null);
      setTextInput(null);
      setHoveredDrawingId(null);
      setSeekMode(false);

      try {
        const interval = INTERVAL_MAP[timeframe];
        if (!interval) {
          throw new Error(`Unsupported timeframe: ${timeframe}`);
        }

        const params = new URLSearchParams({
          symbol,
          interval,
          category: 'spot',
          limit: '1000',
        });

        const response = await fetch(`/api/klines?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Proxy request failed');
        }

        const candles = Array.isArray(result.candles) ? result.candles : [];
        if (!candles.length) {
          throw new Error('No candle data returned');
        }

        const startIndex = Math.max(0, Math.floor(candles.length * 0.3));
        const lastClose = candles[candles.length - 1]?.close ?? null;

        setAllCandles(candles);
        setReplayIndex(startIndex);
        setCurrentLivePrice(lastClose);
        setSelectedPrice(lastClose);
        setReplayMode(false);

        try {
          const raw = localStorage.getItem(buildStorageKey(symbol, timeframe));
          const saved = raw ? JSON.parse(raw) : [];
          setDrawings(Array.isArray(saved) ? saved : []);
        } catch {
          setDrawings([]);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to fetch');
          setAllCandles([]);
          setSelectedPrice(null);
          setCurrentLivePrice(null);
          setDrawings([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchKlines();

    return () => controller.abort();
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!isPlaying || !replayMode || replayIndex >= allCandles.length - 1) {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
      return;
    }

    replayIntervalRef.current = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= allCandles.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
    };
  }, [isPlaying, replayMode, replayIndex, allCandles.length, playbackSpeed]);

  useEffect(() => {
    if (replayMode && allCandles[replayIndex]) {
      setSelectedPrice(allCandles[replayIndex].close);
    } else if (!replayMode) {
      setSelectedPrice(currentLivePrice);
    }
  }, [replayMode, replayIndex, allCandles, currentLivePrice]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDraftDrawing(null);
        setTextInput(null);
        setDrawingTool('none');
        setSeekMode(false);
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedDrawingId) {
        removeSelectedDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [removeSelectedDrawing, selectedDrawingId]);

  const toggleReplayMode = () => {
    setIsPlaying(false);

    if (!replayMode) {
      const startIndex = Math.max(0, Math.floor(allCandles.length * 0.3));
      setReplayIndex(startIndex);
      setReplayMode(true);
      setSelectedPrice(allCandles[startIndex]?.close ?? null);
      return;
    }

    setReplayMode(false);
    setSeekMode(false);
    setReplayIndex(Math.max(0, allCandles.length - 1));
    setSelectedPrice(currentLivePrice);
  };

  const togglePlay = () => {
    if (!replayMode) return;
    if (replayIndex >= allCandles.length - 1) return;
    setIsPlaying((prev) => !prev);
  };

  const stepForward = () => {
    setIsPlaying(false);
    setReplayIndex((prev) => Math.min(prev + 1, allCandles.length - 1));
  };

  const stepBackward = () => {
    setIsPlaying(false);
    setReplayIndex((prev) => Math.max(prev - 1, 0));
  };

  const resetReplay = () => {
    setIsPlaying(false);
    setReplayMode(false);
    setSeekMode(false);
    setReplayIndex(Math.max(0, allCandles.length - 1));
    setSelectedPrice(currentLivePrice);
  };

  const handleSaveTextDrawing = () => {
    if (!textInput || !textDraft.trim()) {
      setTextInput(null);
      return;
    }

    appendDrawing({
      id: `drawing-${Date.now()}`,
      type: 'text',
      points: [textInput.point],
      text: textDraft.trim(),
      style: {
        color: '#f8fafc',
        background: 'rgba(15, 23, 42, 0.9)',
        borderColor: DEFAULT_DRAWING_COLOR,
      },
    });

    setTextInput(null);
    setTextDraft('');
    setDrawingTool('none');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg bg-gray-900 p-6">
        <div className="text-center text-red-500">
          <div className="mb-2 text-lg font-semibold">Failed to load chart</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-800 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Symbol</label>
            <select
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
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
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
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
              <div className="text-sm text-gray-400">{replayMode ? 'Replay Price' : 'Current Price'}</div>
              <div className="text-2xl font-bold text-green-500">${formatPrice(selectedPrice)}</div>
              {!replayMode && currentLivePrice !== null && (
                <div className="text-xs text-gray-500">Live: ${formatPrice(currentLivePrice)}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-medium text-gray-300">Draw:</span>

          {[
            { value: 'none', label: 'Cursor' },
            { value: 'line', label: 'Line' },
            { value: 'rect', label: 'Box' },
            { value: 'text', label: 'Text' },
          ].map((tool) => (
            <button
              key={tool.value}
              onClick={() => {
                setDrawingTool(tool.value);
                setDraftDrawing(null);
                setTextInput(null);
                if (tool.value !== 'none') setSeekMode(false);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                drawingTool === tool.value ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {tool.label}
            </button>
          ))}

          <button
            onClick={() => setSeekMode((prev) => !prev)}
            disabled={!replayMode || drawingTool !== 'none'}
            className={`rounded-lg px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 ${
              seekMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {seekMode ? 'Seek: ON' : 'Seek: OFF'}
          </button>

          <button
            onClick={removeSelectedDrawing}
            disabled={!selectedDrawingId}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete Selected
          </button>

          <button
            onClick={() => {
              saveDrawings([]);
              setSelectedDrawingId(null);
            }}
            disabled={!drawings.length}
            className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear All
          </button>

          <div className="ml-auto text-xs text-gray-400">
            {isDraggingPrice && 'Drag on price axis to set target price. Release to stop.'}
            {drawingTool === 'none' && !isDraggingPrice &&
              (seekMode
                ? 'Click chart to move replay position.'
                : replayMode
                  ? 'Drag/zoom chart normally. Enable Seek to jump candles. Drag price axis to set price.'
                  : 'Drag/zoom chart normally. Drag price axis to set price.'
              )}
            {drawingTool === 'line' && 'Click 2 points to place a trend line.'}
            {drawingTool === 'rect' && 'Click 2 points to place a box.'}
            {drawingTool === 'text' && 'Click once, then type your label.'}
          </div>
        </div>
      </div>

      <div
        ref={chartWrapperRef}
        className="relative overflow-hidden rounded-lg bg-gray-900"
        style={{ height: `${CHART_HEIGHT}px` }}
      >
        <ReactECharts
          ref={chartRef}
          option={chartOption}
          notMerge
          lazyUpdate
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />

        <svg className="pointer-events-none absolute left-0 top-0 z-[5] h-[58%] w-full overflow-visible">
          {selectedPrice !== null && (
            <line
              x1={48}
              y1={24 + ((priceStats.max - selectedPrice) / (priceStats.max - priceStats.min)) * (chartSize.height * 0.58 - 40)}
              x2={chartSize.width - 60}
              y2={24 + ((priceStats.max - selectedPrice) / (priceStats.max - priceStats.min)) * (chartSize.height * 0.58 - 40)}
              stroke="#60a5fa"
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.6}
            />
          )}
          
          {renderedDrawings.map((drawing) => {
            const isSelected = drawing.id === selectedDrawingId;
            const isHovered = drawing.id === hoveredDrawingId;
            const glow = isSelected || isHovered;

            if (drawing.type === 'line') {
              const [a, b] = drawing.canvasPoints;
              return (
                <line
                  key={drawing.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={drawing.style?.color || DEFAULT_DRAWING_COLOR}
                  strokeWidth={glow ? 3 : 2}
                  strokeLinecap="round"
                />
              );
            }

            if (drawing.type === 'rect') {
              const [a, b] = drawing.canvasPoints;
              const rect = normalizeRect(a, b);
              return (
                <rect
                  key={drawing.id}
                  x={rect.left}
                  y={rect.top}
                  width={Math.max(rect.width, 1)}
                  height={Math.max(rect.height, 1)}
                  fill={drawing.style?.fillColor || 'rgba(96, 165, 250, 0.18)'}
                  stroke={drawing.style?.color || DEFAULT_DRAWING_COLOR}
                  strokeWidth={glow ? 3 : 2}
                  rx={4}
                />
              );
            }

            return null;
          })}
        </svg>

        {renderedDrawings
          .filter((drawing) => drawing.type === 'text')
          .map((drawing) => {
            const [point] = drawing.canvasPoints;
            const isSelected = drawing.id === selectedDrawingId;
            const isHovered = drawing.id === hoveredDrawingId;

            return (
              <div
                key={drawing.id}
                className="pointer-events-none absolute z-[6]"
                style={{
                  left: point.x + 8,
                  top: point.y - 24,
                  transform: 'translateY(-50%)',
                }}
              >
                <div
                  className="rounded border px-2 py-1 text-xs text-white shadow-lg"
                  style={{
                    borderColor: isSelected || isHovered ? '#60a5fa' : (drawing.style?.borderColor || '#334155'),
                    background: drawing.style?.background || 'rgba(15, 23, 42, 0.9)',
                  }}
                >
                  {drawing.text}
                </div>
              </div>
            );
          })}

        {textInput && (
          <div
            className="absolute z-20 w-56 rounded-lg border border-blue-500 bg-slate-900 p-3 shadow-2xl"
            style={{ left: Math.min(textInput.x + 12, 520), top: Math.max(textInput.y - 12, 12) }}
          >
            <div className="mb-2 text-xs font-medium text-gray-300">Text label</div>
            <input
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder="Enter note"
              autoFocus
              className="mb-2 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTextDrawing();
                if (e.key === 'Escape') {
                  setTextInput(null);
                  setDrawingTool('none');
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveTextDrawing}
                className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setTextInput(null);
                  setDrawingTool('none');
                }}
                className="rounded bg-gray-700 px-3 py-2 text-xs font-medium text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {replayMode && (
          <div className="absolute left-4 top-4 z-10 space-y-3 rounded-lg bg-gray-800/95 p-4 shadow-xl">
            <div className="flex items-center space-x-2">
              <button onClick={stepBackward} className="rounded-lg bg-gray-700 px-3 py-2 text-white hover:bg-gray-600">
                ◀
              </button>

              <button onClick={togglePlay} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button onClick={stepForward} className="rounded-lg bg-gray-700 px-3 py-2 text-white hover:bg-gray-600">
                ▶
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1">
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

            <div className="text-xs text-white">
              <div>Candle: {Math.min(replayIndex + 1, allCandles.length)} / {allCandles.length}</div>
              <div>
                Progress: {allCandles.length ? Math.round(((replayIndex + 1) / allCandles.length) * 100) : 0}%
              </div>
            </div>

            <button
              onClick={resetReplay}
              className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-500"
            >
              Exit Replay
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingViewChart;
