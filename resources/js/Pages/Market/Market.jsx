import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { CandlestickChart, Search } from 'lucide-react';
import { useTheme } from '../../Context/ThemeContext';
import { marketCategoryLabel } from '../../utils/marketLabels';

const TOUR_STEPS = [
    ['Your 7-day backtesting trial is active', 'You have full replay and paper-backtesting access for seven days. Your trial countdown and renewal options are always available under Subscription.'],
    ['Choose your market', 'Browse your saved Spot and Futures markets here, then open one in Workspace.'],
    ['Analyze the chart', 'In Workspace, use Appearance for Volume, SMA, EMA, RSI, candle colors, size, and price alerts.'],
    ['Replay history', 'Start Replay and click the historical candle where your practice session should begin.'],
    ['Execute and review', 'Use Enter Position for paper orders, Assets for demo balances, and Trade journal for review.'],
];

export default function MarketSummary() {
    const { auth } = usePage().props;
    const { theme } = useTheme();
    const dark = theme === 'bg-skin-black';
    const [symbols, setSymbols] = useState([]);
    const [search, setSearch] = useState('');
    const [tourStep, setTourStep] = useState(auth?.user?.chart_tour_completed_at ? -1 : 0);

    useEffect(() => {
        fetch('/market-symbols', { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((data) => setSymbols(data.symbols ?? []))
            .catch(() => setSymbols([]));
    }, []);

    const filtered = useMemo(
        () => symbols.filter((item) => `${item.symbol} ${item.exchange} ${item.category} ${marketCategoryLabel(item.category)}`.toLowerCase().includes(search.toLowerCase())),
        [search, symbols],
    );

    const open = (item) => {
        const selected = { symbol: item.symbol, exchange: item.exchange, category: item.category };
        localStorage.setItem(`backtradelab-active-symbol:${auth?.user?.id ?? 'guest'}`, JSON.stringify(selected));
        router.visit('/dashboard');
    };

    const finishTour = async (openWorkspace = false) => {
        setTourStep(-1);
        try {
            await axios.post('/chart-tour/complete');
            if (openWorkspace) router.visit('/dashboard');
        } catch {
            setTourStep(0);
        }
    };

    const panel = dark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white';

    return <>
        <Head title="Market Summary" />
        <div className={dark ? 'text-white' : 'text-slate-900'}>
            <div className="text-xs font-bold uppercase tracking-[.18em] text-[#2962ff]">Discover markets</div>
            <h1 className="mt-1 text-2xl font-bold">Market Summary</h1>
            <p className="mt-1 text-sm text-[#787b86]">Browse your saved markets. Watchlists are managed directly inside Workspace.</p>
            <label className={`mt-5 flex h-11 items-center gap-2 rounded-xl border px-4 ${panel}`}>
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search saved markets" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => <article key={`${item.exchange}:${item.category}:${item.symbol}`} className={`rounded-xl border p-4 hover:border-[#2962ff] ${panel}`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2962ff]/15 text-[#5b8cff]"><CandlestickChart size={20} /></span>
                    <h2 className="mt-4 text-lg font-bold">{item.symbol}</h2>
                    <div className="text-[10px] uppercase text-[#787b86]">{item.exchange} · {marketCategoryLabel(item.category)}</div>
                    <button type="button" onClick={() => open(item)} className="mt-4 h-9 w-full rounded-lg bg-[#2962ff] text-xs font-bold text-white">Open in Workspace</button>
                </article>)}
            </div>
        </div>

        {tourStep >= 0 && <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/55 p-4 sm:items-center">
            <div className="w-full max-w-md rounded-xl border border-[#2a2e39] bg-[#131722] p-5 text-white shadow-2xl">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#5b8cff]">Getting started · {tourStep + 1}/{TOUR_STEPS.length}</div>
                <h2 className="mt-2 text-lg font-bold">{TOUR_STEPS[tourStep][0]}</h2>
                <p className="mt-2 text-sm leading-6 text-[#b2b5be]">{TOUR_STEPS[tourStep][1]}</p>
                <div className="mt-5 flex justify-between">
                    <button type="button" onClick={() => finishTour(false)} className="text-sm text-[#787b86] hover:text-white">Skip</button>
                    <button type="button" onClick={() => tourStep === TOUR_STEPS.length - 1 ? finishTour(true) : setTourStep(tourStep + 1)} className="rounded bg-[#2962ff] px-4 py-2 text-sm font-semibold">{tourStep === TOUR_STEPS.length - 1 ? 'Open Workspace' : 'Next'}</button>
                </div>
            </div>
        </div>}
    </>;
}
