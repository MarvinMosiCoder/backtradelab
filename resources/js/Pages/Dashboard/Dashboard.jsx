import React, { useEffect, useMemo, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import TradingViewChart from "../../Components/Market/TradingViewChart";
import { useTheme } from "../../Context/ThemeContext";
import { Activity, UserCheck, UserMinus, Users } from 'lucide-react';

const Dashboard = ({ userMetrics = {} }) => {
    const { auth } = usePage().props;
    const { theme } = useTheme();
    const isDark = theme === 'bg-skin-black';
    const isSuperAdmin = Boolean(auth?.sessions?.admin_is_superadmin);
    const [activeSymbol, setActiveSymbol] = useState(() => {
        if (typeof window === "undefined") {
            return null;
        }

        try {
            const storedSymbol = JSON.parse(
                localStorage.getItem(`backtradelab-active-symbol:${auth?.user?.id ?? "guest"}`) || "null"
            );
            return storedSymbol?.symbol ? storedSymbol : null;
        } catch {
            return null;
        }
    });
    const chartKey = useMemo(() => {
        if (!activeSymbol?.symbol) return "default-chart";

        return `${activeSymbol.exchange ?? "bingx"}:${activeSymbol.category ?? "linear"}:${activeSymbol.symbol}`;
    }, [activeSymbol]);

    useEffect(() => {
        const handleSymbolChange = (event) => {
            if (event.detail?.symbol) {
                setActiveSymbol(event.detail);
            }
        };

        window.addEventListener(
            "backtradelab-active-symbol-change",
            handleSymbolChange
        );

        return () => {
            window.removeEventListener(
                "backtradelab-active-symbol-change",
                handleSymbolChange
            );
        };
    }, []);

    return (
        <>
            <Head title="Dashboard" />
            {!isSuperAdmin ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <h1 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Trading workspace</h1>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-[#787b86]">Analyze · Replay · Execute · Review</p>
                        </div>
                        <div className="hidden items-center gap-2 text-[10px] text-[#787b86] sm:flex">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Market data connected
                        </div>
                    </div>
                    <div className={`overflow-hidden rounded-lg border p-2 shadow-2xl shadow-black/20 sm:p-3 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}>
                        <TradingViewChart
                            key={chartKey}
                            initialSymbol={activeSymbol?.symbol ?? "BTCUSDT"}
                            initialExchange={activeSymbol?.exchange ?? "bingx"}
                            initialMarketCategory={activeSymbol?.category ?? "linear"}
                        />
                    </div>
                </div>
            ) : (
                <div className={`space-y-5 ${isDark ? 'text-[#d1d4dc]' : 'text-slate-900'}`}>
                    <div className={`overflow-hidden rounded-2xl border p-6 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-[#2962ff]">Administration</div><h1 className="mt-2 text-3xl font-bold">System overview</h1><p className="mt-1 text-sm text-[#787b86]">Monitor user access and platform activity from one workspace.</p></div><div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400"><Activity size={15}/><span className="h-2 w-2 rounded-full bg-emerald-400"/>System online</div></div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
                        ['All users', userMetrics.total ?? 0, Users, '#2962ff'],
                        ['Active users', userMetrics.active ?? 0, UserCheck, '#10b981'],
                        ['Inactive users', userMetrics.inactive ?? 0, UserMinus, '#ef4444'],
                        ['New this month', userMetrics.newThisMonth ?? 0, Activity, '#8b5cf6'],
                    ].map(([label,value,Icon,color])=><div key={label} className={`rounded-xl border p-5 shadow-sm ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}><div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#787b86]">{label}</span><span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{backgroundColor:`${color}1f`,color}}><Icon size={18}/></span></div><div className="mt-4 text-3xl font-bold tabular-nums">{Number(value).toLocaleString()}</div></div>)}</div>
                    <div className={`rounded-xl border p-5 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}><h2 className="text-sm font-bold">User health</h2><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-500/10"><div className="h-full rounded-full bg-emerald-500" style={{width:`${userMetrics.total ? Math.round((userMetrics.active/userMetrics.total)*100) : 0}%`}}/></div><div className="mt-2 flex justify-between text-xs text-[#787b86]"><span>{userMetrics.active ?? 0} active accounts</span><span>{userMetrics.total ? Math.round((userMetrics.active/userMetrics.total)*100) : 0}% active</span></div></div>
                </div>
            )}
        </>
    );
};

export default Dashboard;
