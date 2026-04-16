import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const ReplayBacktester = () => {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const candleSeriesRef = useRef();
    const volumeSeriesRef = useRef();
    
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [timeframe, setTimeframe] = useState('1h');
    const [candleData, setCandleData] = useState([]);
    const [volumeData, setVolumeData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [replayMode, setReplayMode] = useState(false);
    const [replayIndex, setReplayIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1000);
    const [selectedPrice, setSelectedPrice] = useState(null);
    const [currentLivePrice, setCurrentLivePrice] = useState(null);
    
    const replayIntervalRef = useRef(null);

    const timeframes = [
        { value: '1m', label: '1 Minute' },
        { value: '5m', label: '5 Minutes' },
        { value: '15m', label: '15 Minutes' },
        { value: '1h', label: '1 Hour' },
        { value: '4h', label: '4 Hours' },
        { value: '1d', label: '1 Day' },
    ];

    const popularSymbols = [
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

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 600,
            layout: {
                background: { type: 'solid', color: '#1a1a2e' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2B2B43' },
                horzLines: { color: '#2B2B43' },
            },
            crosshair: {
                mode: 1,
                vertLine: { visible: true, labelVisible: true },
                horzLine: { visible: true, labelVisible: true },
            },
            timeScale: {
                borderColor: '#2B2B43',
                timeVisible: true,
                secondsVisible: false,
                fixLeftEdge: false,
                fixRightEdge: false,
                lockVisibleTimeRangeOnResize: false,
                rightBarStaysOnScroll: false,
            },
            rightPriceScale: {
                borderColor: '#2B2B43',
                autoScale: true,
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
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '',
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;
        chartRef.current = chart;

        chart.subscribeCrosshairMove((param) => {
            if (param.time) {
                const data = replayMode ? candleData.slice(0, replayIndex + 1) : candleData;
                const found = data.find(d => d.time === param.time);
                if (found) setSelectedPrice(found.close);
            }
        });

        chart.subscribeClick((param) => {
            if (!replayMode || !param.time) return;
            
            const clickedIndex = candleData.findIndex(d => d.time === param.time);
            if (clickedIndex !== -1 && clickedIndex < replayIndex) {
                setReplayIndex(clickedIndex);
                setIsPlaying(false);
                const currentCandle = candleData[clickedIndex];
                setSelectedPrice(currentCandle.close);
            }
        });

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
    }, [candleData, replayMode, replayIndex]);

    useEffect(() => {
        const fetchKlineData = async () => {
            setLoading(true);
            try {
                const endTime = Date.now();
                const startTime = endTime - (1000 * 60 * 60 * 24 * 90);

                const response = await fetch(
                    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&startTime=${startTime}&endTime=${endTime}&limit=1000`
                );

                if (!response.ok) throw new Error('Failed to fetch data');

                const data = await response.json();

                const candleData = data.map((k, index) => ({
                    time: k[0] / 1000,
                    open: parseFloat(k[1]),
                    high: parseFloat(k[2]),
                    low: parseFloat(k[3]),
                    close: parseFloat(k[4]),
                    index: index,
                }));

                const volumeData = data.map((k) => ({
                    time: k[0] / 1000,
                    value: parseFloat(k[5]),
                    color: parseFloat(k[4]) >= parseFloat(k[1]) ? '#26a69a80' : '#ef535080',
                }));

                setCandleData(candleData);
                setVolumeData(volumeData);
                
                const startIndex = Math.floor(candleData.length * 0.3);
                setReplayIndex(startIndex);
                
                const lastPrice = candleData[candleData.length - 1]?.close;
                setCurrentLivePrice(lastPrice);
                setSelectedPrice(lastPrice);

                if (candleSeriesRef.current && volumeSeriesRef.current) {
                    candleSeriesRef.current.setData(candleData);
                    volumeSeriesRef.current.setData(volumeData);
                    
                    chartRef.current.timeScale().fitContent();
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchKlineData();
    }, [symbol, timeframe]);

    useEffect(() => {
        if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) return;
        
        if (replayMode && replayIndex >= 0 && replayIndex < candleData.length) {
            const visibleCandles = candleData.slice(0, replayIndex + 1);
            const visibleVolume = volumeData.slice(0, replayIndex + 1);
            
            candleSeriesRef.current.setData(visibleCandles);
            volumeSeriesRef.current.setData(visibleVolume);

            const currentCandle = candleData[replayIndex];
            if (currentCandle) {
                setSelectedPrice(currentCandle.close);
            }
        } else if (!replayMode && candleData.length > 0) {
            candleSeriesRef.current.setData(candleData);
            volumeSeriesRef.current.setData(volumeData);
        }
    }, [replayIndex, replayMode]);

    useEffect(() => {
        if (isPlaying && replayMode && replayIndex < candleData.length - 1) {
            replayIntervalRef.current = setInterval(() => {
                setReplayIndex(prev => {
                    if (prev >= candleData.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, playbackSpeed);
        } else {
            if (replayIntervalRef.current) {
                clearInterval(replayIntervalRef.current);
            }
        }

        return () => {
            if (replayIntervalRef.current) {
                clearInterval(replayIntervalRef.current);
            }
        };
    }, [isPlaying, replayMode, replayIndex, candleData.length, playbackSpeed]);

    const toggleReplayMode = () => {
        const newMode = !replayMode;
        setReplayMode(newMode);
        setIsPlaying(false);
        
        if (newMode) {
            const startIndex = Math.floor(candleData.length * 0.3);
            setReplayIndex(startIndex);
        } else {
            setReplayIndex(candleData.length - 1);
            setSelectedPrice(currentLivePrice);
        }
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const stepForward = () => {
        if (replayIndex < candleData.length - 1) {
            setReplayIndex(prev => prev + 1);
            setIsPlaying(false);
        }
    };

    const stepBackward = () => {
        if (replayIndex > 0) {
            setReplayIndex(prev => prev - 1);
            setIsPlaying(false);
        }
    };

    const resetReplay = () => {
        setIsPlaying(false);
        setReplayMode(false);
        setReplayIndex(candleData.length - 1);
        setSelectedPrice(currentLivePrice);
        
        if (candleSeriesRef.current && volumeSeriesRef.current) {
            candleSeriesRef.current.setData(candleData);
            volumeSeriesRef.current.setData(volumeData);
        }
        chartRef.current.timeScale().fitContent();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Symbol
                        </label>
                        <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        >
                            {popularSymbols.map((sym) => (
                                <option key={sym} value={sym}>{sym}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Timeframe
                        </label>
                        <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        >
                            {timeframes.map((tf) => (
                                <option key={tf.value} value={tf.value}>{tf.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <div className="text-white">
                            <div className="text-sm text-gray-400">
                                {replayMode ? 'Replay Price' : 'Current Price'}
                            </div>
                            <div className={`text-2xl font-bold ${
                                selectedPrice >= (currentLivePrice || 0) ? 'text-green-500' : 'text-red-500'
                            }`}>
                                ${selectedPrice?.toFixed(2) || '---'}
                            </div>
                            {!replayMode && currentLivePrice && (
                                <div className="text-xs text-gray-500">
                                    Live: ${currentLivePrice.toFixed(2)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '600px' }}>
                <div ref={chartContainerRef} className="w-full" style={{ minHeight: '600px' }} />
                
                {replayMode && (
                    <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-95 rounded-lg p-4 space-y-3 shadow-xl z-10">
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={stepBackward}
                                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                                title="Step Backward"
                            >
                                <i className="fa fa-step-backward"></i>
                            </button>
                            
                            <button
                                onClick={togglePlay}
                                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                <i className={`fa fa-${isPlaying ? 'pause' : 'play'}`}></i>
                            </button>
                            
                            <button
                                onClick={stepForward}
                                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                                title="Step Forward"
                            >
                                <i className="fa fa-step-forward"></i>
                            </button>
                        </div>

                        <div className="flex items-center space-x-1 flex-wrap gap-1">
                            <span className="text-white text-xs">Speed:</span>
                            <button
                                onClick={() => setPlaybackSpeed(3000)}
                                className={`px-2 py-1 rounded text-xs ${
                                    playbackSpeed === 3000 ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white`}
                            >
                                0.25x
                            </button>
                            <button
                                onClick={() => setPlaybackSpeed(2000)}
                                className={`px-2 py-1 rounded text-xs ${
                                    playbackSpeed === 2000 ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white`}
                            >
                                0.5x
                            </button>
                            <button
                                onClick={() => setPlaybackSpeed(1000)}
                                className={`px-2 py-1 rounded text-xs ${
                                    playbackSpeed === 1000 ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white`}
                            >
                                1x
                            </button>
                            <button
                                onClick={() => setPlaybackSpeed(500)}
                                className={`px-2 py-1 rounded text-xs ${
                                    playbackSpeed === 500 ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white`}
                            >
                                2x
                            </button>
                            <button
                                onClick={() => setPlaybackSpeed(250)}
                                className={`px-2 py-1 rounded text-xs ${
                                    playbackSpeed === 250 ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white`}
                            >
                                4x
                            </button>
                            <button
                                onClick={() => setPlaybackSpeed(100)}
                                className={`px-2 py-1 rounded text-xs ${
                                    playbackSpeed === 100 ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white`}
                            >
                                10x
                            </button>
                        </div>

                        <div className="text-white text-xs">
                            <div>Candle: {replayIndex + 1} / {candleData.length}</div>
                            <div>Progress: {Math.round(((replayIndex + 1) / candleData.length) * 100)}%</div>
                        </div>

                        <button
                            onClick={resetReplay}
                            className="w-full bg-red-600 hover:bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-bold"
                        >
                            Exit Replay
                        </button>
                    </div>
                )}

                <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-95 rounded-lg p-3 shadow-xl z-10">
                    <div className="text-white text-center">
                        {replayMode ? (
                            <>
                                <div className="text-gray-400 text-xs mb-1">Replay From</div>
                                <div className="font-bold text-lg">
                                    ${candleData[replayIndex]?.close.toFixed(2) || '---'}
                                </div>
                                <div className="text-xs text-blue-400 mt-1">
                                    Click chart to move
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-gray-400 text-xs">Live Price</div>
                                <div className="font-bold text-lg text-green-500">
                                    ${candleData[candleData.length - 1]?.close.toFixed(2) || '---'}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
                <button
                    onClick={toggleReplayMode}
                    className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                        replayMode
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    <i className={`fa mr-2 ${replayMode ? 'fa-stop' : 'fa-history'}`}></i>
                    {replayMode ? 'Exit Replay Mode' : '📼 Replay - Click Chart to Select Starting Point'}
                </button>
            </div>
        </div>
    );
};

export default ReplayBacktester;
