import React from 'react';
import { Head } from '@inertiajs/react';
import TradeCalendar from '../../Components/Market/TradeCalendar';
import TradeReport from '../../Components/Market/TradeReport';
import StrategyPlaybooks from '../../Components/Market/StrategyPlaybooks';
import RiskGuardrailSettings from '../../Components/Market/RiskGuardrailSettings';
import ImportedTrades from '../../Components/Market/ImportedTrades';
import ContentPanel from '../../Components/Table/ContentPanel';

const TradeReportPage = () => {
    return (
        <>
            <Head title="Trade Report" />
            <div className="space-y-4">
                <ContentPanel marginBottom={2}>
                    <div className="p-4">
                        <RiskGuardrailSettings />
                    </div>
                </ContentPanel>
                <ContentPanel marginBottom={2}>
                    <div className="p-4">
                        <StrategyPlaybooks />
                    </div>
                </ContentPanel>
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
                <ContentPanel marginBottom={2}>
                    <div className="p-4">
                        <ImportedTrades />
                    </div>
                </ContentPanel>
            </div>
        </>
    );
};

export default TradeReportPage;
