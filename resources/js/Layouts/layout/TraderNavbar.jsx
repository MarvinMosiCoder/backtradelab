import React, { useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, BarChart3, Bell, LogOut, Menu, Moon, RefreshCw, Search, Sun, Wallet, X } from 'lucide-react';
import axios from 'axios';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';
import { useSidebar } from '../../Context/SidebarContext';
import { useTheme } from '../../Context/ThemeContext';
import { marketCategoryLabel } from '../../utils/marketLabels';

export default function TraderNavbar() {
    const { auth } = usePage().props;
    const activeSymbolStorageKey = `backtradelab-active-symbol:${auth?.user?.id ?? 'guest'}`;
    const { toggleSidebar } = useSidebar();
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'bg-skin-black';
    const [logo, setLogo] = useState('');
    const [symbols, setSymbols] = useState([]);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showAssets, setShowAssets] = useState(false);
    const [assetsAccount, setAssetsAccount] = useState(null);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [assetsError, setAssetsError] = useState('');
    const [startingBalance, setStartingBalance] = useState('10000');
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [alertToast, setAlertToast] = useState(null);
    const alertSoundEnabledRef = useRef(true);
    const [activeSymbol, setActiveSymbol] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(`backtradelab-active-symbol:${auth?.user?.id ?? 'guest'}`) || 'null');
        } catch {
            return null;
        }
    });

    useEffect(() => {
        getAppLogo().then(setLogo);
        fetch('/market-symbols', { headers: { Accept: 'application/json' } })
            .then((response) => response.ok ? response.json() : Promise.reject(response))
            .then((payload) => setSymbols(Array.isArray(payload.symbols) ? payload.symbols : []))
            .catch(() => setSymbols([]));
    }, []);

    useEffect(() => {
        let stopped = false, initialized = false, toastTimer = null;
        const storageKey = `backtradelab-last-alert-notification:${auth?.user?.id}`;
        const playAlertSound = () => {
            try { const ctx = new AudioContext(); const oscillator = ctx.createOscillator(); oscillator.connect(ctx.destination); oscillator.frequency.value = 880; oscillator.start(); oscillator.stop(ctx.currentTime + .18); } catch {}
        };
        const showAlertToast = (item, playSound = false) => {
            const id = Number(item?.id);
            if (!Number.isFinite(id) || id <= 0) return;
            const previous = Number(localStorage.getItem(storageKey) || 0);
            if (id <= previous) return;
            localStorage.setItem(storageKey, String(id));
            setAlertToast({ id, content: item.content || 'A price alert was triggered.' });
            window.clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => setAlertToast(null), 6000);
            if (playSound) playAlertSound();
        };
        const poll = async () => {
            try {
                const { data } = await axios.get('/notifications/feed');
                if (stopped) return;
                setUnreadNotifications(Number(data.unread_notifications) || 0);
                alertSoundEnabledRef.current = data.alert_sound_enabled !== false;
                const alerts = (data.notifications ?? []).filter(item => item.type === 'price alert');
                const newestAlert = alerts.reduce((newest, item) => Number(item.id) > Number(newest?.id ?? 0) ? item : newest, null);
                if (initialized && newestAlert) showAlertToast(newestAlert, alertSoundEnabledRef.current);
                if (!initialized && newestAlert) {
                    const previous = Number(localStorage.getItem(storageKey) || 0);
                    localStorage.setItem(storageKey, String(Math.max(previous, Number(newestAlert.id))));
                }
                initialized = true;
            } catch {}
        };
        const handleTriggeredAlert = (event) => {
            setUnreadNotifications((count) => count + 1);
            showAlertToast(event.detail, alertSoundEnabledRef.current);
        };
        window.addEventListener('backtradelab-alert-triggered', handleTriggeredAlert);
        poll(); const timer = window.setInterval(poll, 5000);
        return () => { stopped = true; window.clearInterval(timer); window.clearTimeout(toastTimer); window.removeEventListener('backtradelab-alert-triggered', handleTriggeredAlert); };
    }, [auth?.user?.id]);

    useEffect(() => {
        const syncSymbols = (event) => setSymbols(Array.isArray(event.detail) ? event.detail : []);
        window.addEventListener('backtradelab-symbols-changed', syncSymbols);
        return () => window.removeEventListener('backtradelab-symbols-changed', syncSymbols);
    }, []);

    useEffect(() => {
        const syncAccount = (event) => {
            if (event.detail) {
                setAssetsAccount(event.detail);
                setAssetsError('');
            }
        };
        const syncActiveSymbol = (event) => event.detail && setActiveSymbol(event.detail);

        window.addEventListener('backtradelab-backtest-account-changed', syncAccount);
        window.addEventListener('backtradelab-active-symbol-change', syncActiveSymbol);
        return () => {
            window.removeEventListener('backtradelab-backtest-account-changed', syncAccount);
            window.removeEventListener('backtradelab-active-symbol-change', syncActiveSymbol);
        };
    }, []);

    const symbolKey = (item) => item?.symbol
        ? `${item.exchange ?? 'bybit'}:${item.category ?? 'spot'}:${item.symbol}`
        : '';

    const changeSymbol = (event) => {
        const item = symbols.find((symbol) => symbolKey(symbol) === event.target.value);
        if (!item) return;

        const selected = {
            symbol: item.symbol,
            exchange: item.exchange ?? 'bybit',
            category: item.category ?? 'spot',
        };
        setActiveSymbol(selected);
        localStorage.setItem(activeSymbolStorageKey, JSON.stringify(selected));
        window.dispatchEvent(new CustomEvent('backtradelab-active-symbol-change', { detail: selected }));
        router.visit('/workspace');
    };

    const toggleTheme = () => {
        const nextTheme = isDark ? 'bg-skin-white' : 'bg-skin-black';
        setTheme(nextTheme);
        axios.post('/update-theme', { theme: nextTheme.replace('bg-', '') }).catch(() => {});
    };

    const loadAssets = async () => {
        setAssetsLoading(true);
        setAssetsError('');

        try {
            const response = await axios.get('/market-backtest/account', {
                params: {
                    ...(activeSymbol?.symbol ? { symbol: activeSymbol.symbol } : {}),
                    ...(activeSymbol?.exchange ? { exchange: activeSymbol.exchange } : {}),
                    ...(activeSymbol?.category ? { category: activeSymbol.category } : {}),
                },
                headers: { Accept: 'application/json' },
            });
            setAssetsAccount(response.data?.account ?? null);
            setStartingBalance(String(response.data?.account?.startingBalance ?? 10000));
        } catch (error) {
            setAssetsError(error.response?.data?.message ?? 'Unable to load demo assets.');
        } finally {
            setAssetsLoading(false);
        }
    };

    const toggleAssets = () => {
        setShowAssets((current) => {
            const next = !current;
            if (next && !assetsAccount) loadAssets();
            return next;
        });
    };

    const resetDemoAccount = async () => {
        const amount = Number(startingBalance);
        if (!Number.isFinite(amount) || amount < 1 || amount > 1000000000) { setAssetsError('Starting balance must be between 1 and 1,000,000,000.'); return; }
        if (!window.confirm(`Reset Demo Account to ${amount.toLocaleString()} USDT? This deletes cash history, PnL, positions, and demo trades.`)) return;

        setAssetsLoading(true);
        setAssetsError('');
        try {
            const response = await axios.post('/market-backtest/reset', { starting_balance: amount });
            const nextAccount = response.data?.account ?? null;
            setAssetsAccount(nextAccount);
            window.dispatchEvent(new CustomEvent('backtradelab-backtest-account-external-change', { detail: nextAccount }));
        } catch (error) {
            setAssetsError(error.response?.data?.message ?? 'Unable to reset the demo account.');
        } finally {
            setAssetsLoading(false);
        }
    };

    const formatAssetMoney = (value, currency = assetsAccount?.quoteCurrency ?? 'USDT') => {
        const amount = Number(value);
        return `${Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'} ${currency}`;
    };

    const logout = () => {
        setShowLogoutModal(false);
        router.post('/logout');
    };

    return (
        <header className={`flex h-14 items-center border-b px-3 sm:px-4 ${isDark ? 'border-[#2a2e39] bg-[#131722] text-[#d1d4dc]' : 'border-slate-200 bg-white text-slate-800'}`}>
            <button type="button" onClick={() => toggleSidebar()} className="mr-2 rounded-md p-2 hover:bg-white/10 lg:hidden" aria-label="Toggle navigation">
                <Menu size={18} />
            </button>

            <Link href="/workspace" className="flex shrink-0 items-center gap-2 pr-3 sm:pr-5">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-[#2962ff]">
                    {logo ? <img src={logo} alt="BacktradeLab" className="h-full w-full object-contain p-1" /> : <BarChart3 size={17} className="text-white" />}
                </div>
                <div className="hidden sm:block">
                    <div className="text-sm font-bold leading-none">BacktradeLab</div>
                    <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#787b86]">Trading terminal</div>
                </div>
            </Link>

            <div className={`hidden h-8 items-center gap-2 rounded-md border px-2 md:flex ${isDark ? 'border-[#2a2e39] bg-[#0b0e14]' : 'border-slate-200 bg-slate-50'}`}>
                <Search size={14} className="text-[#787b86]" />
                <select value={symbolKey(activeSymbol)} onChange={changeSymbol} className="max-w-52 bg-transparent text-xs font-semibold outline-none">
                    <option value="">Select market</option>
                    {symbols.map((item) => (
                        <option key={symbolKey(item)} value={symbolKey(item)}>
                            {item.symbol} · {String(item.exchange).toUpperCase()} · {marketCategoryLabel(item.category)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="ml-auto" />

            <div className={`ml-2 flex items-center gap-1 border-l pl-2 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}>
                <Link href="/notifications/view-all-notifications" className="relative rounded-md p-2 hover:bg-white/10" title="Notifications" aria-label="Notifications">
                    <Bell size={17} />
                    {unreadNotifications > 0 && <span className="absolute right-0 top-0 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
                </Link>
                <div className="relative">
                    <button
                        type="button"
                        onClick={toggleAssets}
                        className={`flex h-9 items-center gap-2 rounded-md px-2 text-xs font-semibold transition ${showAssets ? 'bg-[#2962ff]/15 text-[#5b8cff]' : 'hover:bg-white/10'}`}
                        aria-label="Open demo assets"
                        aria-expanded={showAssets}
                    >
                        <Wallet size={16} />
                        <span className="hidden lg:inline">Assets</span>
                    </button>

                    {showAssets && (
                        <div className={`absolute right-0 top-11 z-[230] w-[min(92vw,380px)] overflow-hidden rounded-xl border shadow-2xl ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}>
                            <div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2962ff]/15 text-[#5b8cff]"><Wallet size={18} /></span>
                                    <div><div className="text-sm font-bold">Assets</div><div className="text-[10px] uppercase tracking-wider text-[#787b86]">Paper trading only</div></div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={loadAssets} disabled={assetsLoading} className="rounded-md p-2 text-[#787b86] hover:bg-white/10 hover:text-current disabled:opacity-50" aria-label="Refresh assets"><RefreshCw size={15} className={assetsLoading ? 'animate-spin' : ''} /></button>
                                    <button type="button" onClick={() => setShowAssets(false)} className="rounded-md p-2 text-[#787b86] hover:bg-white/10 hover:text-current" aria-label="Close assets"><X size={16} /></button>
                                </div>
                            </div>

                            <div className="max-h-[min(72vh,620px)] space-y-3 overflow-y-auto p-4">
                                {assetsError && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{assetsError}</div>}
                                {!assetsAccount && assetsLoading && <div className="py-8 text-center text-xs text-[#787b86]">Loading demo assets...</div>}
                                {assetsAccount && (
                                    <>
                                        <div className={`rounded-lg border p-3 ${isDark ? 'border-[#2a2e39] bg-[#0b0e14]' : 'border-slate-200 bg-slate-50'}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div><div className="text-[10px] uppercase tracking-wider text-[#787b86]">Demo account</div><div className="mt-1 text-sm font-bold">{assetsAccount.name ?? 'Demo Account'}</div></div>
                                                <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-400">Simulated</span>
                                            </div>
                                            <div className="mt-4 text-[10px] uppercase tracking-wider text-[#787b86]">Total equity</div>
                                            <div className="mt-1 text-2xl font-bold">{formatAssetMoney(assetsAccount.equity)}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                ['Available cash', formatAssetMoney(assetsAccount.cashBalance)],
                                                ['Locked margin', formatAssetMoney(assetsAccount.lockedMargin)],
                                                ['Open PnL', formatAssetMoney(assetsAccount.unrealizedPnl)],
                                                ['Realized PnL', formatAssetMoney(assetsAccount.realizedPnl)],
                                                ['Starting balance', formatAssetMoney(assetsAccount.startingBalance)],
                                                ['Fees paid', formatAssetMoney(assetsAccount.feesPaid)],
                                            ].map(([label, value]) => (
                                                <div key={label} className={`rounded-md border p-2.5 ${isDark ? 'border-[#2a2e39] bg-[#0b0e14]' : 'border-slate-200 bg-slate-50'}`}><div className="text-[9px] uppercase tracking-wider text-[#787b86]">{label}</div><div className="mt-1 truncate text-xs font-semibold">{value}</div></div>
                                            ))}
                                        </div>

                                        <div className={`rounded-lg border p-3 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-[#787b86]">Current activity</div>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><span>Open positions</span><strong className="text-right">{assetsAccount.openPositions?.length ?? 0}</strong><span>Pending entries</span><strong className="text-right">{assetsAccount.pendingPositions?.length ?? 0}</strong><span>Session</span><strong className="truncate text-right">{assetsAccount.activeSession?.name ?? 'None'}</strong></div>
                                        </div>

                                        <div>
                                            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#787b86]">Recent demo transactions</div>
                                            <div className="max-h-36 space-y-1 overflow-y-auto">
                                                {assetsAccount.trades?.length ? assetsAccount.trades.slice(0, 8).map((trade) => (
                                                    <div key={trade.id} className={`flex items-center justify-between gap-2 rounded px-2.5 py-2 text-[11px] ${isDark ? 'bg-[#0b0e14]' : 'bg-slate-50'}`}><span className="truncate">{String(trade.action).toUpperCase()} {String(trade.side).toUpperCase()} {trade.symbol}</span><span className={Number(trade.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>{trade.pnl == null ? formatAssetMoney(trade.notional) : formatAssetMoney(trade.pnl)}</span></div>
                                                )) : <div className="py-3 text-center text-[11px] text-[#787b86]">No demo transactions yet</div>}
                                            </div>
                                        </div>

                                        <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#787b86]">Override starting balance</span><input type="number" min="1" max="1000000000" step="0.01" value={startingBalance} onChange={event => setStartingBalance(event.target.value)} className={`h-9 w-full rounded-md border bg-transparent px-3 text-sm ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`} /></label>
                                        <button type="button" onClick={resetDemoAccount} disabled={assetsLoading} className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"><RefreshCw size={14} /> Reset Demo Account</button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <button type="button" onClick={toggleTheme} className="rounded-md p-2 hover:bg-white/10" title="Toggle theme">
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <div className="hidden text-right sm:block">
                    <div className="max-w-28 truncate text-xs font-semibold">{auth?.user?.name}</div>
                    <div className="text-[9px] uppercase tracking-wider text-[#787b86]">Trader</div>
                </div>
                <button type="button" onClick={() => setShowLogoutModal(true)} className="rounded-md p-2 text-[#787b86] hover:bg-red-500/10 hover:text-red-400" title="Sign out">
                    <LogOut size={16} />
                </button>
            </div>

            {alertToast && (
                <div className={`fixed right-4 top-4 z-[260] flex w-[min(92vw,360px)] items-start gap-3 rounded-xl border p-4 shadow-2xl ${isDark ? 'border-amber-400/30 bg-[#131722] text-[#d1d4dc]' : 'border-amber-300 bg-white text-slate-900'}`} role="status" aria-live="polite">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500"><Bell size={17} /></span>
                    <div className="min-w-0 flex-1"><div className="text-xs font-bold uppercase tracking-wider text-amber-500">Price alert</div><div className="mt-1 text-sm leading-5">{alertToast.content}</div></div>
                    <button type="button" onClick={() => setAlertToast(null)} className={`rounded-md p-1 ${isDark ? 'text-[#787b86] hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`} aria-label="Dismiss price alert"><X size={16} /></button>
                </div>
            )}

            {showLogoutModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowLogoutModal(false)}>
                    <div className={`w-full max-w-sm overflow-hidden rounded-xl border shadow-2xl ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`} role="dialog" aria-modal="true" aria-labelledby="logout-title">
                        <div className={`flex items-center justify-between border-b px-5 py-4 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400"><AlertTriangle size={18} /></span><div><h2 id="logout-title" className="text-sm font-bold">Sign out?</h2><p className="mt-0.5 text-[11px] text-[#787b86]">Your saved work will remain available.</p></div></div>
                            <button type="button" onClick={() => setShowLogoutModal(false)} className="rounded-md p-1.5 text-[#787b86] hover:bg-white/10" aria-label="Close"><X size={17} /></button>
                        </div>
                        <div className="px-5 py-4 text-xs leading-5 text-[#787b86]">You will need to sign in again to access your replay sessions, drawings, and journal.</div>
                        <div className={`flex justify-end gap-2 border-t px-5 py-4 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}>
                            <button type="button" onClick={() => setShowLogoutModal(false)} className={`h-9 rounded-md border px-4 text-xs font-semibold ${isDark ? 'border-[#2a2e39] hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}>Stay signed in</button>
                            <button type="button" onClick={logout} className="flex h-9 items-center gap-2 rounded-md bg-red-500 px-4 text-xs font-bold text-white hover:bg-red-600"><LogOut size={14} /> Sign out</button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
