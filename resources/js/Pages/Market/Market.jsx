import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import Backtester from '../../Components/Market/Backtester';
import ReplayBacktester from '../../Components/Market/ReplayBacktester';
import ContentPanel from '../../Components/Table/ContentPanel';

const Market = () => {
    const [mode, setMode] = useState('replay');

    return (
        <>
            <Head title="Market Analysis" />
            <div className="space-y-4">
                <ContentPanel marginBottom={2}>
                    <div className="p-6">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Market Analysis & Backtesting
                        </h1>
                        <p className="text-gray-400">
                            Real-time cryptocurrency price charts with TradingView-style visualization and strategy backtesting
                        </p>
                    </div>
                </ContentPanel>

                <ContentPanel marginBottom={2}>
                    <div className="p-4">
                        <div className="flex space-x-4 mb-4">
                            <button
                                onClick={() => setMode('replay')}
                                className={`px-6 py-3 rounded-lg font-bold ${
                                    mode === 'replay'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <i className="fa fa-history mr-2"></i>
                                Replay Backtest
                            </button>
                            <button
                                onClick={() => setMode('auto')}
                                className={`px-6 py-3 rounded-lg font-bold ${
                                    mode === 'auto'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <i className="fa fa-cogs mr-2"></i>
                                Auto Strategy
                            </button>
                        </div>

                        {mode === 'replay' ? (
                            <ReplayBacktester />
                        ) : (
                            <Backtester />
                        )}
                    </div>
                </ContentPanel>
            </div>
        </>
    );
};

export default Market;
