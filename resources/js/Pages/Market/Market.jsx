import React from 'react';
import { Head } from '@inertiajs/react';
import TradingViewChart from '../../Components/Market/TradingViewChart';
import ContentPanel from '../../Components/Table/ContentPanel';

const Market = () => {
    return (
        <>
            <Head title="Market Analysis" />
            <div className="space-y-4">
                <ContentPanel marginBottom={2}>
                    <div className="p-4" style={{ height: '200vh' }}>
                        <TradingViewChart />
                    </div>
                </ContentPanel>
            </div>
        </>
    );
};

export default Market;
