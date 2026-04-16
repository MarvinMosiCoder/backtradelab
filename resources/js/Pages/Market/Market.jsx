import React from 'react';
import { Head } from '@inertiajs/react';
import ReplayBacktester from '../../Components/Market/ReplayBacktester';
import ContentPanel from '../../Components/Table/ContentPanel';

const Market = () => {
    return (
        <>
            <Head title="Market Analysis" />
            <div className="space-y-4">
                <ContentPanel marginBottom={2}>
                    <div className="p-6">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Market Analysis
                        </h1>
                        <p className="text-gray-400">
                            Real-time cryptocurrency price charts with TradingView-style replay
                        </p>
                    </div>
                </ContentPanel>

                <ContentPanel marginBottom={2}>
                    <div className="p-4">
                        <ReplayBacktester />
                    </div>
                </ContentPanel>
            </div>
        </>
    );
};

export default Market;
