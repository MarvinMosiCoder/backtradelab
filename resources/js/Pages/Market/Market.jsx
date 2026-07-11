import React from 'react';
import { Head } from '@inertiajs/react';
import TradingViewChart from '../../Components/Market/TradingViewChart';
import { useTheme } from '../../Context/ThemeContext';

const Market = () => {
    const { theme } = useTheme();
    const isDark = theme === 'bg-skin-black';
    return (
        <>
            <Head title="Market Analysis" />
            <div className="space-y-2">
                <div className="px-1">
                    <h1 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Market analysis</h1>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#787b86]">Multi-exchange chart and replay</p>
                </div>
                <div className={`overflow-hidden rounded-lg border p-2 sm:p-3 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}>
                        <TradingViewChart />
                </div>
            </div>
        </>
    );
};

export default Market;
