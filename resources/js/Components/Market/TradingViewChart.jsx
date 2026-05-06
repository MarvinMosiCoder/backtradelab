import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';
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
  estimateLogicalFromTime,
  estimateTimeFromLogical,
  findNearestCandleIndex,
  normalizeApiCandles,
  normalizeVisibleRect,
  offsetDrawing,
} from './TradingViewChart/utils';

export default function TradingViewReplayChart({
  initialSymbol = 'BTCUSDT',
  initialTimeframe = '15m',
}) {
  const wrapperRef = useRef(null);
  const fullscreenRef = useRef(null);
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const replayTimerRef = useRef(null);
  const isProgrammaticRangeChangeRef = useRef(false);
  const selectedPriceLineRef = useRef(null);
  const selectedReplayPriceRef = useRef(null);
  const replayModeRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const toolRef = useRef(null);
  const drawingColorRef = useRef(DRAWING_COLOR);
  const tempDrawingRef = useRef(null);
  const drawingsRef = useRef([]);
  const selectedDrawingIdRef = useRef(null);
  const dragDrawingRef = useRef(null);
  const resizeDrawingRef = useRef(null);
  const isReplayPricePickActiveRef = useRef(false);
  const overlayRenderFrameRef = useRef(null);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [symbols, setSymbols] = useState([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [symbolError, setSymbolError] = useState('');
  const [isSavingSymbol, setIsSavingSymbol] = useState(false);
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
  const [isReplayPricePickActive, setIsReplayPricePickActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [tool, setTool] = useState(null); // 'line' | 'rect' | 'text' | null
  const [drawingColor, setDrawingColor] = useState(DRAWING_COLOR);
  const [drawings, setDrawings] = useState([]);
  const [tempDrawing, setTempDrawing] = useState(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
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
      color: c.close >= c.open ? '#26a69a88' : '#ef535088',
    }));
  }, [visibleCandles]);

  const currentPrice = useMemo(() => {
    if (!visibleCandles.length) return null;
    return visibleCandles[visibleCandles.length - 1].close;
  }, [visibleCandles]);

  const selectedDrawing = useMemo(() => {
    return drawings.find((drawing) => drawing.id === selectedDrawingId) ?? null;
  }, [drawings, selectedDrawingId]);

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
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current);
      scheduleOverlayRender();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [scheduleOverlayRender]);

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
      setSymbol((currentSymbol) => (
        nextSymbols.length && !nextSymbols.some((item) => item.symbol === currentSymbol)
          ? nextSymbols[0].symbol
          : currentSymbol
      ));
      setSymbolError('');
    } catch (err) {
      setSymbolError(err.message || 'Failed to load symbols');
    }
  }, []);

  useEffect(() => {
    loadMarketSymbols();
  }, [loadMarketSymbols]);

  const saveDrawings = useCallback((nextDrawings) => {
    setDrawings(nextDrawings);
    drawingsRef.current = nextDrawings;
    try {
      localStorage.setItem(buildStorageKey(symbol), JSON.stringify(nextDrawings));
    } catch {}
  }, [symbol]);

  const appendDrawing = useCallback((drawing) => {
    const next = [...drawingsRef.current, drawing];
    saveDrawings(next);
    setSelectedDrawingId(drawing.id);
  }, [saveDrawings]);

  const loadStoredDrawings = useCallback(() => {
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

    const sharedKey = buildStorageKey(symbol);
    addStoredDrawings(localStorage.getItem(sharedKey));

    TIMEFRAMES.forEach(({ value }) => {
      addStoredDrawings(localStorage.getItem(buildLegacyStorageKey(symbol, value)));
    });

    const storedDrawings = Array.from(drawingMap.values());

    if (storedDrawings.length) {
      localStorage.setItem(sharedKey, JSON.stringify(storedDrawings));
    }

    return storedDrawings;
  }, [symbol]);

  const getDrawingTimes = useCallback((items) => {
    return items.flatMap((drawing) => {
      if (drawing.type === 'line' || drawing.type === 'rect') {
        return [drawing.start?.time, drawing.end?.time];
      }

      if (drawing.type === 'text') {
        return [drawing.point?.time];
      }

      return [];
    }).filter((time) => Number.isFinite(Number(time))).map(Number);
  }, []);

  const selectedPriceAutoscaleInfoProvider = useCallback((original) => {
    const autoscaleInfo = original();
    const selectedPrice = selectedReplayPriceRef.current;

    if (!autoscaleInfo || !replayModeRef.current || !Number.isFinite(selectedPrice)) {
      return autoscaleInfo;
    }

    const priceRange = autoscaleInfo.priceRange ?? {
      minValue: selectedPrice,
      maxValue: selectedPrice,
    };
    let minValue = Math.min(priceRange.minValue, selectedPrice);
    let maxValue = Math.max(priceRange.maxValue, selectedPrice);

    if (minValue === maxValue) {
      const padding = Math.max(Math.abs(selectedPrice) * 0.01, 1);
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

    const logicalFromTime = estimateLogicalFromTime(visibleCandles, point.time);
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
  }, [visibleCandles]);

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
        const p1 = toScreen(drawing.start);
        const p2 = toScreen(drawing.end);
        if (!p1 || !p2) return null;
        return { ...drawing, screen: { p1, p2 } };
      }

      if (drawing.type === 'rect') {
        const p1 = toScreen(drawing.start);
        const p2 = toScreen(drawing.end);
        if (!p1 || !p2) return null;
        return { ...drawing, screen: { p1, p2 } };
      }

      if (drawing.type === 'text') {
        const p = toScreen(drawing.point);
        if (!p) return null;
        return { ...drawing, screen: { p } };
      }

      return null;
    }).filter(Boolean);
  }, [drawings, tempDrawing, toScreen, replayIndex, overlaySize, overlayRenderVersion]);

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
        const rect = normalizeVisibleRect(p1, p2);
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

  const hitTestResizeHandle = useCallback((x, y) => {
    if (!selectedDrawingIdRef.current) return null;

    const selected = renderedDrawings.find((d) => d.id === selectedDrawingIdRef.current);
    if (!selected || selected.type === 'text') return null;

    const handles = [];

    if (selected.type === 'line') {
      handles.push(
        { handle: 'start', point: selected.screen.p1 },
        { handle: 'end', point: selected.screen.p2 }
      );
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

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 800,
      height: containerRef.current.clientHeight || 0,
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
      if (!replayMode) return;
      if (!isReplayPricePickActiveRef.current) return;
      if (isSpacePressedRef.current) return;
      if (toolRef.current) return;
      if (dragDrawingRef.current) return;
      if (!param?.point) return;

      setReplayPointFromCoordinates(param.point.x, param.point.y, true);
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

    const handleViewportInteraction = () => {
      scheduleOverlayRender();
    };

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
  }, [replayMode, scheduleOverlayRender, selectedPriceAutoscaleInfoProvider, setReplayPointFromCoordinates]);

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
      handleScroll: isSpacePressed || !replayMode || !tool,
      handleScale: isSpacePressed || !replayMode || !tool,
    });
  }, [isSpacePressed, replayMode, tool]);

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
  }, [
    replayMode,
    selectedPriceAutoscaleInfoProvider,
    selectedReplayPrice,
    timeframe,
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
        resizeDrawingRef.current = null;
        dragDrawingRef.current = null;
        setIsReplayPricePickActive(false);
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacePressed(false);
        dragDrawingRef.current = null;
        resizeDrawingRef.current = null;
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

    const setChartMouseInteractions = (enabled) => {
      const chart = chartRef.current;
      if (!chart) return;

      chart.applyOptions({
        handleScroll: enabled,
        handleScale: enabled,
      });
    };

    const restoreChartMouseInteractions = () => {
      setChartMouseInteractions(isSpacePressedRef.current || !replayMode || !toolRef.current);
    };

    const handleMouseDown = (event) => {
      if (!replayMode) return;
      if (isSpacePressedRef.current) {
        dragDrawingRef.current = null;
        return;
      }

      const { x, y } = getRelativePoint(event);

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

      if (toolRef.current === 'line' || toolRef.current === 'rect') {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        const currentTemp = tempDrawingRef.current;

        if (!currentTemp) {
          setTempDrawing({
            id: `temp-${Date.now()}`,
            type: toolRef.current,
            start: coords,
            end: coords,
            color: drawingColorRef.current,
          });
        } else {
          const completed = {
            id: `drawing-${Date.now()}`,
            type: currentTemp.type,
            start: currentTemp.start,
            end: coords,
            strokeWidth: currentTemp.strokeWidth ?? 2,
            color: currentTemp.color ?? drawingColorRef.current,
          };
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
        event.preventDefault();
        event.stopPropagation();
        setChartMouseInteractions(false);
        setSelectedDrawingId(hitId);
        resizeDrawingRef.current = null;

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
      resizeDrawingRef.current = null;
      // no replay-price auto-drag here; native chart behavior stays active
    };

    const handleMouseMove = (event) => {
      if (!replayMode) return;
      if (isSpacePressedRef.current) return;

      const { x, y } = getRelativePoint(event);

      if ((toolRef.current === 'line' || toolRef.current === 'rect') && tempDrawingRef.current) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        setTempDrawing((prev) => {
          if (!prev) return prev;
          return { ...prev, end: coords };
        });
        return;
      }

      if (resizeDrawingRef.current) {
        const coords = getChartCoordinates(x, y);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        const { drawingId, handle, originalDrawing } = resizeDrawingRef.current;
        const resized = { ...originalDrawing };

        if (resized.type === 'line') {
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

    el.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [appendDrawing, getChartCoordinates, hitTestDrawing, hitTestResizeHandle, replayMode, saveDrawings]);

  useEffect(() => {
    async function fetchKlines() {
      const wasInReplay = replayMode;
      const previousSelectedReplayPrice = selectedReplayPriceRef.current;
      const previousReplayTime = wasInReplay ? allCandles[replayIndex]?.time : null;
      const drawingTimes = wasInReplay ? getDrawingTimes(drawingsRef.current) : [];
      const anchorTimes = [
        previousReplayTime,
        ...drawingTimes,
      ].filter((time) => Number.isFinite(Number(time))).map(Number);
      const anchorEnd = anchorTimes.length ? Math.max(...anchorTimes) : null;
      const replayProgress =
        wasInReplay && allCandles.length > 1
          ? replayIndex / (allCandles.length - 1)
          : 0.3;

      setLoading(true);
      setError('');
      setIsPlaying(false);
      setFollowReplay(true);
      setSelectedDrawingId(null);
      setTempDrawing(null);
      setTextInput(null);
      setIsReplayPricePickActive(false);

      try {
        const interval = INTERVAL_MAP[timeframe];
        if (!interval) throw new Error(`Unsupported timeframe: ${timeframe}`);

        const params = new URLSearchParams({
          symbol,
          interval,
          category: 'spot',
          limit: '1000',
          max_candles: wasInReplay ? '10000' : '5000',
        });

        if (wasInReplay && anchorEnd != null) {
          const intervalSeconds = TIMEFRAME_SECONDS[timeframe] ?? 60;
          const requestedCandles = 10000;
          const forwardCandles = Math.max(
            250,
            Math.round(requestedCandles * Math.max(0.1, 1 - replayProgress))
          );
          const nowMs = Date.now();
          const anchoredEndMs = Math.min(
            nowMs,
            Math.round((anchorEnd + (intervalSeconds * forwardCandles)) * 1000)
          );

          params.set('end', String(anchoredEndMs));
        }

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

        setReplayIndex(nextReplayIndex);
        setReplayMode(wasInReplay);
        setSelectedReplayPrice(
          wasInReplay
            ? previousSelectedReplayPrice ?? normalized[nextReplayIndex]?.close ?? null
            : null
        );

        try {
          const saved = loadStoredDrawings();
          setDrawings(saved);
          drawingsRef.current = saved;
        } catch {
          setDrawings([]);
          drawingsRef.current = [];
        }
      } catch (err) {
        setError(err.message || 'Failed to load chart');
        setAllCandles([]);
        setReplayMode(false);
        setSelectedReplayPrice(null);
        setDrawings([]);
        drawingsRef.current = [];
      } finally {
        setLoading(false);
      }
    }

    fetchKlines();
  }, [symbol, timeframe, getDrawingTimes, loadStoredDrawings]);

  const toggleReplayMode = () => {
    setIsPlaying(false);

    if (!replayMode) {
      const startIndex = Math.max(0, Math.floor(allCandles.length * 0.3));
      setReplayMode(true);
      setFollowReplay(true);
      setReplayIndex(startIndex);
      setSelectedReplayPrice(allCandles[startIndex]?.close ?? null);
      setIsReplayPricePickActive(false);
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

    appendDrawing({
      id: `drawing-${Date.now()}`,
      type: 'text',
      point: textInput.point,
      text: textDraft.trim(),
      color: drawingColor,
    });

    setTextInput(null);
    setTextDraft('');
    setTool(null);
  };

  const handleToolChange = (nextTool) => {
    setTool((currentTool) => (
      typeof nextTool === 'function' ? nextTool(currentTool) : nextTool
    ));
    setTempDrawing(null);
    setTextInput(null);
    setIsReplayPricePickActive(false);
  };

  const handleClearDrawings = () => {
    saveDrawings([]);
    setSelectedDrawingId(null);
  };

  const handleDeleteSelectedDrawing = () => {
    if (!selectedDrawingId) return;

    const next = drawings.filter((d) => d.id !== selectedDrawingId);
    saveDrawings(next);
    setSelectedDrawingId(null);
  };

  const handleDrawingWidthChange = (strokeWidth) => {
    if (!selectedDrawingId) return;

    const next = drawingsRef.current.map((drawing) => {
      if (drawing.id !== selectedDrawingId) return drawing;
      if (drawing.type !== 'line' && drawing.type !== 'rect') return drawing;

      return {
        ...drawing,
        strokeWidth,
      };
    });

    saveDrawings(next);
  };

  const handleDrawingColorChange = (color) => {
    setDrawingColor(color);

    if (tempDrawingRef.current) {
      setTempDrawing((prev) => (prev ? { ...prev, color } : prev));
    }

    if (!selectedDrawingIdRef.current) return;

    const next = drawingsRef.current.map((drawing) => (
      drawing.id === selectedDrawingIdRef.current
        ? { ...drawing, color }
        : drawing
    ));

    saveDrawings(next);
  };

  const handleCancelText = () => {
    setTextInput(null);
    setTool(null);
  };

  const handleAddSymbol = async (event) => {
    event.preventDefault();

    const normalizedSymbol = newSymbol.trim().toUpperCase();
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
          category: 'spot',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save symbol');
      }

      const savedSymbol = result.symbol;

      setSymbols((currentSymbols) => {
        if (currentSymbols.some((item) => item.symbol === savedSymbol.symbol)) {
          return currentSymbols.map((item) => (
            item.symbol === savedSymbol.symbol ? savedSymbol : item
          ));
        }

        return [...currentSymbols, savedSymbol].sort((a, b) => a.symbol.localeCompare(b.symbol));
      });
      setSymbol(savedSymbol.symbol);
      setNewSymbol('');
    } catch (err) {
      setSymbolError(err.message || 'Failed to save symbol');
    } finally {
      setIsSavingSymbol(false);
    }
  };

  const handleToggleFullscreen = async () => {
    const fullscreenElement = fullscreenRef.current;
    if (!fullscreenElement) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (fullscreenElement.requestFullscreen) {
        await fullscreenElement.requestFullscreen();
      } else {
        setIsFullscreen((current) => !current);
        scheduleOverlayRender();
      }
    } catch {
      setIsFullscreen((current) => !current);
      scheduleOverlayRender();
    }
  };

  return (
    <div
      ref={fullscreenRef}
      className={
        isFullscreen
          ? 'flex h-screen flex-col gap-3 overflow-hidden bg-slate-950 p-4'
          : 'space-y-4'
      }
    >
      <ChartHeader
        symbol={symbol}
        symbols={symbols}
        newSymbol={newSymbol}
        isSavingSymbol={isSavingSymbol}
        symbolError={symbolError}
        timeframe={timeframe}
        replayMode={replayMode}
        currentPrice={currentPrice}
        selectedReplayPrice={selectedReplayPrice}
        onSymbolChange={setSymbol}
        onNewSymbolChange={(value) => {
          setNewSymbol(value.toUpperCase());
          setSymbolError('');
        }}
        onAddSymbol={handleAddSymbol}
        onTimeframeChange={setTimeframe}
        onToggleReplayMode={toggleReplayMode}
      />

      {replayMode && (
        <ReplayPanel
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
          onClearDrawings={handleClearDrawings}
          onDeleteSelectedDrawing={handleDeleteSelectedDrawing}
        />
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

      <ChartStage
        wrapperRef={wrapperRef}
        containerRef={containerRef}
        isFullscreen={isFullscreen}
        replayMode={replayMode}
        isSpacePressed={isSpacePressed}
        isReplayPricePickActive={isReplayPricePickActive}
        tool={tool}
        overlaySize={overlaySize}
        renderedDrawings={renderedDrawings}
        selectedDrawingId={selectedDrawingId}
        textInput={textInput}
        textDraft={textDraft}
        onTextDraftChange={setTextDraft}
        onSaveText={handleSaveText}
        onCancelText={handleCancelText}
        onToggleFullscreen={handleToggleFullscreen}
      />
    </div>
  );
}
