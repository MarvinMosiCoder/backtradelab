import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, BarChart3, BookOpen, LogOut, Menu, Moon, Search, Sun, X } from 'lucide-react';
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
        const syncSymbols = (event) => setSymbols(Array.isArray(event.detail) ? event.detail : []);
        window.addEventListener('backtradelab-symbols-changed', syncSymbols);
        return () => window.removeEventListener('backtradelab-symbols-changed', syncSymbols);
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
        router.visit('/dashboard');
    };

    const toggleTheme = () => {
        const nextTheme = isDark ? 'bg-skin-white' : 'bg-skin-black';
        setTheme(nextTheme);
        axios.post('/update-theme', { theme: nextTheme.replace('bg-', '') }).catch(() => {});
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

            <Link href="/dashboard" className="flex shrink-0 items-center gap-2 pr-3 sm:pr-5">
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

            <nav className="ml-auto hidden items-center gap-1 md:flex">
                <Link href="/dashboard" className="flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold hover:bg-white/10">
                    <BarChart3 size={14} /> Chart
                </Link>
                <Link href="/trade-report" className="flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold hover:bg-white/10">
                    <BookOpen size={14} /> Journal
                </Link>
            </nav>

            <div className={`ml-2 flex items-center gap-1 border-l pl-2 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}>
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
