import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const TradingViewChart = ({ symbol = 'BTCUSDT', timeframe = '1h' }) => {
    const chartContainerRef = useRef();
    const candleSeriesRef = useRef();
    const volumeSeriesRef = useRef();
    const chartRef = useRef();
    const [candleData, setCandleData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500,
            layout: {
                background: {
                    type: 'solid',
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
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;
        chartRef.current = chart;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    useEffect(() => {
        const fetchKlineData = async () => {
            setLoading(true);
            setError(null);
            try {
                const endTime = Date.now();
                const startTime = endTime - (1000 * 60 * 60 * 24 * 30);

                const response = await fetch(
                    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&startTime=${startTime}&endTime=${endTime}&limit=1000`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }

                const data = await response.json();

                const candleData = data.map((k) => ({
                    time: k[0] / 1000,
                    open: parseFloat(k[1]),
                    high: parseFloat(k[2]),
                    low: parseFloat(k[3]),
                    close: parseFloat(k[4]),
                }));

                const volumeData = data.map((k) => ({
                    time: k[0] / 1000,
                    value: parseFloat(k[5]),
                    color: parseFloat(k[4]) >= parseFloat(k[1]) ? '#26a69a80' : '#ef535080',
                }));

                setCandleData(candleData);

                if (candleSeriesRef.current && volumeSeriesRef.current) {
                    candleSeriesRef.current.setData(candleData);
                    volumeSeriesRef.current.setData(volumeData);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchKlineData();
    }, [symbol, timeframe]);

    return (
        <div className="relative">
            <div ref={chartContainerRef} className="w-full" />
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                    <div className="text-white">Loading...</div>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                    <div className="text-red-500">Error: {error}</div>
                </div>
            )}
        </div>
    );
};

export default TradingViewChart;
