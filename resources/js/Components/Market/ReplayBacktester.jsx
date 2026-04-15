import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const ReplayBacktester = ({ symbol = 'BTCUSDT', timeframe = '1h' }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const candleSeriesRef = useRef();
    const volumeSeriesRef = useRef();
    const markerSeriesRef = useRef();
    
    const [candleData, setCandleData] = useState([]);
    const [volumeData, setVolumeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isReplayMode, setIsReplayMode] = useState(false);
    const [replayIndex, setReplayIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1000);
    const [selectedPrice, setSelectedPrice] = useState(null);
    const [position, setPosition] = useState(null);
    const [trades, setTrades] = useState([]);
    const [balance, setBalance] = useState(10000);
    const [initialBalance] = useState(10000);
    
    const replayIntervalRef = useRef(null);
    const crosshairLineRef = useRef(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 600,
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
                vertLine: {
                    visible: true,
                    labelVisible: true,
                },
                horzLine: {
                    visible: true,
                    labelVisible: true,
                },
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

        chart.subscribeCrosshairMove((param) => {
            if (param.time && param.point) {
                const data = candleData.find(d => d.time === param.time);
                if (data) {
                    setSelectedPrice(data.close);
                }
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
    }, []);

    useEffect(() => {
        const fetchKlineData = async () => {
            setLoading(true);
            setError(null);
            try {
                const endTime = Date.now();
                const startTime = endTime - (1000 * 60 * 60 * 24 * 90);

                const response = await fetch(
                    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&startTime=${startTime}&endTime=${endTime}&limit=1000`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }

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
                setReplayIndex(Math.floor(candleData.length * 0.5));

                if (candleSeriesRef.current && volumeSeriesRef.current) {
                    candleSeriesRef.current.setData(candleData);
                    volumeSeriesRef.current.setData(volumeData);
                    
                    const visibleRange = chartRef.current.timeScale().getVisibleLogicalRange();
                    if (visibleRange) {
                        chartRef.current.timeScale().setVisibleRange({
                            from: visibleRange.from,
                            to: Math.floor(candleData.length * 0.5),
                        });
                    }
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchKlineData();
    }, [symbol, timeframe]);

    useEffect(() => {
        if (isReplayMode && replayIndex < candleData.length) {
            const visibleCandles = candleData.slice(0, replayIndex + 1);
            const visibleVolume = volumeData.slice(0, replayIndex + 1);
            
            if (candleSeriesRef.current) {
                candleSeriesRef.current.setData(visibleCandles);
            }
            if (volumeSeriesRef.current) {
                volumeSeriesRef.current.setData(visibleVolume);
            }

            const currentCandle = candleData[replayIndex];
            if (currentCandle && crosshairLineRef.current) {
                chartRef.current.setTimeScale({
                    visibleRange: {
                        from: Math.max(0, replayIndex - 50),
                        to: replayIndex + 10,
                    },
                });
            }
        }
    }, [replayIndex, isReplayMode]);

    useEffect(() => {
        if (isPlaying && isReplayMode && replayIndex < candleData.length - 1) {
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
    }, [isPlaying, isReplayMode, replayIndex, candleData.length, playbackSpeed]);

    const toggleReplayMode = () => {
        setIsReplayMode(!isReplayMode);
        if (!isReplayMode) {
            setReplayIndex(Math.floor(candleData.length * 0.3));
        }
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const stepForward = () => {
        if (replayIndex < candleData.length - 1) {
            setReplayIndex(prev => prev + 1);
        }
    };

    const stepBackward = () => {
        if (replayIndex > 0) {
            setReplayIndex(prev => prev - 1);
        }
    };

    const handleSpeedChange = (speed) => {
        setPlaybackSpeed(speed);
    };

    const openPosition = (type) => {
        if (!isReplayMode || replayIndex >= candleData.length) return;
        
        const currentCandle = candleData[replayIndex];
        const entryPrice = currentCandle.close;
        const quantity = balance / entryPrice;
        
        setPosition({
            type,
            entryPrice,
            quantity,
            entryIndex: replayIndex,
            entryTime: currentCandle.time,
        });

        if (candleSeriesRef.current) {
            const markers = [];
            markers.push({
                time: currentCandle.time,
                position: type === 'long' ? 'belowBar' : 'aboveBar',
                color: type === 'long' ? '#26a69a' : '#ef5350',
                shape: type === 'long' ? 'arrowUp' : 'arrowDown',
                text: type === 'long' ? 'LONG' : 'SHORT',
            });
            candleSeriesRef.current.setMarkers(markers);
        }
    };

    const closePosition = () => {
        if (!position || !isReplayMode || replayIndex >= candleData.length) return;
        
        const currentCandle = candleData[replayIndex];
        const exitPrice = currentCandle.close;
        
        let profit = 0;
        if (position.type === 'long') {
            profit = (exitPrice - position.entryPrice) * position.quantity;
        } else {
            profit = (position.entryPrice - exitPrice) * position.quantity;
        }
        
        const newBalance = balance + profit;
        setBalance(newBalance);
        
        const trade = {
            type: position.type,
            entryPrice: position.entryPrice,
            exitPrice,
            profit,
            entryTime: position.entryTime,
            exitTime: currentCandle.time,
            entryIndex: position.entryIndex,
            exitIndex: replayIndex,
        };
        
        setTrades([...trades, trade]);
        setPosition(null);

        if (candleSeriesRef.current) {
            const markers = candleSeriesRef.current.markers() || [];
            markers.push({
                time: currentCandle.time,
                position: position.type === 'long' ? 'belowBar' : 'aboveBar',
                color: profit >= 0 ? '#26a69a' : '#ef5350',
                shape: 'circle',
                text: profit >= 0 ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`,
            });
            candleSeriesRef.current.setMarkers(markers);
        }
    };

    const resetBacktest = () => {
        setIsPlaying(false);
        setReplayIndex(Math.floor(candleData.length * 0.3));
        setPosition(null);
        setTrades([]);
        setBalance(initialBalance);
        if (candleSeriesRef.current) {
            candleSeriesRef.current.setMarkers([]);
        }
    };

    const totalProfit = trades.reduce((acc, trade) => acc + trade.profit, 0);
    const winRate = trades.length > 0 ? (trades.filter(t => t.profit > 0).length / trades.length) * 100 : 0;

    return (
        <div className="space-y-4">
            <div className="relative">
                <div ref={chartContainerRef} className="w-full" />
                
                {isReplayMode && (
                    <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 rounded-lg p-4 space-y-3">
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

                        <div className="flex items-center space-x-2">
                            <span className="text-white text-sm">Speed:</span>
                            <button
                                onClick={() => handleSpeedChange(2000)}
                                className={`px-2 py-1 rounded text-xs ${
                                    playbackSpeed === 2000 ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white`}
                            >
                                0.5x
                            </button>
                            <button
                                onClick={() => handleSpeedChange(1000)}
                                className={`px-2 py-1 rounded text-xs ${
                                    playbackSpeed === 1000 ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white`}
                            >
                                1x
                            </button>
                            <button
                                onClick={() => handleSpeedChange(500)}
                                className={`px-2 py-1 rounded text-xs ${
                                    playbackSpeed === 500 ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white`}
                            >
                                2x
                            </button>
                            <button
                                onClick={() => handleSpeedChange(250)}
                                className={`px-2 py-1 rounded text-xs ${
                                    playbackSpeed === 250 ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white`}
                            >
                                4x
                            </button>
                        </div>

                        <div className="text-white text-sm">
                            <div>Candle: {replayIndex + 1} / {candleData.length}</div>
                            <div>Progress: {Math.round(((replayIndex + 1) / candleData.length) * 100)}%</div>
                        </div>

                        <div className="border-t border-gray-600 pt-3 space-y-2">
                            {!position ? (
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => openPosition('long')}
                                        disabled={!isReplayMode}
                                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-bold"
                                    >
                                        LONG
                                    </button>
                                    <button
                                        onClick={() => openPosition('short')}
                                        disabled={!isReplayMode}
                                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-bold"
                                    >
                                        SHORT
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={closePosition}
                                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded-lg text-sm font-bold"
                                >
                                    CLOSE ({position.type.toUpperCase()})
                                </button>
                            )}
                        </div>

                        <button
                            onClick={resetBacktest}
                            className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 rounded-lg text-sm"
                        >
                            Reset
                        </button>
                    </div>
                )}

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

            <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={toggleReplayMode}
                        className={`px-6 py-3 rounded-lg font-bold text-white ${
                            isReplayMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        <i className="fa fa-history mr-2"></i>
                        {isReplayMode ? 'Replay Mode: ON' : 'Replay Mode: OFF'}
                    </button>

                    <div className="text-white">
                        <span className="text-gray-400">Balance: </span>
                        <span className={`font-bold ${balance >= initialBalance ? 'text-green-500' : 'text-red-500'}`}>
                            ${balance.toFixed(2)}
                        </span>
                    </div>

                    <div className="text-white">
                        <span className="text-gray-400">P/L: </span>
                        <span className={`font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                        </span>
                    </div>

                    <div className="text-white">
                        <span className="text-gray-400">Trades: </span>
                        <span className="font-bold">{trades.length}</span>
                    </div>

                    <div className="text-white">
                        <span className="text-gray-400">Win Rate: </span>
                        <span className="font-bold">{winRate.toFixed(1)}%</span>
                    </div>
                </div>

                {position && (
                    <div className="text-white">
                        <span className="text-gray-400">Open Position: </span>
                        <span className={`font-bold ${position.type === 'long' ? 'text-green-500' : 'text-red-500'}`}>
                            {position.type.toUpperCase()} @ ${position.entryPrice.toFixed(2)}
                        </span>
                    </div>
                )}
            </div>

            {trades.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-xl font-bold text-white mb-4">Trade History</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="py-3 px-4 text-gray-400">#</th>
                                    <th className="py-3 px-4 text-gray-400">Type</th>
                                    <th className="py-3 px-4 text-gray-400">Entry</th>
                                    <th className="py-3 px-4 text-gray-400">Exit</th>
                                    <th className="py-3 px-4 text-gray-400">P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.map((trade, index) => (
                                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                                        <td className="py-3 px-4 text-white">{index + 1}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                trade.type === 'long' ? 'bg-green-600' : 'bg-red-600'
                                            } text-white`}>
                                                {trade.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-white">${trade.entryPrice.toFixed(2)}</td>
                                        <td className="py-3 px-4 text-white">${trade.exitPrice.toFixed(2)}</td>
                                        <td className={`py-3 px-4 font-bold ${
                                            trade.profit >= 0 ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                            {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReplayBacktester;
