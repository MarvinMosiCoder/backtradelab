import React, { useState, useEffect } from 'react';
import TradingViewChart from './TradingViewChart';
import ContentPanel from '../Table/ContentPanel';

const Backtester = () => {
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [timeframe, setTimeframe] = useState('1h');
    const [strategy, setStrategy] = useState('sma');
    const [initialCapital, setInitialCapital] = useState(10000);
    const [backtestResults, setBacktestResults] = useState(null);
    const [isBacktesting, setIsBacktesting] = useState(false);
    const [candleData, setCandleData] = useState([]);

    const strategies = [
        { value: 'sma', label: 'Simple Moving Average (SMA)' },
        { value: 'ema', label: 'Exponential Moving Average (EMA)' },
        { value: 'rsi', label: 'RSI Strategy' },
        { value: 'macd', label: 'MACD Strategy' },
    ];

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

    const fetchKlineData = async () => {
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

            const candleData = data.map((k) => ({
                time: k[0] / 1000,
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
            }));

            setCandleData(candleData);
            return candleData;
        } catch (err) {
            console.error('Error fetching data:', err);
            return [];
        }
    };

    const calculateSMA = (data, period) => {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(null);
                continue;
            }
            const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
            result.push(sum / period);
        }
        return result;
    };

    const calculateEMA = (data, period) => {
        const result = [];
        const multiplier = 2 / (period + 1);
        let ema = data[0]?.close || 0;

        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(null);
                continue;
            }
            ema = (data[i].close - ema) * multiplier + ema;
            result.push(ema);
        }
        return result;
    };

    const calculateRSI = (data, period = 14) => {
        const result = [];
        let gains = 0;
        let losses = 0;

        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                result.push(null);
                continue;
            }

            const change = data[i].close - data[i - 1].close;
            if (i < period) {
                if (change > 0) gains += change;
                else losses += Math.abs(change);
                result.push(null);
                continue;
            }

            if (i === period) {
                gains /= period;
                losses /= period;
            } else {
                if (change > 0) {
                    gains = (gains * (period - 1) + change) / period;
                } else {
                    losses = (losses * (period - 1) + Math.abs(change)) / period;
                }
            }

            const rs = losses === 0 ? 100 : gains / losses;
            const rsi = 100 - (100 / (1 + rs));
            result.push(rsi);
        }
        return result;
    };

    const runBacktest = async () => {
        setIsBacktesting(true);
        const data = await fetchKlineData();

        if (data.length === 0) {
            setIsBacktesting(false);
            return;
        }

        let trades = [];
        let position = null;
        let capital = initialCapital;
        let smaFast = [];
        let smaSlow = [];
        let emaFast = [];
        let emaSlow = [];
        let rsi = [];

        if (strategy === 'sma' || strategy === 'ema') {
            smaFast = calculateSMA(data, 10);
            smaSlow = calculateSMA(data, 20);
            emaFast = calculateEMA(data, 10);
            emaSlow = calculateEMA(data, 20);
        } else if (strategy === 'rsi') {
            rsi = calculateRSI(data, 14);
        }

        for (let i = 0; i < data.length; i++) {
            const candle = data[i];
            let signal = null;

            if (strategy === 'sma') {
                if (smaFast[i] && smaSlow[i] && smaFast[i] > smaSlow[i] && !position) {
                    signal = 'buy';
                } else if (smaFast[i] && smaSlow[i] && smaFast[i] < smaSlow[i] && position) {
                    signal = 'sell';
                }
            } else if (strategy === 'ema') {
                if (emaFast[i] && emaSlow[i] && emaFast[i] > emaSlow[i] && !position) {
                    signal = 'buy';
                } else if (emaFast[i] && emaSlow[i] && emaFast[i] < emaSlow[i] && position) {
                    signal = 'sell';
                }
            } else if (strategy === 'rsi') {
                if (rsi[i] && rsi[i] < 30 && !position) {
                    signal = 'buy';
                } else if (rsi[i] && rsi[i] > 70 && position) {
                    signal = 'sell';
                }
            }

            if (signal === 'buy' && !position) {
                position = {
                    entryPrice: candle.close,
                    entryTime: candle.time,
                    quantity: capital / candle.close,
                };
            } else if (signal === 'sell' && position) {
                const profit = (candle.close - position.entryPrice) * position.quantity;
                capital += profit;
                trades.push({
                    type: 'sell',
                    entryPrice: position.entryPrice,
                    exitPrice: candle.close,
                    profit,
                    entryTime: position.entryTime,
                    exitTime: candle.time,
                });
                position = null;
            }
        }

        if (position) {
            const profit = (data[data.length - 1].close - position.entryPrice) * position.quantity;
            capital += profit;
            trades.push({
                type: 'sell',
                entryPrice: position.entryPrice,
                exitPrice: data[data.length - 1].close,
                profit,
                entryTime: position.entryTime,
                exitTime: data[data.length - 1].time,
            });
        }

        const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
        const winningTrades = trades.filter((t) => t.profit > 0);
        const losingTrades = trades.filter((t) => t.profit <= 0);
        const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

        setBacktestResults({
            initialCapital,
            finalCapital: capital,
            totalReturn,
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate,
            trades,
        });

        setIsBacktesting(false);
    };

    useEffect(() => {
        fetchKlineData();
    }, [symbol, timeframe]);

    return (
        <>
            <ContentPanel marginBottom={2}>
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Symbol
                            </label>
                            <select
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            >
                                {popularSymbols.map((sym) => (
                                    <option key={sym} value={sym}>
                                        {sym}
                                    </option>
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
                                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            >
                                {timeframes.map((tf) => (
                                    <option key={tf.value} value={tf.value}>
                                        {tf.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Strategy
                            </label>
                            <select
                                value={strategy}
                                onChange={(e) => setStrategy(e.target.value)}
                                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            >
                                {strategies.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Initial Capital ($)
                            </label>
                            <input
                                type="number"
                                value={initialCapital}
                                onChange={(e) => setInitialCapital(parseFloat(e.target.value))}
                                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={runBacktest}
                        disabled={isBacktesting}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                    >
                        {isBacktesting ? 'Running Backtest...' : 'Run Backtest'}
                    </button>
                </div>
            </ContentPanel>

            <ContentPanel marginBottom={2}>
                <div className="p-4">
                    <h3 className="text-xl font-bold text-white mb-4">Price Chart</h3>
                    <TradingViewChart symbol={symbol} timeframe={timeframe} />
                </div>
            </ContentPanel>

            {backtestResults && (
                <>
                    <ContentPanel marginBottom={2}>
                        <div className="p-4">
                            <h3 className="text-xl font-bold text-white mb-4">Backtest Results</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Initial Capital</p>
                                    <p className="text-2xl font-bold text-white">
                                        ${backtestResults.initialCapital.toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Final Capital</p>
                                    <p className="text-2xl font-bold text-white">
                                        ${backtestResults.finalCapital.toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Total Return</p>
                                    <p
                                        className={`text-2xl font-bold ${
                                            backtestResults.totalReturn >= 0
                                                ? 'text-green-500'
                                                : 'text-red-500'
                                        }`}
                                    >
                                        {backtestResults.totalReturn >= 0 ? '+' : ''}
                                        {backtestResults.totalReturn.toFixed(2)}%
                                    </p>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Win Rate</p>
                                    <p className="text-2xl font-bold text-white">
                                        {backtestResults.winRate.toFixed(2)}%
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Total Trades</p>
                                    <p className="text-2xl font-bold text-white">
                                        {backtestResults.totalTrades}
                                    </p>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Winning Trades</p>
                                    <p className="text-2xl font-bold text-green-500">
                                        {backtestResults.winningTrades}
                                    </p>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">Losing Trades</p>
                                    <p className="text-2xl font-bold text-red-500">
                                        {backtestResults.losingTrades}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </ContentPanel>

                    <ContentPanel marginBottom={2}>
                        <div className="p-4">
                            <h3 className="text-xl font-bold text-white mb-4">Trade History</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-700">
                                            <th className="py-3 px-4 text-gray-400">#</th>
                                            <th className="py-3 px-4 text-gray-400">Type</th>
                                            <th className="py-3 px-4 text-gray-400">Entry Price</th>
                                            <th className="py-3 px-4 text-gray-400">Exit Price</th>
                                            <th className="py-3 px-4 text-gray-400">Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backtestResults.trades.map((trade, index) => (
                                            <tr
                                                key={index}
                                                className="border-b border-gray-800 hover:bg-gray-800"
                                            >
                                                <td className="py-3 px-4 text-white">{index + 1}</td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`px-2 py-1 rounded text-sm ${
                                                            trade.type === 'buy'
                                                                ? 'bg-green-600'
                                                                : 'bg-red-600'
                                                        }`}
                                                    >
                                                        {trade.type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-white">
                                                    ${trade.entryPrice.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 text-white">
                                                    ${trade.exitPrice.toFixed(2)}
                                                </td>
                                                <td
                                                    className={`py-3 px-4 font-bold ${
                                                        trade.profit >= 0
                                                            ? 'text-green-500'
                                                            : 'text-red-500'
                                                    }`}
                                                >
                                                    {trade.profit >= 0 ? '+' : ''}$
                                                    {trade.profit.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </ContentPanel>
                </>
            )}
        </>
    );
};

export default Backtester;
