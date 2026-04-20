import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

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

const TradingViewChart = ({ symbol = 'BTCUSDT', timeframe = '1h' }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: {
          color: '#1a1a2e',
        },
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
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (!chartContainerRef.current || !chartRef.current) return;

      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchKlineData = async () => {
      setLoading(true);
      setError(null);

      try {
        const bybitInterval = INTERVAL_MAP[timeframe];

        if (!bybitInterval) {
          throw new Error(`Unsupported timeframe: ${timeframe}`);
        }

        const params = new URLSearchParams({
          symbol,
          interval: bybitInterval,
          category: 'spot',
          limit: '500',
        });

        const response = await fetch(`/api/klines?${params.toString()}`, {
        signal: controller.signal,
        headers: {
            Accept: 'application/json',
        },
        });

        const result = await response.json();

        if (!response.ok) {
        throw new Error(result.message || result.error || `HTTP ${response.status}`);
        }

        if (!result.success) {
        throw new Error(result.message || 'Failed to fetch market data');
        }

        const candles = Array.isArray(result.candles) ? result.candles : [];

        if (!candles.length) {
        throw new Error('No candle data returned');
        }

        const candleData = candles.map((k) => ({
        time: Number(k.time),
        open: Number(k.open),
        high: Number(k.high),
        low: Number(k.low),
        close: Number(k.close),
        }));

        const volumeData = candles.map((k) => ({
        time: Number(k.time),
        value: Number(k.volume),
        color: Number(k.close) >= Number(k.open) ? '#26a69a80' : '#ef535080',
        }));

        candleSeriesRef.current?.setData(candleData);
        volumeSeriesRef.current?.setData(volumeData);
        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to fetch');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchKlineData();

    return () => controller.abort();
  }, [symbol, timeframe]);

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="w-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/75">
          <div className="text-white">Loading...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/75">
          <div className="text-red-500">Error: {error}</div>
        </div>
      )}
    </div>
  );
};

export default TradingViewChart;