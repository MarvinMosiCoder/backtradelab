import React, { useEffect, useMemo, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import StatCard from "../../Components/Dashboard/StatCard";
import ContentPanel from "../../Components/Table/ContentPanel";
import TradingViewChart from "../../Components/Market/TradingViewChart";
import { useTheme } from "../../Context/ThemeContext";

const Dashboard = ({ customer, orders, devices, orders_count_wdate }) => {
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
                <ContentPanel marginBottom={2}>
                    <div className="mb-4 rounded-lg">
                        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-3">
                            {auth.access.isView && auth.access.isRead && (
                                <>
                                    <StatCard
                                        label="Request"
                                        total={100}
                                        gradient="linear-gradient(to bottom right, #134B70, #0891b2)"
                                        value={100}
                                        icon='<i class="fa fa-pie-chart"></i>'
                                    />
                                    <StatCard
                                        label="Request"
                                        total={100}
                                        gradient="linear-gradient(to bottom right, #134B70, #0891b2)"
                                        value={100}
                                        icon='<i class="fa fa-pie-chart"></i>'
                                    />
                                    <StatCard
                                        label="Request"
                                        total={100}
                                        gradient="linear-gradient(to bottom right, #134B70, #0891b2)"
                                        value={100}
                                        icon='<i class="fa fa-pie-chart"></i>'
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </ContentPanel>
            )}
        </>
    );
};

export default Dashboard;
