import React, { useState } from 'react';
import Select from 'react-select';
import { CandlestickChart, ChevronDown, FolderPlus, Pencil, Star, Trash2, X } from 'lucide-react';
import { useTheme } from '../../Context/ThemeContext';
import { useWatchlist, watchlistMarketKey } from '../../Context/WatchlistContext';
import { marketCategoryLabel } from '../../utils/marketLabels';

const watchlistSelectStyles = (isDark) => ({
    control: (base, state) => ({
        ...base,
        minHeight: 28,
        height: 28,
        fontSize: 11,
        backgroundColor: isDark ? '#131722' : '#ffffff',
        borderColor: state.isFocused ? '#2962ff' : (isDark ? '#2a2e39' : '#e2e8f0'),
        boxShadow: 'none',
        '&:hover': { borderColor: '#2962ff' },
    }),
    valueContainer: (base) => ({ ...base, height: 28, padding: '0 8px' }),
    input: (base) => ({ ...base, margin: 0, padding: 0, color: isDark ? '#fff' : '#0f172a' }),
    indicatorsContainer: (base) => ({ ...base, height: 28 }),
    placeholder: (base) => ({ ...base, fontSize: 11, color: '#787b86' }),
    singleValue: (base) => ({ ...base, fontSize: 11, color: isDark ? '#fff' : '#0f172a' }),
    menu: (base) => ({ ...base, backgroundColor: isDark ? '#131722' : '#ffffff', border: `1px solid ${isDark ? '#2a2e39' : '#e2e8f0'}`, zIndex: 50 }),
    option: (base, state) => ({
        ...base,
        fontSize: 11,
        backgroundColor: state.isFocused ? (isDark ? '#1e222d' : '#f1f5f9') : 'transparent',
        color: state.isDisabled ? '#787b86' : (isDark ? '#fff' : '#0f172a'),
        cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    }),
});

