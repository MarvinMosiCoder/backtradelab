import React from 'react';
import { Head } from '@inertiajs/react';
import TradeCalendar from '../../Components/Market/TradeCalendar';
import TradeReport from '../../Components/Market/TradeReport';
import ContentPanel from '../../Components/Table/ContentPanel';

const TradeReportPage = () => {
    return (
        <>
            <Head title="Trade Report" />
            <div className="space-y-4">
                <ContentPanel marginBottom={2}>
                    <div className="p-4">
                        <TradeCalendar />
                    </div>
                </ContentPanel>
                <ContentPanel marginBottom={2}>
                    <div className="p-4">
                        <TradeReport />
                    </div>
                </ContentPanel>
            </div>
        </>
    );
};

export default TradeReportPage;
