import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const TIMEFRAMES = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
];

const BYBIT_INTERVAL_MAP = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
};

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

const CHART_HEIGHT = 600;

function formatPrice(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '---';
  if (value >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value.toFixed(2);
}

function buildVolumeData(candles) {
  return candles.map((candle) => ({
    time: candle.time,
    value: candle.volume,
    color: candle.close >= candle.open ? '#26a69a80' : '#ef535080',
  }));
}

export default function ReplayBacktester() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const replayIntervalRef = useRef(null);

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');

  const [allCandles, setAllCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [currentLivePrice, setCurrentLivePrice] = useState(null);

  const volumeData = useMemo(() => buildVolumeData(allCandles), [allCandles]);

  const visibleCandles = useMemo(() => {
    if (!replayMode) return allCandles;
    return allCandles.slice(0, replayIndex + 1);
  }, [allCandles, replayMode, replayIndex]);

  const visibleVolume = useMemo(() => {
    if (!replayMode) return volumeData;
    return volumeData.slice(0, replayIndex + 1);
  }, [volumeData, replayMode, replayIndex]);

  const applyVisibleData = useCallback(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    candleSeriesRef.current.setData(visibleCandles);
    volumeSeriesRef.current.setData(visibleVolume);

    if (visibleCandles.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [visibleCandles, visibleVolume]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: CHART_HEIGHT,
      layout: {
        background: { color: '#1a1a2e' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 1,
      },
      timeScale: {
        borderColor: '#2B2B43',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleCrosshairMove = (param) => {
      if (!param || !param.time) return;

      const source = replayMode
        ? allCandles.slice(0, replayIndex + 1)
        : allCandles;

      const candle = source.find((item) => item.time === param.time);
      if (candle) {
        setSelectedPrice(candle.close);
      }
    };

    const handleClick = (param) => {
      if (!replayMode || !param || !param.time) return;

      const clickedIndex = allCandles.findIndex((item) => item.time === param.time);
      if (clickedIndex >= 0 && clickedIndex < replayIndex) {
        setReplayIndex(clickedIndex);
        setIsPlaying(false);
        setSelectedPrice(allCandles[clickedIndex].close);
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.subscribeClick(handleClick);

    const handleResize = () => {
      if (!chartContainerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.unsubscribeClick(handleClick);

      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }

      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [allCandles, replayIndex, replayMode]);

  useEffect(() => {
    applyVisibleData();
  }, [applyVisibleData]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchKlines() {
      setLoading(true);
      setError('');
      setIsPlaying(false);

      try {
        const interval = BYBIT_INTERVAL_MAP[timeframe];
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
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to fetch data');
          setAllCandles([]);
          setSelectedPrice(null);
          setCurrentLivePrice(null);
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
    setReplayIndex(Math.max(0, allCandles.length - 1));
    setSelectedPrice(currentLivePrice);
    chartRef.current?.timeScale().fitContent();
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
        <div className="text-center text-red-400">
          <div className="mb-2 text-lg font-semibold">Failed to load chart</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-800 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Symbol
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
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
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Timeframe
            </label>
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

          <div className="flex items-end">
            <div className="text-white">
              <div className="text-sm text-gray-400">
                {replayMode ? 'Replay Price' : 'Current Price'}
              </div>
              <div className="text-2xl font-bold text-green-500">
                ${formatPrice(selectedPrice)}
              </div>
              {!replayMode && currentLivePrice !== null && (
                <div className="text-xs text-gray-500">
                  Live: ${formatPrice(currentLivePrice)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-lg bg-gray-900"
        style={{ minHeight: `${CHART_HEIGHT}px` }}
      >
        <div
          ref={chartContainerRef}
          className="w-full"
          style={{ minHeight: `${CHART_HEIGHT}px` }}
        />

        {replayMode && (
          <div className="absolute left-4 top-4 z-10 space-y-3 rounded-lg bg-gray-800/95 p-4 shadow-xl">
            <div className="flex items-center space-x-2">
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
              <div>
                Candle: {Math.min(replayIndex + 1, allCandles.length)} / {allCandles.length}
              </div>
              <div>
                Progress:{' '}
                {allCandles.length
                  ? Math.round(((replayIndex + 1) / allCandles.length) * 100)
                  : 0}
                %
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

        <div className="absolute right-4 top-4 z-10 rounded-lg bg-gray-800/95 p-3 shadow-xl">
          <div className="text-center text-white">
            {replayMode ? (
              <>
                <div className="mb-1 text-xs text-gray-400">Replay From</div>
                <div className="text-lg font-bold">
                  ${formatPrice(allCandles[replayIndex]?.close)}
                </div>
                <div className="mt-1 text-xs text-blue-400">Click chart to move</div>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-400">Live Price</div>
                <div className="text-lg font-bold text-green-500">
                  ${formatPrice(allCandles[allCandles.length - 1]?.close)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-gray-800 p-4">
        <button
          onClick={toggleReplayMode}
          className={`w-full rounded-lg py-4 text-lg font-bold text-white ${
            replayMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {replayMode ? 'Exit Replay Mode' : 'Replay Mode'}
        </button>
      </div>
    </div>
  );
}