export default function WatchlistPanel({ isFullscreen = false, compact = false, className = '', activeSymbolKey = null, onSelectSymbol }) {
    const watchlist = useWatchlist();
    const { theme } = useTheme();
    const isDark = theme === 'bg-skin-black';
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(Boolean(isFullscreen));

    if (!watchlist) return null;

    const {
        savedSymbols,
        savedSymbolsMetadata,
        watchlists,
        activeWatchlist,
        expandedWatchlists,
        watchlistMetadata,
        toggleWatchlist,
        addSymbolToWatchlist,
        removeSymbolFromWatchlist,
        openCreateWatchlistModal,
        openEditWatchlistModal,
        setDeleteWatchlistName,
    } = watchlist;

    return (
        <div className={`${className} ${isFullscreen ? 'w-72 max-w-[85vw] overflow-hidden rounded-lg border shadow-2xl' : `rounded-lg border p-2 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`} ${isFullscreen ? (isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white') : ''}`}>
            <div className={`flex items-center justify-between gap-3 ${isFullscreen ? `border-b px-2 py-1.5 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}` : 'px-1 pb-1.5'}`}>
                <button type="button" onClick={() => setIsPanelCollapsed((current) => !current)} className="flex min-w-0 items-center gap-1.5" aria-expanded={!isPanelCollapsed} aria-label={isPanelCollapsed ? 'Expand watchlists' : 'Collapse watchlists'}>
                    <ChevronDown size={13} className={`shrink-0 transition-transform ${isPanelCollapsed ? '-rotate-90' : ''} ${isDark ? 'text-[#787b86]' : 'text-slate-500'}`} />
                    <h2 className={`truncate text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Watchlists</h2>
                </button>
                <button type="button" onClick={openCreateWatchlistModal} className="flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-[#2962ff] px-2.5 text-[10px] font-bold text-white hover:bg-blue-600"><FolderPlus size={12} />Add watchlist</button>
            </div>
            {!isPanelCollapsed && (
                <div className={`space-y-1 ${isFullscreen ? 'max-h-[70vh] overflow-y-auto p-2' : 'mt-1'}`}>
                    {Object.entries(watchlists).map(([name, items]) => {
                        const expanded = expandedWatchlists.has(name);
                        return <section key={name} className={`overflow-hidden rounded-md border ${isDark ? 'border-[#2a2e39] bg-[#0b0e14]' : 'border-slate-200 bg-slate-50'}`}>
                            <div className={`flex items-center gap-1 px-1 ${activeWatchlist === name ? (isDark ? 'bg-white/5' : 'bg-blue-50') : ''}`}>
                                <button type="button" onClick={() => toggleWatchlist(name)} className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2 py-1.5 text-left">
                                    <span className="flex min-w-0 items-center gap-2"><Star size={12} className="shrink-0 text-amber-400" fill="currentColor" /><span className={`truncate text-[11px] font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{name}</span><span className={`rounded-full px-1.5 text-[8px] font-bold ${isDark ? 'bg-white/10 text-[#b2b5be]' : 'bg-slate-200 text-slate-600'}`}>{items.length}</span></span>
                                    <ChevronDown size={13} className={`shrink-0 text-[#787b86] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                </button>
                                <button type="button" onClick={() => openEditWatchlistModal(name)} className="rounded p-1.5 text-[#787b86] hover:text-[#2962ff]" aria-label={`Edit ${name}`}><Pencil size={11} /></button>
                                <button type="button" onClick={() => setDeleteWatchlistName(name)} className="rounded p-1.5 text-[#787b86] hover:text-red-500" aria-label={`Delete ${name}`}><Trash2 size={11} /></button>
                            </div>
                            {expanded && <div className={`border-t p-1.5 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}>
                                <Select
                                    value={null}
                                    onChange={(option) => option && addSymbolToWatchlist(name, option.value)}
                                    options={savedSymbols.map((item) => {
                                        const key = `${item.exchange ?? 'bybit'}:${item.category ?? 'spot'}:${item.symbol}`;
                                        const meta = savedSymbolsMetadata[watchlistMarketKey(item.exchange ?? 'bybit', item.category ?? 'spot', item.symbol)];
                                        return {
                                            value: key,
                                            label: `${item.symbol} · ${String(item.exchange).toUpperCase()} ${marketCategoryLabel(item.category)}`,
                                            isDisabled: items.includes(key),
                                            symbol: item.symbol,
                                            exchangeLabel: `${String(item.exchange ?? 'bybit').toUpperCase()} · ${marketCategoryLabel(item.category)}`,
                                            logoUrl: meta?.fundamentals?.logo_url ?? null,
                                            lastPrice: Number(meta?.stats?.last_price),
                                        };
                                    })}
                                    formatOptionLabel={(option) => <span className="flex items-center gap-2">
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                                            {option.logoUrl ? <img src={option.logoUrl} alt="" className="h-full w-full object-contain" /> : <CandlestickChart size={11} className="text-[#5b8cff]" />}
                                        </span>
                                        <span className="min-w-0 flex-1"><span className="block truncate font-bold">{option.symbol}</span><span className="block truncate text-[9px] text-[#787b86]">{option.exchangeLabel}</span></span>
                                        {Number.isFinite(option.lastPrice) && <span className="shrink-0 tabular-nums text-[9px] text-[#787b86]">{option.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 8 })}</span>}
                                    </span>}
                                    placeholder="Add a saved market…"
                                    aria-label={`Add market to ${name}`}
                                    isSearchable
                                    styles={watchlistSelectStyles(isDark)}
                                />
                                <div className={`mt-1.5 max-h-56 space-y-1 overflow-y-auto ${items.length ? 'pr-0.5' : ''}`}>{items.map((key) => {
                                    const saved = savedSymbols.find((item) => `${item.exchange ?? 'bybit'}:${item.category ?? 'spot'}:${item.symbol}` === key);
                                    const [exchange, category, ...symbolParts] = key.split(':');
                                    const market = saved ?? { symbol: symbolParts.join(':'), exchange, category };
                                    const isActive = Boolean(activeSymbolKey) && watchlistMarketKey(exchange, category, market.symbol) === activeSymbolKey;
                                    const meta = watchlistMetadata[watchlistMarketKey(exchange, category, market.symbol)];
                                    const change = Number(meta?.stats?.change_24h_percent);
                                    const hasChange = Number.isFinite(change);
                                    const lastPrice = Number(meta?.stats?.last_price);
                                    return <div key={key} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${isActive ? 'border-[#2962ff] bg-[#2962ff]/10' : (isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white')}`}>
                                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                                            {meta?.fundamentals?.logo_url ? <img src={meta.fundamentals.logo_url} alt="" className="h-full w-full object-contain" /> : <CandlestickChart size={12} className="text-[#5b8cff]" />}
                                        </span>
                                        <button type="button" onClick={() => onSelectSymbol?.({ symbol: market.symbol, exchange: market.exchange, category: market.category })} className="min-w-0 flex-1 text-left">
                                            <span className={`block truncate text-xs font-bold ${isActive ? 'text-[#5b8cff]' : 'text-emerald-500'}`}>{market.symbol}</span>
                                            <span className={`block truncate text-[9px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{String(market.exchange ?? 'bybit').toUpperCase()} {marketCategoryLabel(market.category)}</span>
                                        </button>
                                        {meta && <span className="shrink-0 text-right text-[10px] tabular-nums text-[#787b86]">
                                            <span className="block">{Number.isFinite(lastPrice) ? lastPrice.toLocaleString(undefined, { maximumFractionDigits: 8 }) : '—'}</span>
                                            {hasChange && <span className={`block ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>}
                                        </span>}
                                        <button type="button" onClick={() => removeSymbolFromWatchlist(name, key)} className="shrink-0 p-1.5 text-[#787b86] hover:text-red-500" aria-label={`Remove ${market.symbol} from ${name}`}><X size={11} /></button>
                                    </div>;
                                })}{!items.length && <span className="block px-1 py-1 text-[10px] text-[#787b86]">No markets yet.</span>}</div>
                            </div>}
                        </section>;
                    })}
                </div>
            )}
        </div>
    );
}
