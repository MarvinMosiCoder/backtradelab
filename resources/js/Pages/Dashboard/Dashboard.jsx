import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import TradingViewChart from "../../Components/Market/TradingViewChart";
import { useTheme } from "../../Context/ThemeContext";
import { Activity, AlertCircle, ArrowRight, ChevronDown, CircleDollarSign, Clock3, CreditCard, FolderPlus, Inbox, MessageSquareText, Pencil, Star, Trash2, UserCheck, UserMinus, Users, X } from 'lucide-react';
import { marketCategoryLabel } from '../../utils/marketLabels';

const Dashboard = ({ userMetrics = {}, subscriptionMetrics = {}, feedbackMetrics = {}, recentSubscriptions = [], recentFeedback = [], workspaceMode = false }) => {
    const { auth } = usePage().props;
    const { theme } = useTheme();
    const isDark = theme === 'bg-skin-black';
    const isSuperAdmin = Boolean(auth?.role?.isSuperadmin);
    const watchlistKey = `backtradelab-watchlists:${auth?.user?.id ?? 'guest'}`;
    const [savedSymbols, setSavedSymbols] = useState([]);
    const [watchlists, setWatchlists] = useState(() => { try { return JSON.parse(localStorage.getItem(watchlistKey) || '{"Main":[]}'); } catch { return { Main: [] }; } });
    const [activeWatchlist, setActiveWatchlist] = useState(Object.keys(watchlists)[0] ?? 'Main');
    const [expandedWatchlists, setExpandedWatchlists] = useState(() => new Set([Object.keys(watchlists)[0] ?? 'Main']));
    const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
    const [watchlistName, setWatchlistName] = useState('');
    const [watchlistError, setWatchlistError] = useState('');
    const [editingWatchlist, setEditingWatchlist] = useState(null);
    const [deleteWatchlistName, setDeleteWatchlistName] = useState(null);
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
        if (activeSymbol?.symbol) localStorage.setItem(`backtradelab-active-symbol:${auth?.user?.id ?? 'guest'}`, JSON.stringify(activeSymbol));
    }, [activeSymbol, auth?.user?.id]);

    useEffect(() => {
        fetch('/market-symbols', { headers: { Accept: 'application/json' } }).then((response) => response.json()).then((data) => setSavedSymbols(data.symbols ?? [])).catch(() => setSavedSymbols([]));
    }, []);

    useEffect(() => { localStorage.setItem(watchlistKey, JSON.stringify(watchlists)); }, [watchlistKey, watchlists]);

    const createWatchlist = (event) => {
        event.preventDefault();
        const name = watchlistName.trim();
        if (!name) return setWatchlistError('Enter a watchlist name.');
        if (watchlists[name] && name !== editingWatchlist) return setWatchlistError('A watchlist with this name already exists.');
        setWatchlists((current) => editingWatchlist
            ? Object.fromEntries(Object.entries(current).map(([key, items]) => [key === editingWatchlist ? name : key, items]))
            : ({ ...current, [name]: [] }));
        setActiveWatchlist(name);
        setExpandedWatchlists(new Set([name]));
        setWatchlistName('');
        setWatchlistError('');
        setEditingWatchlist(null);
        setIsWatchlistModalOpen(false);
    };

    const toggleWatchlist = (name) => {
        setActiveWatchlist(name);
        setExpandedWatchlists((current) => {
            const next = new Set(current);
            if (next.has(name)) return new Set();
            return new Set([name]);
        });
    };

    const deleteWatchlist = () => {
        if (!deleteWatchlistName) return;
        const remainingNames = Object.keys(watchlists).filter((name) => name !== deleteWatchlistName);
        const fallbackName = remainingNames[0] ?? 'Main';
        setWatchlists((current) => {
            const next = Object.fromEntries(Object.entries(current).filter(([name]) => name !== deleteWatchlistName));
            return Object.keys(next).length ? next : { Main: [] };
        });
        setActiveWatchlist(fallbackName);
        setExpandedWatchlists(new Set([fallbackName]));
        setDeleteWatchlistName(null);
    };

    const addSymbolToWatchlist = (name, symbolKey) => {
        if (!symbolKey) return;
        setWatchlists((current) => ({
            ...current,
            [name]: current[name]?.includes(symbolKey) ? current[name] : [...(current[name] ?? []), symbolKey],
        }));
    };

    const removeSymbolFromWatchlist = (name, symbolKey) => {
        setWatchlists((current) => ({
            ...current,
            [name]: (current[name] ?? []).filter((value) => value !== symbolKey),
        }));
    };

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
            <Head title={workspaceMode ? "Workspace Chart" : "Dashboard"} />
            {isWatchlistModalOpen&&<div className="fixed inset-0 z-[10020] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(event)=>event.target===event.currentTarget&&setIsWatchlistModalOpen(false)}><form onSubmit={createWatchlist} className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${isDark?'border-[#2a2e39] bg-[#131722] text-white':'border-slate-200 bg-white text-slate-900'}`}><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#2962ff]">Workspace watchlists</div><h2 className="mt-1 text-lg font-bold">{editingWatchlist?'Rename watchlist':'Create a watchlist'}</h2><p className="mt-1 text-xs text-[#787b86]">{editingWatchlist?'Update the group name without changing its markets.':'Name a group, then add saved markets from its dropdown.'}</p></div><button type="button" onClick={()=>{setEditingWatchlist(null);setIsWatchlistModalOpen(false)}} className={`rounded-lg p-2 text-[#787b86] ${isDark?'hover:bg-white/10':'hover:bg-black/5'}`} aria-label="Close"><X size={17}/></button></div><label className="mt-5 block text-xs font-semibold">Watchlist name<input autoFocus maxLength="60" value={watchlistName} onChange={(event)=>{setWatchlistName(event.target.value);setWatchlistError('')}} placeholder="Example: Swing trades" className={`mt-1.5 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:border-[#2962ff] ${isDark?'border-[#2a2e39] bg-[#0b0e14] text-white placeholder:text-gray-600':'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'}`}/></label>{watchlistError&&<p className="mt-2 text-xs text-red-500">{watchlistError}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>{setEditingWatchlist(null);setIsWatchlistModalOpen(false)}} className={`h-10 rounded-lg border px-4 text-xs font-semibold ${isDark?'border-[#2a2e39] hover:bg-white/5':'border-slate-200 hover:bg-slate-50'}`}>Cancel</button><button type="submit" className="h-10 rounded-lg bg-[#2962ff] px-4 text-xs font-bold text-white hover:bg-blue-600">{editingWatchlist?'Save changes':'Create watchlist'}</button></div></form></div>}
            {deleteWatchlistName&&<div className="fixed inset-0 z-[10021] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"><div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${isDark?'border-[#2a2e39] bg-[#131722] text-white':'border-slate-200 bg-white text-slate-900'}`}><span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500"><Trash2 size={18}/></span><h2 className="mt-4 text-lg font-bold">Delete {deleteWatchlistName}?</h2><p className="mt-2 text-xs leading-5 text-[#787b86]">The group and its market assignments will be removed. Your saved market symbols will not be deleted.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setDeleteWatchlistName(null)} className={`h-10 rounded-lg border px-4 text-xs font-semibold ${isDark?'border-[#2a2e39]':'border-slate-200'}`}>Cancel</button><button type="button" onClick={deleteWatchlist} className="h-10 rounded-lg bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700">Delete watchlist</button></div></div></div>}
            {workspaceMode || !isSuperAdmin ? (
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
                    <div className={`rounded-lg border p-2 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-center justify-between gap-3 px-1 pb-1.5"><h2 className={`text-xs font-bold ${isDark?'text-white':'text-slate-900'}`}>Watchlists</h2><button type="button" onClick={()=>{setEditingWatchlist(null);setWatchlistError('');setWatchlistName('');setIsWatchlistModalOpen(true)}} className="flex h-7 items-center gap-1.5 rounded-md bg-[#2962ff] px-2.5 text-[10px] font-bold text-white hover:bg-blue-600"><FolderPlus size={12}/>Add watchlist</button></div>
                        <div className="space-y-1">
                            {Object.entries(watchlists).map(([name,items]) => {
                                const expanded = expandedWatchlists.has(name);
                                return <section key={name} className={`overflow-hidden rounded-md border ${isDark?'border-[#2a2e39] bg-[#0b0e14]':'border-slate-200 bg-slate-50'}`}>
                                    <div className={`flex items-center gap-1 px-1 ${activeWatchlist===name?(isDark?'bg-white/5':'bg-blue-50'):''}`}>
                                        <button type="button" onClick={()=>toggleWatchlist(name)} className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2 py-1.5 text-left">
                                            <span className="flex min-w-0 items-center gap-2"><Star size={12} className="shrink-0 text-amber-400" fill="currentColor"/><span className={`truncate text-[11px] font-bold ${isDark?'text-white':'text-slate-900'}`}>{name}</span><span className={`rounded-full px-1.5 text-[8px] font-bold ${isDark?'bg-white/10 text-[#b2b5be]':'bg-slate-200 text-slate-600'}`}>{items.length}</span></span>
                                            <ChevronDown size={13} className={`shrink-0 text-[#787b86] transition-transform ${expanded?'rotate-180':''}`}/>
                                        </button>
                                        <button type="button" onClick={()=>{setEditingWatchlist(name);setWatchlistName(name);setWatchlistError('');setIsWatchlistModalOpen(true)}} className="rounded p-1.5 text-[#787b86] hover:text-[#2962ff]" aria-label={`Edit ${name}`}><Pencil size={11}/></button>
                                        <button type="button" onClick={()=>setDeleteWatchlistName(name)} className="rounded p-1.5 text-[#787b86] hover:text-red-500" aria-label={`Delete ${name}`}><Trash2 size={11}/></button>
                                    </div>
                                    {expanded&&<div className={`border-t p-1.5 ${isDark?'border-[#2a2e39]':'border-slate-200'}`}>
                                        <select value="" onChange={(event)=>addSymbolToWatchlist(name,event.target.value)} aria-label={`Add market to ${name}`} className={`h-7 w-full rounded-md border px-2 text-[10px] outline-none focus:border-[#2962ff] ${isDark?'border-[#2a2e39] bg-[#131722] text-white':'border-slate-200 bg-white text-slate-900'}`}><option value="">Add a saved market…</option>{savedSymbols.map((item)=>{const key=`${item.exchange??'bybit'}:${item.category??'spot'}:${item.symbol}`;return <option key={key} value={key} disabled={items.includes(key)}>{item.symbol} · {String(item.exchange).toUpperCase()} {marketCategoryLabel(item.category)}</option>})}</select>
                                        <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5">{items.map((key)=>{const saved=savedSymbols.find((item)=>`${item.exchange??'bybit'}:${item.category??'spot'}:${item.symbol}`===key);const [exchange,category,...symbolParts]=key.split(':');const market=saved??{symbol:symbolParts.join(':'),exchange,category};return <div key={key} className={`flex shrink-0 items-center rounded-md border ${isDark?'border-[#2a2e39] bg-[#131722]':'border-slate-200 bg-white'}`}><button type="button" onClick={()=>setActiveSymbol({symbol:market.symbol,exchange:market.exchange,category:market.category})} className="px-2 py-1 text-[10px] font-bold text-emerald-500">{market.symbol}</button><button type="button" onClick={()=>removeSymbolFromWatchlist(name,key)} className="p-1.5 text-[#787b86] hover:text-red-500" aria-label={`Remove ${market.symbol} from ${name}`}><X size={10}/></button></div>})}{!items.length&&<span className="px-1 py-1 text-[10px] text-[#787b86]">No markets yet.</span>}</div>
                                    </div>}
                                </section>;
                            })}
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

                    <AdminSection title="Subscriptions" subtitle="Verified revenue and provider transaction health." links={[['Payments','/admin/subscriptions'],['Pricing','/admin/subscription-plans']]} isDark={isDark}>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <MetricCard label="Lifetime PHP revenue" value={formatMoney(subscriptionMetrics.revenueLifetimePhp)} detail={`${formatCount(subscriptionMetrics.paidLifetime)} paid transactions`} icon={CircleDollarSign} color="#10b981" isDark={isDark}/>
                            <MetricCard label="Last 30 days" value={formatMoney(subscriptionMetrics.revenueLast30DaysPhp)} detail={`${formatCount(subscriptionMetrics.paidLast30Days)} verified payments`} icon={CreditCard} color="#2962ff" isDark={isDark}/>
                            <MetricCard label="Pending review" value={formatCount(subscriptionMetrics.pending)} detail="Creating or pending" icon={Clock3} color="#f59e0b" isDark={isDark}/>
                            <MetricCard label="Failed / expired" value={formatCount(subscriptionMetrics.failedOrExpired)} detail="Provider sessions needing attention" icon={AlertCircle} color="#ef4444" isDark={isDark}/>
                        </div>
                    </AdminSection>

                    <AdminSection title="Customer feedback & support" subtitle="Current workload across customer and product requests." links={[['Open support inbox','/admin/feedback']]} isDark={isDark}>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <MetricCard label="All requests" value={formatCount(feedbackMetrics.total)} detail="Lifetime" icon={MessageSquareText} color="#2962ff" isDark={isDark}/>
                            <MetricCard label="New in 30 days" value={formatCount(feedbackMetrics.newLast30Days)} detail="Rolling period" icon={Inbox} color="#8b5cf6" isDark={isDark}/>
                            <MetricCard label="Open queue" value={formatCount(feedbackMetrics.open)} detail="Not completed or declined" icon={Clock3} color="#f59e0b" isDark={isDark}/>
                            <MetricCard label="High priority" value={formatCount(feedbackMetrics.highPriority)} detail="Open urgent or high" icon={AlertCircle} color="#ef4444" isDark={isDark}/>
                            <MetricCard label="Awaiting response" value={formatCount(feedbackMetrics.awaitingResponse)} detail="Open without admin reply" icon={UserCheck} color="#10b981" isDark={isDark}/>
                        </div>
                    </AdminSection>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <RecentPanel title="Recent subscription activity" empty="No subscription transactions yet." href="/admin/subscriptions" isDark={isDark}>
                            {recentSubscriptions.map((item)=><RecentRow key={item.id} title={item.user?.name || 'Unknown user'} meta={`${item.plan || 'Unknown plan'} · ${item.currency || 'PHP'} ${Number(item.amount || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} badge={item.status} date={item.paidAt || item.createdAt} isDark={isDark}/>) }
                        </RecentPanel>
                        <RecentPanel title="Recent customer requests" empty="No customer feedback yet." href="/admin/feedback" isDark={isDark}>
                            {recentFeedback.map((item)=><RecentRow key={item.id} title={item.title} meta={`${item.user?.name || 'Unknown user'} · ${(item.category || 'other').replaceAll('_',' ')}`} badge={`${item.priority} · ${item.status}`} date={item.createdAt} isDark={isDark}/>) }
                        </RecentPanel>
                    </div>
                </div>
            )}
        </>
    );
};

const formatCount = value => Number(value || 0).toLocaleString();
const formatMoney = value => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

function AdminSection({ title, subtitle, links, isDark, children }) {
    return <section className={`rounded-xl border p-5 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}><div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-base font-bold">{title}</h2><p className="mt-1 text-xs text-[#787b86]">{subtitle}</p></div><div className="flex flex-wrap gap-2">{links.map(([label,href])=><Link key={href} href={href} className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${isDark?'border-[#2a2e39] hover:bg-white/5':'border-slate-200 hover:bg-slate-50'}`}>{label}<ArrowRight size={13}/></Link>)}</div></div>{children}</section>;
}

function MetricCard({ label, value, detail, icon: Icon, color, isDark }) {
    return <div className={`rounded-xl border p-4 ${isDark?'border-[#2a2e39] bg-[#0b0e14]':'border-slate-200 bg-slate-50'}`}><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-[#787b86]">{label}</span><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{backgroundColor:`${color}1f`,color}}><Icon size={16}/></span></div><div className="mt-3 text-xl font-bold tabular-nums">{value}</div><div className="mt-1 text-[10px] text-[#787b86]">{detail}</div></div>;
}

function RecentPanel({ title, empty, href, isDark, children }) {
    const rows = React.Children.toArray(children);
    return <section className={`overflow-hidden rounded-xl border ${isDark?'border-[#2a2e39] bg-[#131722]':'border-slate-200 bg-white'}`}><div className={`flex items-center justify-between border-b px-5 py-4 ${isDark?'border-[#2a2e39]':'border-slate-200'}`}><h2 className="text-sm font-bold">{title}</h2><Link href={href} className="text-[10px] font-bold text-[#5b8cff] hover:text-[#2962ff]">View all</Link></div>{rows.length ? <div>{rows}</div> : <p className="p-8 text-center text-xs text-[#787b86]">{empty}</p>}</section>;
}

function RecentRow({ title, meta, badge, date, isDark }) {
    return <div className={`flex items-center justify-between gap-3 border-b px-5 py-3 last:border-b-0 ${isDark?'border-[#2a2e39]':'border-slate-200'}`}><div className="min-w-0"><div className="truncate text-xs font-bold">{title}</div><div className="mt-1 truncate text-[10px] capitalize text-[#787b86]">{meta}</div></div><div className="shrink-0 text-right"><div className="text-[9px] font-bold uppercase text-[#5b8cff]">{String(badge || 'unknown').replaceAll('_',' ')}</div><div className="mt-1 text-[9px] text-[#787b86]">{formatDate(date)}</div></div></div>;
}

export default Dashboard;
