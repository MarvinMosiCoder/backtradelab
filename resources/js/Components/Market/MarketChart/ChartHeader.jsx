import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { marketCategoryLabel } from '../../../utils/marketLabels';
import { Bell, CandlestickChart, Check, ChevronDown, CircleHelp, Info, LoaderCircle, Menu, Play, Search, SlidersHorizontal, Star, Trash2, X } from 'lucide-react';
import { TIMEFRAMES } from './constants';
import { formatPrice } from './utils';
import { useWatchlist } from '../../../Context/WatchlistContext';
import TimeframeSelector, { DEFAULT_TIMEFRAME_FAVORITES } from './TimeframeSelector';

const searchResultKey = (exchange, category, symbol) => `${String(exchange).toLowerCase()}:${String(category).toLowerCase()}:${String(symbol).toUpperCase()}`;

// Same anchored-tooltip pattern as the drawing-tool rail in ReplayPanel.jsx
// (useAnchoredTooltip + RailTooltipPortal): a portal-rendered label positioned
// via getBoundingClientRect so it escapes any clipping/overflow ancestors.
function useAnchoredTooltip() {
  const anchorRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [panelPos, setPanelPos] = useState(null);
  const show = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
  };
  const hide = () => setPos(null);
  // For a click-opened panel (not just a hover label) anchored below the trigger,
  // clamped so it never runs off the right edge — same escape-the-clipping-ancestor
  // reason as `show()` above, but this one also has to fit a whole panel on-screen,
  // not just a point. Compact mode's mobile toolbar wraps this trigger in an
  // `overflow-y-auto` panel, so a plain `absolute` popover gets clipped by that
  // ancestor's scrollport instead of floating over the chart (see TimeframeSelector.jsx's
  // "Select period" grid for the same fix).
  const openPanel = (width, align = 'right') => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawLeft = align === 'left' ? rect.left : rect.right - width;
    const left = Math.min(Math.max(8, rawLeft), window.innerWidth - width - 8);
    setPanelPos({ top: rect.bottom + 8, left });
  };
  const closePanel = () => setPanelPos(null);
  return { anchorRef, pos, show, hide, panelPos, openPanel, closePanel };
}

function HeaderTooltipPortal({ pos, label, isDark }) {
  if (!pos || !label || typeof document === 'undefined') return null;
  return createPortal(
    <span
      role="tooltip"
      className={`pointer-events-none fixed z-[9999] -translate-y-1/2 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium shadow-lg ${
        isDark ? 'border-[#363a45] bg-[#1e222d] text-white' : 'border-slate-200 bg-white text-slate-800'
      }`}
      style={{ top: pos.top, left: pos.left }}
    >
      {label}
    </span>,
    document.body
  );
}

