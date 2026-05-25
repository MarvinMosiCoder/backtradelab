import React, { useEffect, useMemo, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import StatCard from "../../Components/Dashboard/StatCard";
import ContentPanel from "../../Components/Table/ContentPanel";
import TradingViewChart from "../../Components/Market/TradingViewChart";

const Dashboard = ({ customer, orders, devices, orders_count_wdate }) => {
    const { auth } = usePage().props;
    const isSuperAdmin = Boolean(auth?.sessions?.admin_is_superadmin);
    const [activeSymbol, setActiveSymbol] = useState(() => {
        if (typeof window === "undefined") {
            return null;
        }

        try {
            const storedSymbol = JSON.parse(
                localStorage.getItem("backtradelab-active-symbol") || "null"
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

    useEffect(() => {
        if (auth.user) {
            window.history.pushState(
                null,
                document.title,
                window.location.href
            );

            window.addEventListener("popstate", (event) => {
                window.history.pushState(
                    null,
                    document.title,
                    window.location.href
                );
            });
        }
    }, [auth.user]);

    return (
        <>
            <Head title="Dashboard" />
            {!isSuperAdmin ? (
                <ContentPanel marginBottom={2}>
                    <div className="p-4">
                        <TradingViewChart
                            key={chartKey}
                            initialSymbol={activeSymbol?.symbol ?? "BTCUSDT"}
                            initialExchange={activeSymbol?.exchange ?? "bingx"}
                            initialMarketCategory={activeSymbol?.category ?? "linear"}
                        />
                    </div>
                </ContentPanel>
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
