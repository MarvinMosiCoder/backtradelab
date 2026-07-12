import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { CandlestickChart, Search } from 'lucide-react';
import { useTheme } from '../../Context/ThemeContext';

export default function MarketSummary() {
    const { auth } = usePage().props;
    const { theme } = useTheme();
    const dark = theme === 'bg-skin-black';
    const [symbols,setSymbols] = useState([]);
    const [search,setSearch] = useState('');
    useEffect(()=>{fetch('/market-symbols',{headers:{Accept:'application/json'}}).then((response)=>response.json()).then((data)=>setSymbols(data.symbols??[])).catch(()=>setSymbols([]));},[]);
    const filtered = useMemo(()=>symbols.filter((item)=>`${item.symbol} ${item.exchange} ${item.category}`.toLowerCase().includes(search.toLowerCase())),[search,symbols]);
    const open = (item) => { const selected={symbol:item.symbol,exchange:item.exchange,category:item.category}; localStorage.setItem(`backtradelab-active-symbol:${auth?.user?.id ?? 'guest'}`,JSON.stringify(selected)); router.visit('/dashboard'); };
    const panel=dark?'border-[#2a2e39] bg-[#131722]':'border-slate-200 bg-white';
    return <><Head title="Market Summary"/><div className={dark?'text-white':'text-slate-900'}><div className="text-xs font-bold uppercase tracking-[.18em] text-[#2962ff]">Discover markets</div><h1 className="mt-1 text-2xl font-bold">Market Summary</h1><p className="mt-1 text-sm text-[#787b86]">Browse your saved markets. Watchlists are managed directly inside Workspace.</p><label className={`mt-5 flex h-11 items-center gap-2 rounded-xl border px-4 ${panel}`}><Search size={16}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search saved markets" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((item)=><article key={`${item.exchange}:${item.category}:${item.symbol}`} className={`rounded-xl border p-4 hover:border-[#2962ff] ${panel}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2962ff]/15 text-[#5b8cff]"><CandlestickChart size={20}/></span><h2 className="mt-4 text-lg font-bold">{item.symbol}</h2><div className="text-[10px] uppercase text-[#787b86]">{item.exchange} · {item.category}</div><button onClick={()=>open(item)} className="mt-4 h-9 w-full rounded-lg bg-[#2962ff] text-xs font-bold text-white">Open in Workspace</button></article>)}</div></div></>;
}