function MarketCategoryTabs({ marketCategory, onCategoryChange, showFavoritesOnly, onSelectFavorites, onResetSearch, isDark }) {
  return (
    <div
      className={`flex w-full items-center gap-6 border-b ${isDark ? 'border-gray-700' : 'border-slate-200'}`}
      role="tablist"
      aria-label="Market type"
    >
      {[
        ['favorites', 'Favorites'],
        ['spot', 'Spot'],
        ['linear', 'Futures'],
      ].map(([value, label]) => {
        const active = value === 'favorites' ? showFavoritesOnly : (!showFavoritesOnly && marketCategory === value);
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (value === 'favorites') {
                if (!showFavoritesOnly) onSelectFavorites();
              } else if (showFavoritesOnly || marketCategory !== value) {
                onCategoryChange(value);
              }
              onResetSearch();
            }}
            className={`relative pb-2 text-[11px] font-semibold transition-colors ${
              active
                ? 'text-[#2962ff]'
                : isDark
                  ? 'text-gray-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {label}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#2962ff]" />}
          </button>
        );
      })}
    </div>
  );
}

export default function ChartHeader({ symbol, exchange, marketCategory, symbols, availableSymbols, isSavingSymbol, isRemovingSymbol, isLoadingAvailableSymbols, symbolError, timeframe, timeframeOptions = TIMEFRAMES, timeframeFavorites = DEFAULT_TIMEFRAME_FAVORITES, onTimeframeFavoritesChange = () => {}, replayMode, replayAccessStatus = 'idle', liveConnectionStatus = 'polling', currentPrice, selectedReplayPrice, indicators, onSymbolChange, onCategoryChange, onAddSymbol, onRemoveSymbol, onTimeframeChange, onToggleReplayMode, onIndicatorsChange, onOpenIndicatorSettings, onCreatePriceAlert, chartTheme, compact = false, className = '' }) {
  const { watchlists = {}, activeWatchlist: activeWatchlistName = null, addSymbolToWatchlist: onAddToWatchlist = null } = useWatchlist() ?? {};
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [recentlyAddedKey, setRecentlyAddedKey] = useState(null);
  const [watchlistMenuOpenKey, setWatchlistMenuOpenKey] = useState(null);
  const watchlistNames = useMemo(() => {
    const names = Object.keys(watchlists);
    if (activeWatchlistName && names.includes(activeWatchlistName)) {
      return [activeWatchlistName, ...names.filter((name) => name !== activeWatchlistName)];
    }
    return names;
  }, [watchlists, activeWatchlistName]);

  useEffect(() => {
    if (!isAddOpen) setWatchlistMenuOpenKey(null);
  }, [isAddOpen]);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMarketInfoOpen, setIsMarketInfoOpen] = useState(false);
  const [marketMetadata, setMarketMetadata] = useState(null);
  const [marketMetadataLoading, setMarketMetadataLoading] = useState(false);
  const [marketMetadataError, setMarketMetadataError] = useState('');
  const [symbolSearch, setSymbolSearch] = useState('');
  const [searchMetadata, setSearchMetadata] = useState({});
  const isDark = chartTheme?.mode === 'dark';
  const panelStyle = {
    backgroundColor: chartTheme?.panel ?? (isDark ? '#242627' : '#ffffff'),
    borderColor: chartTheme?.border ?? (isDark ? '#31363F' : '#e5e7eb'),
  };
  const fieldClass = `h-9 rounded-lg border px-3 text-xs font-medium outline-none transition-colors focus:border-[#2962ff] ${isDark ? 'border-gray-700 bg-black-table-color text-white' : 'border-gray-200 bg-gray-50 text-gray-800'}`;
  const labelClass = isDark ? 'text-gray-300' : 'text-gray-600';
  const neutralActionClass = isDark ? 'bg-white text-skin-black hover:bg-gray-200' : 'bg-skin-black text-white hover:bg-skin-black-light';
  const buildSymbolKey = (item) => `${item.exchange ?? 'bybit'}:${item.category ?? 'spot'}:${item.symbol}`;
  const categorySymbols = symbols.filter((item) => (item.category ?? 'spot') === marketCategory);
  const currentSymbolOption = {
    symbol,
    exchange: exchange ?? 'bybit',
    category: marketCategory ?? 'spot',
  };
  const currentSavedSymbol = symbols.find((item) => buildSymbolKey(item) === buildSymbolKey(currentSymbolOption));
  const symbolOptions = categorySymbols.some((item) => buildSymbolKey(item) === buildSymbolKey(currentSymbolOption)) ? categorySymbols : [currentSymbolOption, ...categorySymbols];
  const savedSymbolSet = new Set(symbols.map((item) => buildSymbolKey(item)));
  const activeIndicatorCount = ['volume', 'sma', 'ema', 'rsi', 'macd'].filter((key) => indicators[key]).length;
  const addSymbolOptions = availableSymbols.filter((item) => !savedSymbolSet.has(buildSymbolKey(item)));
  const filteredAddSymbolOptions = useMemo(() => {
    const query = symbolSearch.trim().toUpperCase();

    if (!query) {
      return availableSymbols.slice(0, 80);
    }

    return availableSymbols
      .filter((item) => {
        return [item.symbol, item.exchange, item.exchangeLabel, item.exchange_symbol, item.coin_name, item.baseCoin, item.quoteCoin, item.category, marketCategoryLabel(item.category), item.baseCoin && item.quoteCoin ? `${item.baseCoin}${item.quoteCoin}` : null, item.baseCoin && item.quoteCoin ? `${item.baseCoin}/${item.quoteCoin}` : null, `${item.exchange ?? ''} ${item.category ?? ''} ${item.symbol ?? ''}`].some((value) =>
          String(value ?? '')
            .toUpperCase()
            .includes(query),
        );
      })
      .slice(0, 80);
  }, [availableSymbols, symbolSearch]);

  const activeWatchlistSymbols = activeWatchlistName ? (watchlists[activeWatchlistName] ?? []) : [];
  const visibleSymbolOptions = showFavoritesOnly
    ? filteredAddSymbolOptions.filter((item) => activeWatchlistSymbols.includes(buildSymbolKey(item)))
    : filteredAddSymbolOptions;
  const handleCategoryTabChange = (value) => {
    setShowFavoritesOnly(false);
    onCategoryChange(value);
  };
  const handleSelectFavoritesTab = () => setShowFavoritesOnly(true);

  useEffect(() => {
    if (!isAddOpen || !filteredAddSymbolOptions.length) return undefined;
    const timer = setTimeout(() => {
      const markets = filteredAddSymbolOptions.slice(0, 40).map((item) => ({
        exchange: item.exchange ?? 'bybit',
        category: item.category ?? 'spot',
        symbol: item.symbol,
      }));
      axios.post('/market-metadata/batch', { markets }).then((response) => {
        const next = {};
        (response.data?.items ?? []).forEach((entry) => {
          next[searchResultKey(entry.market.exchange, entry.market.category, entry.market.symbol)] = entry;
        });
        setSearchMetadata(next);
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [isAddOpen, filteredAddSymbolOptions]);

  const handleSelectSymbol = (nextSymbol) => {
    if (!savedSymbolSet.has(buildSymbolKey(nextSymbol))) onAddSymbol(nextSymbol);
    else onSymbolChange(buildSymbolKey(nextSymbol));
    setSymbolSearch('');
    setIsAddOpen(false);
  };
  const handleAddToWatchlist = (item, targetWatchlistName) => {
    if (!onAddToWatchlist || !targetWatchlistName) return;
    if (!savedSymbolSet.has(buildSymbolKey(item))) onAddSymbol(item);
    onAddToWatchlist(targetWatchlistName, buildSymbolKey(item));
    setRecentlyAddedKey(buildSymbolKey(item));
    setWatchlistMenuOpenKey(null);
    setTimeout(() => setRecentlyAddedKey((current) => (current === buildSymbolKey(item) ? null : current)), 1500);
  };

  useEffect(() => {
    if (!isMarketInfoOpen) return undefined;
    const controller = new AbortController();
    setMarketMetadataLoading(true);
    setMarketMetadataError('');
    const params = new URLSearchParams({ exchange, category: marketCategory, symbol });
    fetch(`/market-metadata?${params.toString()}`, { headers: { Accept: 'application/json' }, signal: controller.signal })
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.message || 'Unable to load market information.');
        setMarketMetadata(payload);
      })
      .catch(error => { if (error.name !== 'AbortError') setMarketMetadataError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setMarketMetadataLoading(false); });
    return () => controller.abort();
  }, [exchange, isMarketInfoOpen, marketCategory, symbol]);

  const replayTooltip = useAnchoredTooltip();
  const alertTooltip = useAnchoredTooltip();
  const infoTooltip = useAnchoredTooltip();
  const indicatorsTooltip = useAnchoredTooltip();
  const symbolPickerTooltip = useAnchoredTooltip();
  const replayTooltipLabel = replayMode ? 'Back to live' : 'Start replay';

  const marketInfo = <MarketMetadataPopover metadata={marketMetadata} loading={marketMetadataLoading} error={marketMetadataError} isDark={isDark} panelStyle={panelStyle} pos={infoTooltip.panelPos}/>;

  const toggleMarketInfo = () => {
    setIsMarketInfoOpen((value) => {
      const next = !value;
      if (next) infoTooltip.openPanel(320); else infoTooltip.closePanel();
      return next;
    });
  };
  const toggleIndicators = () => {
    setIsIndicatorsOpen((value) => {
      const next = !value;
      if (next) indicatorsTooltip.openPanel(288); else indicatorsTooltip.closePanel();
      return next;
    });
  };
  const toggleAddOpen = () => {
    setIsAddOpen((value) => {
      const next = !value;
      if (next) symbolPickerTooltip.openPanel(compact ? 384 : 448, 'left'); else symbolPickerTooltip.closePanel();
      return next;
    });
  };

  if (compact) {
    const compactFieldClass = `h-8 rounded-md border px-2 text-xs outline-none ${isDark ? 'border-gray-700 bg-black-table-color/95 text-white' : 'border-gray-200 bg-white/95 text-gray-800'}`;

    return (
      <div className={`flex max-w-full flex-wrap items-center gap-2 rounded-md border p-2 shadow-xl backdrop-blur ${className}`} style={panelStyle}>
        <button type="button" onClick={() => setIsMobileMenuOpen((open) => !open)} className={`${compactFieldClass} flex items-center gap-2 font-semibold lg:hidden`} aria-expanded={isMobileMenuOpen} aria-label="Menu">
          <Menu size={15} />
          <ChevronDown size={13} className={`transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} absolute left-0 right-0 top-full z-[110] mt-2 max-h-[calc(100dvh-5rem)] flex-wrap items-center gap-2 overflow-y-auto rounded-lg border p-2 shadow-2xl lg:contents ${isDark ? 'border-gray-700 bg-black-table-color text-white' : 'border-gray-200 bg-white text-slate-900'}`}>
          <div className="relative min-w-0 flex-1" data-tour="market">
            <button ref={symbolPickerTooltip.anchorRef} type="button" onClick={toggleAddOpen} className={`${compactFieldClass} flex w-full items-center justify-between gap-2`}>
              <span className="truncate font-semibold text-emerald-500">
                {symbol} <span className={`text-[9px] font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{String(exchange).toUpperCase()}</span>
              </span>
              <ChevronDown size={13} />
            </button>
            {isAddOpen && symbolPickerTooltip.panelPos && typeof document !== 'undefined' && createPortal(
              <div className={`fixed z-[10021] w-96 max-w-[calc(100vw-1rem)] overflow-hidden rounded-md border shadow-2xl ${isDark ? 'border-gray-700 bg-black-table-color text-white' : 'border-gray-200 bg-white text-slate-900'}`} style={{ top: symbolPickerTooltip.panelPos.top, left: symbolPickerTooltip.panelPos.left }}>
                <div className={`flex items-center gap-2 rounded-full border mx-3 mt-3 px-3.5 py-2 transition-colors focus-within:border-[#2962ff] ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <Search size={14} className="text-gray-400" />
                  <input autoFocus value={symbolSearch} onChange={(e) => setSymbolSearch(e.target.value)} placeholder="Search all symbols" style={{ outline: 'none' }} className="min-w-0 flex-1 bg-transparent text-xs uppercase placeholder:text-gray-500" />
                  <button type="button" onClick={() => setIsAddOpen(false)} className={`rounded p-1 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                    <X size={14} />
                  </button>
                </div>
                <div className={`border-b px-3 pb-2 pt-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <MarketCategoryTabs
                    marketCategory={marketCategory}
                    onCategoryChange={handleCategoryTabChange}
                    showFavoritesOnly={showFavoritesOnly}
                    onSelectFavorites={handleSelectFavoritesTab}
                    onResetSearch={() => setSymbolSearch('')}
                    isDark={isDark}
                  />
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {visibleSymbolOptions.length ? (
                    visibleSymbolOptions.map((item) => {
                      const meta = searchMetadata[searchResultKey(item.exchange ?? 'bybit', item.category ?? 'spot', item.symbol)];
                      const watchlistItemKey = buildSymbolKey(item);
                      const inActiveWatchlist = activeWatchlistSymbols.includes(watchlistItemKey);
                      const justAddedToWatchlist = recentlyAddedKey === watchlistItemKey;
                      const menuOpen = watchlistMenuOpenKey === watchlistItemKey;
                      return (
                      <div key={buildSymbolKey(item)} className={`flex items-center gap-2.5 border-b px-3 py-2.5 last:border-b-0 ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                          {meta?.fundamentals?.logo_url ? <img src={meta.fundamentals.logo_url} alt="" className="h-full w-full object-contain" /> : <CandlestickChart size={12} className="text-[#5b8cff]" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-emerald-500">{item.symbol}</div>
                          <div className={`truncate text-[9px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                            {String(item.exchangeLabel ?? item.exchange).toUpperCase()} {marketCategoryLabel(item.category)}
                          </div>
                        </div>
                        {onAddToWatchlist && watchlistNames.length > 0 && (
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setWatchlistMenuOpenKey((current) => (current === watchlistItemKey ? null : watchlistItemKey))}
                              title={inActiveWatchlist ? 'In your active watchlist' : 'Add to watchlist'}
                              className={`flex h-6 w-6 items-center justify-center rounded-md border ${inActiveWatchlist || justAddedToWatchlist ? 'border-[#2962ff]/40 text-[#2962ff]' : isDark ? 'border-gray-700 text-gray-400 hover:border-[#2962ff] hover:text-[#2962ff]' : 'border-gray-200 text-slate-500 hover:border-[#2962ff] hover:text-[#2962ff]'}`}
                            >
                              <Star size={12} fill={inActiveWatchlist || justAddedToWatchlist ? 'currentColor' : 'none'} />
                            </button>
                            {menuOpen && (
                              <div className={`absolute right-0 top-7 z-[130] w-44 overflow-hidden rounded-md border shadow-2xl ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-gray-200 bg-white'}`}>
                                <div className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Add to watchlist</div>
                                {watchlistNames.map((name) => {
                                  const inList = (watchlists[name] ?? []).includes(watchlistItemKey);
                                  return (
                                    <button
                                      key={name}
                                      type="button"
                                      onClick={() => handleAddToWatchlist(item, name)}
                                      className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                                    >
                                      <span className="truncate">{name}</span>
                                      {inList && <Check size={12} className="shrink-0 text-emerald-500" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        <button type="button" onClick={() => handleSelectSymbol(item)} disabled={isSavingSymbol} className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                          Open
                        </button>
                      </div>
                      );
                    })
                  ) : (
                    <div className={`px-3 py-5 text-center text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{showFavoritesOnly ? 'No favorites in this market yet' : 'No symbols found'}</div>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>

          {currentSavedSymbol && (
            <button type="button" onClick={() => onRemoveSymbol(currentSavedSymbol)} disabled={isRemovingSymbol} className="flex h-8 w-8 items-center justify-center rounded-md text-red-400 hover:bg-red-500/10 disabled:opacity-40" aria-label="Remove saved symbol">
              <Trash2 size={14} />
            </button>
          )}

          <div data-tour="timeframe">
            <TimeframeSelector
              timeframe={timeframe}
              timeframeOptions={timeframeOptions}
              favorites={timeframeFavorites}
              onTimeframeChange={onTimeframeChange}
              onFavoritesChange={onTimeframeFavoritesChange}
              chartTheme={chartTheme}
            />
          </div>

          <button ref={replayTooltip.anchorRef} data-tour="replay" type="button" onClick={onToggleReplayMode} onMouseEnter={replayTooltip.show} onMouseLeave={replayTooltip.hide} onFocus={replayTooltip.show} onBlur={replayTooltip.hide} disabled={replayAccessStatus === 'checking-access'} aria-label={replayTooltipLabel} className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold disabled:cursor-wait disabled:opacity-60 ${replayMode ? 'bg-red-600 text-white hover:bg-red-700' : neutralActionClass}`}>
            {replayAccessStatus === 'checking-access' ? <LoaderCircle size={14} className="animate-spin" /> : replayMode ? <X size={14} /> : <Play size={14} />}
          </button>
          {replayAccessStatus !== 'checking-access' && <HeaderTooltipPortal pos={replayTooltip.pos} label={replayTooltipLabel} isDark={isDark} />}
          <button ref={alertTooltip.anchorRef} type="button" onClick={onCreatePriceAlert} onMouseEnter={alertTooltip.show} onMouseLeave={alertTooltip.hide} onFocus={alertTooltip.show} onBlur={alertTooltip.hide} aria-label="Create alert" className="flex h-8 items-center gap-1.5 rounded-md bg-[#2962ff] px-2.5 text-xs font-semibold text-white">
            <Bell size={13} />
          </button>
          <HeaderTooltipPortal pos={alertTooltip.pos} label="Create alert" isDark={isDark} />
          <div className="relative">
            <button ref={infoTooltip.anchorRef} type="button" onClick={toggleMarketInfo} onMouseEnter={infoTooltip.show} onMouseLeave={infoTooltip.hide} onFocus={infoTooltip.show} onBlur={infoTooltip.hide} className={`${compactFieldClass} flex w-8 items-center justify-center`} aria-label="Market information" aria-expanded={isMarketInfoOpen}><Info size={14}/></button>
            {isMarketInfoOpen && marketInfo}
            <HeaderTooltipPortal pos={infoTooltip.pos} label="Market information" isDark={isDark} />
          </div>

          <div className="relative">
            <button ref={indicatorsTooltip.anchorRef} type="button" onClick={toggleIndicators} onMouseEnter={indicatorsTooltip.show} onMouseLeave={indicatorsTooltip.hide} onFocus={indicatorsTooltip.show} onBlur={indicatorsTooltip.hide} aria-label="Indicators" className={`${compactFieldClass} flex items-center gap-1.5 font-semibold`}>
              <SlidersHorizontal size={13} />
            </button>
            <HeaderTooltipPortal pos={indicatorsTooltip.pos} label="Indicators" isDark={isDark} />
            {isIndicatorsOpen && indicatorsTooltip.panelPos && typeof document !== 'undefined' && createPortal(
              <div className={`fixed z-[10021] w-72 max-w-[85vw] space-y-3 rounded-md border p-3 shadow-2xl ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ ...panelStyle, top: indicatorsTooltip.panelPos.top, left: indicatorsTooltip.panelPos.left }}>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Add indicators</div>
                {[
                  ['volume', 'Volume'],
                  ['sma', 'SMA'],
                  ['ema', 'EMA'],
                  ['rsi', 'RSI'],
                  ['macd', 'MACD'],
                ].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => {
                    if (!indicators[key]) onIndicatorsChange((current) => ({ ...current, [key]: true, [`${key}Visible`]: true }));
                    onOpenIndicatorSettings?.(key);
                    setIsIndicatorsOpen(false);
                  }} className={`flex w-full items-center justify-between gap-3 rounded-md border p-2 text-xs font-semibold ${isDark ? 'border-gray-700 bg-black-table-color hover:bg-[#25282e]' : 'border-gray-200 bg-slate-50 hover:bg-slate-100'}`}>
                    <span>{label}</span>
                    <span className={indicators[key] ? 'text-emerald-400' : 'text-[#5b8cff]'}>{indicators[key] ? 'Settings' : '+ Add'}</span>
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
          <div className="min-w-0 px-1">
            <div className="truncate text-[10px] leading-none text-gray-400">{replayMode ? 'Replay' : 'Price'}</div>
            <div className="truncate text-sm font-bold leading-tight text-green-500">${formatPrice(currentPrice)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative z-40 rounded-lg border p-1.5 shadow-sm ${className}`} style={panelStyle}>
      <button type="button" onClick={() => setIsMobileMenuOpen((open) => !open)} className={`${fieldClass} flex w-full items-center justify-center gap-2 font-semibold lg:hidden`} aria-expanded={isMobileMenuOpen} aria-label="Menu">
        <Menu size={15} />
        <ChevronDown size={14} className={`shrink-0 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${isMobileMenuOpen ? 'grid' : 'hidden'} absolute left-0 right-0 top-full z-[110] mt-2 max-h-[calc(100dvh-5rem)] grid-cols-2 items-center gap-1.5 overflow-y-auto rounded-lg border p-2 shadow-2xl sm:grid-cols-12 lg:static lg:mt-0 lg:grid lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${isDark ? 'border-gray-700 bg-black-table-color text-white' : 'border-gray-200 bg-white text-slate-900'}`}>
        <div className="relative col-span-2 min-w-0 sm:col-span-12 lg:col-span-3">
          <label className="sr-only">Symbol</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button ref={symbolPickerTooltip.anchorRef} type="button" onClick={toggleAddOpen} className={`${fieldClass} flex min-w-0 flex-1 items-center justify-between gap-2 text-left font-semibold hover:border-[#2962ff]/60`} aria-expanded={isAddOpen}>
              <span className="truncate text-emerald-500">
                {symbol}{' '}
                <span className={`text-[9px] font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {String(exchange).toUpperCase()}
                </span>
              </span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
            {currentSavedSymbol && (
              <button type="button" onClick={() => onRemoveSymbol(currentSavedSymbol)} disabled={isRemovingSymbol} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/25 text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-40" aria-label={`Remove ${currentSavedSymbol.symbol}`}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {isAddOpen && symbolPickerTooltip.panelPos && typeof document !== 'undefined' && createPortal(
            <div className={`fixed z-[10021] w-[28rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-md border shadow-xl ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-gray-200 bg-white'}`} style={{ top: symbolPickerTooltip.panelPos.top, left: symbolPickerTooltip.panelPos.left }}>
              <div className={`flex items-center gap-2 rounded-full border mx-3 mt-3 px-3.5 py-2 transition-colors focus-within:border-[#2962ff] ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <Search size={14} className="text-gray-400" />
                <input autoFocus value={symbolSearch} onChange={(event) => setSymbolSearch(event.target.value)} placeholder="Search all symbols" style={{ outline: 'none' }} className={`min-w-0 flex-1 bg-transparent text-xs uppercase placeholder:text-gray-500 ${isDark ? 'text-white' : 'text-gray-800'}`} />
                <button
                  type="button"
                  onClick={() => {
                    setSymbolSearch('');
                    setIsAddOpen(false);
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <div className={`border-b px-3 pb-2 pt-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <MarketCategoryTabs
                  marketCategory={marketCategory}
                  onCategoryChange={handleCategoryTabChange}
                  showFavoritesOnly={showFavoritesOnly}
                  onSelectFavorites={handleSelectFavoritesTab}
                  onResetSearch={() => setSymbolSearch('')}
                  isDark={isDark}
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {visibleSymbolOptions.length ? (
                  visibleSymbolOptions.map((item) => {
                    const meta = searchMetadata[searchResultKey(item.exchange ?? 'bybit', item.category ?? 'spot', item.symbol)];
                    const watchlistItemKey = buildSymbolKey(item);
                    const inActiveWatchlist = activeWatchlistSymbols.includes(watchlistItemKey);
                    const justAddedToWatchlist = recentlyAddedKey === watchlistItemKey;
                    const menuOpen = watchlistMenuOpenKey === watchlistItemKey;
                    return (
                    <div key={buildSymbolKey(item)} className={`flex items-center gap-2.5 border-b px-3 py-2.5 last:border-b-0 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                        {meta?.fundamentals?.logo_url ? <img src={meta.fundamentals.logo_url} alt="" className="h-full w-full object-contain" /> : <CandlestickChart size={12} className="text-[#5b8cff]" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.symbol}</div>
                        <div className="truncate text-[10px] font-medium text-emerald-300">
                          {String(item.exchangeLabel ?? item.exchange ?? '').toUpperCase()} {marketCategoryLabel(item.category)}
                        </div>
                      </div>
                      {onAddToWatchlist && watchlistNames.length > 0 && (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setWatchlistMenuOpenKey((current) => (current === watchlistItemKey ? null : watchlistItemKey))}
                            title={inActiveWatchlist ? 'In your active watchlist' : 'Add to watchlist'}
                            className={`flex h-6 w-6 items-center justify-center rounded-md border ${inActiveWatchlist || justAddedToWatchlist ? 'border-[#2962ff]/40 text-[#2962ff]' : isDark ? 'border-gray-700 text-gray-400 hover:border-[#2962ff] hover:text-[#2962ff]' : 'border-gray-200 text-slate-500 hover:border-[#2962ff] hover:text-[#2962ff]'}`}
                          >
                            <Star size={12} fill={inActiveWatchlist || justAddedToWatchlist ? 'currentColor' : 'none'} />
                          </button>
                          {menuOpen && (
                            <div className={`absolute right-0 top-7 z-[130] w-44 overflow-hidden rounded-md border shadow-2xl ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-gray-200 bg-white'}`}>
                              <div className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Add to watchlist</div>
                              {watchlistNames.map((name) => {
                                const inList = (watchlists[name] ?? []).includes(watchlistItemKey);
                                return (
                                  <button
                                    key={name}
                                    type="button"
                                    onClick={() => handleAddToWatchlist(item, name)}
                                    className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                                  >
                                    <span className="truncate">{name}</span>
                                    {inList && <Check size={12} className="shrink-0 text-emerald-500" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      <button type="button" onClick={() => handleSelectSymbol(item)} disabled={isSavingSymbol} className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40" title={`Open ${item.symbol}`}>
                        Open
                      </button>
                    </div>
                    );
                  })
                ) : (
                  <div className="px-2 py-3 text-center text-xs text-gray-400">{showFavoritesOnly ? 'No favorites in this market yet' : 'No symbols found'}</div>
                )}
              </div>
            </div>,
            document.body
          )}
          {symbolError && <div className="mt-1 text-[11px] text-red-400">{symbolError}</div>}
        </div>

        <div className="col-span-1 min-w-0 sm:col-span-3 lg:col-span-1">
          <label className="sr-only">Timeframe</label>
          <TimeframeSelector
            timeframe={timeframe}
            timeframeOptions={timeframeOptions}
            favorites={timeframeFavorites}
            onTimeframeChange={onTimeframeChange}
            onFavoritesChange={onTimeframeFavoritesChange}
            chartTheme={chartTheme}
          />
        </div>

        <div className="col-span-2 min-w-0 sm:col-span-3 lg:col-span-2">
          <label className="sr-only">Replay</label>
          <button ref={replayTooltip.anchorRef} data-tour="replay" type="button" onClick={onToggleReplayMode} onMouseEnter={replayTooltip.show} onMouseLeave={replayTooltip.hide} onFocus={replayTooltip.show} onBlur={replayTooltip.hide} disabled={replayAccessStatus === 'checking-access'} aria-label={replayTooltipLabel} className={`flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${replayMode ? 'bg-red-600 text-white hover:bg-red-700' : neutralActionClass}`}>
            {replayAccessStatus === 'checking-access' ? <LoaderCircle size={15} className="animate-spin" /> : replayMode ? <X size={15} /> : <Play size={15} />}
          </button>
          {replayAccessStatus !== 'checking-access' && <HeaderTooltipPortal pos={replayTooltip.pos} label={replayTooltipLabel} isDark={isDark} />}
        </div>

        <div className="relative col-span-1 sm:col-span-3 lg:col-span-2">
          <button ref={indicatorsTooltip.anchorRef} type="button" onClick={toggleIndicators} onMouseEnter={indicatorsTooltip.show} onMouseLeave={indicatorsTooltip.hide} onFocus={indicatorsTooltip.show} onBlur={indicatorsTooltip.hide} aria-label="Indicators" className={`${fieldClass} flex w-full items-center justify-center gap-2 font-semibold hover:border-[#2962ff]/60`}>
            <SlidersHorizontal size={14} />
            {activeIndicatorCount > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2962ff] px-1 text-[9px] text-white">{activeIndicatorCount}</span>}
          </button>
          <HeaderTooltipPortal pos={indicatorsTooltip.pos} label="Indicators" isDark={isDark} />
          {isIndicatorsOpen && (
            <div className={`absolute right-0 top-full z-[100] mt-2 w-72 max-w-[calc(100vw-1rem)] space-y-3 rounded-lg border p-3 shadow-2xl ${isDark ? 'text-white' : 'text-slate-900'}`} style={panelStyle}>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Add indicators</div>
              {[
                ['volume', 'Volume'],
                ['sma', 'SMA'],
                ['ema', 'EMA'],
                ['rsi', 'RSI'],
                ['macd', 'MACD'],
              ].map(([key, label]) => (
                <button key={key} type="button" onClick={() => {
                  if (!indicators[key]) onIndicatorsChange((current) => ({ ...current, [key]: true, [`${key}Visible`]: true }));
                  onOpenIndicatorSettings?.(key);
                  setIsIndicatorsOpen(false);
                }} className={`flex w-full items-center justify-between gap-3 rounded-lg border p-2.5 text-xs font-semibold ${isDark ? 'border-gray-700 bg-black-table-color hover:bg-[#25282e]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                  <span>{label}</span>
                  <span className={indicators[key] ? 'text-emerald-500' : 'text-[#2962ff]'}>{indicators[key] ? 'Settings' : '+ Add'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button ref={alertTooltip.anchorRef} type="button" onClick={onCreatePriceAlert} onMouseEnter={alertTooltip.show} onMouseLeave={alertTooltip.hide} onFocus={alertTooltip.show} onBlur={alertTooltip.hide} aria-label="Create alert" className="col-span-1 flex h-9 items-center justify-center gap-2 rounded-lg bg-[#2962ff] px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-600 sm:col-span-3 lg:col-span-1">
          <Bell size={14} />
        </button>
        <HeaderTooltipPortal pos={alertTooltip.pos} label="Create alert" isDark={isDark} />

        <div className="relative col-span-1 sm:col-span-3 lg:col-span-1">
          <button ref={infoTooltip.anchorRef} type="button" onClick={toggleMarketInfo} onMouseEnter={infoTooltip.show} onMouseLeave={infoTooltip.hide} onFocus={infoTooltip.show} onBlur={infoTooltip.hide} className={`${fieldClass} flex w-full items-center justify-center gap-1.5 font-semibold hover:border-[#2962ff]/60`} aria-label="Market information" aria-expanded={isMarketInfoOpen}><Info size={14}/></button>
          {isMarketInfoOpen && marketInfo}
          <HeaderTooltipPortal pos={infoTooltip.pos} label="Market information" isDark={isDark} />
        </div>

        <div
          className="hidden"
          style={{
            borderColor: chartTheme?.border ?? (isDark ? '#31363F' : '#e5e7eb'),
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${replayMode ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            <div className="min-w-0">
              <div className="truncate text-[9px] font-semibold uppercase tracking-wider text-gray-400">{replayMode ? 'Replay price' : 'Live price'}</div>
            </div>
          </div>
          <div className={`min-w-0 text-right ${isDark ? 'text-white' : 'text-gray-800'}`}>
            <div className="truncate text-base font-bold leading-none text-emerald-500">${formatPrice(currentPrice)}</div>
            {replayMode && <div className={`mt-0.5 truncate text-[9px] ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>Selected: ${formatPrice(selectedReplayPrice)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const compactNumber = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(Number(value)) : '—';
const metadataPrice = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 8 }) : '—';

function MarketMetadataPopover({ metadata, loading, error, isDark, panelStyle, pos }) {
  const stats = metadata?.stats ?? {}, fundamentals = metadata?.fundamentals;
  const rows = [
    ['24h change', Number.isFinite(Number(stats.change_24h_percent)) ? `${Number(stats.change_24h_percent) >= 0 ? '+' : ''}${Number(stats.change_24h_percent).toFixed(2)}%` : '—'],
    ['24h high', metadataPrice(stats.high_24h)], ['24h low', metadataPrice(stats.low_24h)],
    ['Volume', compactNumber(stats.volume_24h)], ['Turnover', compactNumber(stats.turnover_24h)],
    ['Bid / Ask', `${metadataPrice(stats.bid_price)} / ${metadataPrice(stats.ask_price)}`],
    ['Mark / Index', `${metadataPrice(stats.mark_price)} / ${metadataPrice(stats.index_price)}`],
    ['Funding', Number.isFinite(Number(stats.funding_rate)) ? `${(Number(stats.funding_rate) * 100).toFixed(4)}%` : '—'],
    ['Open interest', compactNumber(stats.open_interest)],
  ];
  // Portaled + viewport-clamp-positioned (see useAnchoredTooltip's openPanel in this
  // file): this popover is triggered from inside FullscreenChartHeader's compact
  // mobile toolbar, an `overflow-y-auto` panel that would otherwise clip it instead
  // of letting it float over the chart.
  if (!pos || typeof document === 'undefined') return null;
  return createPortal(
    <div className={`fixed z-[10021] w-80 max-w-[calc(100vw-1rem)] rounded-xl border p-3 shadow-2xl ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ ...panelStyle, top: pos.top, left: pos.left }}>
    {loading && <div className="flex items-center gap-2 py-4 text-xs text-[#787b86]"><LoaderCircle size={14} className="animate-spin"/>Loading market information…</div>}
    {!loading && error && <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-500"><CircleHelp size={14}/>{error}</div>}
    {!loading && !error && metadata && <><div className="flex items-center gap-2"><img src={fundamentals?.logo_url || ''} alt="" className={`h-8 w-8 rounded-full object-contain ${fundamentals?.logo_url ? '' : 'hidden'}`}/><div><div className="text-sm font-bold">{fundamentals?.name || metadata.market?.base_coin || metadata.market?.symbol}</div><div className="text-[10px] uppercase text-[#787b86]">{metadata.market?.exchange} · {marketCategoryLabel(metadata.market?.category)}{fundamentals?.market_cap_rank ? ` · Rank #${fundamentals.market_cap_rank}` : ''}</div></div></div><div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">{rows.map(([label, value]) => value !== '—' && value !== '— / —' ? <div key={label} className="min-w-0"><div className="text-[9px] uppercase text-[#787b86]">{label}</div><div className="truncate text-xs font-semibold tabular-nums">{value}</div></div> : null)}</div>{fundamentals && <div className={`mt-3 grid grid-cols-2 gap-2 border-t pt-2 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}><Meta label="Market cap" value={compactNumber(fundamentals.market_cap)}/><Meta label="FDV" value={compactNumber(fundamentals.fully_diluted_valuation)}/><Meta label="Circulating" value={compactNumber(fundamentals.circulating_supply)}/><Meta label="Max supply" value={compactNumber(fundamentals.max_supply)}/><Meta label="ATH" value={metadataPrice(fundamentals.ath)}/><Meta label="ATL" value={metadataPrice(fundamentals.atl)}/></div>}{metadata.warnings?.length > 0 && <div className="mt-2 text-[9px] text-[#787b86]">{metadata.warnings.join(' ')}</div>}</>}
  </div>,
    document.body
  );
}

function Meta({ label, value }) { return value === '—' ? null : <div><div className="text-[9px] uppercase text-[#787b86]">{label}</div><div className="text-xs font-semibold tabular-nums">{value}</div></div>; }
