import React, { useEffect, useMemo, useState } from 'react';
import { marketCategoryLabel } from '../../../utils/marketLabels';
import { Bell, ChevronDown, CircleHelp, Info, LoaderCircle, Menu, Play, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { TIMEFRAMES } from './constants';
import { formatPrice } from './utils';

export default function ChartHeader({ symbol, exchange, marketCategory, symbols, availableSymbols, isSavingSymbol, isRemovingSymbol, isLoadingAvailableSymbols, symbolError, timeframe, timeframeOptions = TIMEFRAMES, replayMode, replayAccessStatus = 'idle', liveConnectionStatus = 'polling', currentPrice, selectedReplayPrice, candleColors, candleSize, indicators, onSymbolChange, onCategoryChange, onAddSymbol, onRemoveSymbol, onTimeframeChange, onToggleReplayMode, onCandleColorChange, onCandleSizeChange, onIndicatorsChange, onOpenIndicatorSettings, onCreatePriceAlert, chartTheme, compact = false, className = '' }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMarketInfoOpen, setIsMarketInfoOpen] = useState(false);
  const [marketMetadata, setMarketMetadata] = useState(null);
  const [marketMetadataLoading, setMarketMetadataLoading] = useState(false);
  const [marketMetadataError, setMarketMetadataError] = useState('');
  const [symbolSearch, setSymbolSearch] = useState('');
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

  const handleSelectSymbol = (nextSymbol) => {
    if (!savedSymbolSet.has(buildSymbolKey(nextSymbol))) onAddSymbol(nextSymbol);
    else onSymbolChange(buildSymbolKey(nextSymbol));
    setSymbolSearch('');
    setIsAddOpen(false);
  };
  const handleCandleSizeChange = (value) => {
    const nextSize = Math.min(Math.max(Number(value) || 8, 3), 24);
    onCandleSizeChange(nextSize);
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

  const marketInfo = <MarketMetadataPopover metadata={marketMetadata} loading={marketMetadataLoading} error={marketMetadataError} isDark={isDark} panelStyle={panelStyle}/>;

  if (compact) {
    const compactFieldClass = `h-8 rounded-md border px-2 text-xs outline-none ${isDark ? 'border-gray-700 bg-black-table-color/95 text-white' : 'border-gray-200 bg-white/95 text-gray-800'}`;

    return (
      <div className={`flex max-w-full flex-wrap items-center gap-2 rounded-md border p-2 shadow-xl backdrop-blur ${className}`} style={panelStyle}>
        <button type="button" onClick={() => setIsMobileMenuOpen((open) => !open)} className={`${compactFieldClass} flex items-center gap-2 font-semibold lg:hidden`} aria-expanded={isMobileMenuOpen}>
          <Menu size={15} />
          <span className="max-w-28 truncate text-emerald-500">{symbol}</span>
          <ChevronDown size={13} className={`transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} absolute left-0 right-0 top-full z-[110] mt-2 max-h-[calc(100dvh-5rem)] flex-wrap items-center gap-2 overflow-y-auto rounded-lg border p-2 shadow-2xl lg:contents ${isDark ? 'border-gray-700 bg-black-table-color text-white' : 'border-gray-200 bg-white text-slate-900'}`}>
          <div className="relative">
            <button type="button" onClick={() => setIsAddOpen((value) => !value)} className={`${compactFieldClass} flex w-44 max-w-[42vw] items-center justify-between gap-2`}>
              <span className="truncate font-semibold text-emerald-500">
                {symbol} <span className={`text-[9px] font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{String(exchange).toUpperCase()}</span>
              </span>
              <ChevronDown size={13} />
            </button>
            {isAddOpen && (
              <div className={`absolute left-0 top-full z-[120] mt-2 w-80 max-w-[85vw] overflow-hidden rounded-md border shadow-2xl ${isDark ? 'border-gray-700 bg-black-table-color text-white' : 'border-gray-200 bg-white text-slate-900'}`}>
                <div className={`flex items-center gap-2 border-b p-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <Search size={14} className="text-gray-400" />
                  <input autoFocus value={symbolSearch} onChange={(e) => setSymbolSearch(e.target.value)} placeholder="Search all symbols" className="min-w-0 flex-1 bg-transparent text-xs uppercase outline-none placeholder:text-gray-500" />
                  <button type="button" onClick={() => setIsAddOpen(false)} className={`rounded p-1 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {filteredAddSymbolOptions.length ? (
                    filteredAddSymbolOptions.map((item) => (
                      <div key={buildSymbolKey(item)} className={`flex items-center gap-2 border-b px-3 py-2 last:border-b-0 ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-emerald-500">{item.symbol}</div>
                          <div className={`truncate text-[9px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                            {String(item.exchangeLabel ?? item.exchange).toUpperCase()} {marketCategoryLabel(item.category)}
                          </div>
                        </div>
                        <button type="button" onClick={() => handleSelectSymbol(item)} disabled={isSavingSymbol} className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                          Open
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className={`px-3 py-5 text-center text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>No symbols found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {currentSavedSymbol && (
            <button type="button" onClick={() => onRemoveSymbol(currentSavedSymbol)} disabled={isRemovingSymbol} className="flex h-8 w-8 items-center justify-center rounded-md text-red-400 hover:bg-red-500/10 disabled:opacity-40" aria-label="Remove saved symbol">
              <Trash2 size={14} />
            </button>
          )}

          <select
            value={marketCategory}
            onChange={(e) => {
              onCategoryChange(e.target.value);
              setSymbolSearch('');
            }}
            className={`${compactFieldClass} w-24`}
            title="Market"
          >
            <option value="linear">Futures / Perpetual</option>
            <option value="spot">Spot</option>
          </select>

          <select value={timeframe} onChange={(e) => onTimeframeChange(e.target.value)} className={`${compactFieldClass} w-28 min-w-28`} title="Timeframe">
            {timeframeOptions.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>

          <button type="button" onClick={onToggleReplayMode} disabled={replayAccessStatus === 'checking-access'} className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold disabled:cursor-wait disabled:opacity-60 ${replayMode ? 'bg-red-600 text-white hover:bg-red-700' : neutralActionClass}`} title={replayMode ? 'Back to live' : 'Start replay'}>
            {replayAccessStatus === 'checking-access' ? <LoaderCircle size={14} className="animate-spin" /> : replayMode ? <X size={14} /> : <Play size={14} />}
            <span className="hidden sm:inline">{replayAccessStatus === 'checking-access' ? 'Checking…' : replayAccessStatus === 'pick-candle' ? 'Click candle' : replayMode ? 'Live' : 'Replay'}</span>
          </button>
          <button type="button" onClick={onCreatePriceAlert} className="flex h-8 items-center gap-1.5 rounded-md bg-[#2962ff] px-2.5 text-xs font-semibold text-white">
            <Bell size={13} />
            <span className="hidden sm:inline">Alert</span>
          </button>
          <div className="relative">
            <button type="button" onClick={() => setIsMarketInfoOpen(value => !value)} className={`${compactFieldClass} flex w-8 items-center justify-center`} title="Market information" aria-expanded={isMarketInfoOpen}><Info size={14}/></button>
            {isMarketInfoOpen && marketInfo}
          </div>

          <div className="relative">
            <button type="button" onClick={() => setIsIndicatorsOpen((value) => !value)} className={`${compactFieldClass} flex items-center gap-1.5 font-semibold`}>
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Indicators</span>
            </button>
            {isIndicatorsOpen && (
              <div className={`absolute left-0 top-full z-[100] mt-2 w-72 max-w-[85vw] space-y-3 rounded-md border p-3 shadow-2xl ${isDark ? 'text-white' : 'text-slate-900'}`} style={panelStyle}>
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
              </div>
            )}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setIsAppearanceOpen((value) => !value)} className={`${compactFieldClass} flex items-center gap-1.5 font-semibold`}>
              <SlidersHorizontal size={13} />
              <span className="hidden md:inline">Style</span>
            </button>
            {isAppearanceOpen && (
              <div className="absolute right-0 top-full z-[100] mt-2 flex w-56 items-center gap-3 rounded-md border p-3 shadow-2xl" style={panelStyle}>
                <label className="text-[10px]">
                  Buy
                  <input
                    type="color"
                    value={candleColors.up}
                    onChange={(e) =>
                      onCandleColorChange((c) => ({
                        ...c,
                        up: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-[10px]">
                  Sell
                  <input
                    type="color"
                    value={candleColors.down}
                    onChange={(e) =>
                      onCandleColorChange((c) => ({
                        ...c,
                        down: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="min-w-0 flex-1 text-[10px]">
                  Size
                  <input className="w-full" type="range" min="3" max="24" value={candleSize} onChange={(e) => handleCandleSizeChange(e.target.value)} />
                </label>
              </div>
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
      <button type="button" onClick={() => setIsMobileMenuOpen((open) => !open)} className={`${fieldClass} flex w-full items-center justify-between gap-2 font-semibold lg:hidden`} aria-expanded={isMobileMenuOpen}>
        <span className="flex min-w-0 items-center gap-2">
          <Menu size={15} />
          <span className="truncate text-emerald-500">{symbol}</span>
        </span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${isMobileMenuOpen ? 'grid' : 'hidden'} absolute left-0 right-0 top-full z-[110] mt-2 max-h-[calc(100dvh-5rem)] grid-cols-2 items-center gap-1.5 overflow-y-auto rounded-lg border p-2 shadow-2xl sm:grid-cols-12 lg:static lg:mt-0 lg:grid lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${isDark ? 'border-gray-700 bg-black-table-color text-white' : 'border-gray-200 bg-white text-slate-900'}`}>
        <div className="relative col-span-2 min-w-0 sm:col-span-12 lg:col-span-3">
          <label className="sr-only">Symbol</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setIsAddOpen((current) => !current)} className={`${fieldClass} flex min-w-0 flex-1 items-center justify-between gap-2 text-left font-semibold hover:border-[#2962ff]/60`} aria-expanded={isAddOpen}>
              <span className="truncate text-emerald-500">
                {symbol}{' '}
                <span className={`text-[9px] font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {String(exchange).toUpperCase()} · {marketCategoryLabel(marketCategory)}
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
          {isAddOpen && (
            <div className={`absolute left-0 right-0 z-[80] mt-2 overflow-hidden rounded-md border shadow-xl sm:right-auto sm:w-96 ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-gray-200 bg-white'}`}>
              <div className={`flex items-center gap-2 border-b px-2 py-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <Search size={14} className="text-gray-400" />
                <input autoFocus value={symbolSearch} onChange={(event) => setSymbolSearch(event.target.value)} placeholder="Search all symbols" className={`min-w-0 flex-1 bg-transparent text-xs uppercase outline-none placeholder:text-gray-500 ${isDark ? 'text-white' : 'text-gray-800'}`} />
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
              <div className="max-h-64 overflow-y-auto">
                {filteredAddSymbolOptions.length ? (
                  filteredAddSymbolOptions.map((item) => (
                    <div key={buildSymbolKey(item)} className={`flex items-center gap-2 border-b px-2 py-1.5 last:border-b-0 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {item.symbol}
                          <span className="ml-1 text-[10px] font-medium text-emerald-300">
                            {String(item.exchangeLabel ?? item.exchange ?? '').toUpperCase()} {marketCategoryLabel(item.category)}
                          </span>
                        </div>
                        {(item.coin_name || item.baseCoin || item.quoteCoin || item.status) && <div className="truncate text-[10px] text-gray-400">{[item.coin_name, item.baseCoin && item.quoteCoin ? `${item.baseCoin}/${item.quoteCoin}` : null, item.status].filter(Boolean).join(' / ')}</div>}
                      </div>
                      <button type="button" onClick={() => handleSelectSymbol(item)} disabled={isSavingSymbol} className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40" title={`Open ${item.symbol}`}>
                        Open
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-3 text-center text-xs text-gray-400">No symbols found</div>
                )}
              </div>
            </div>
          )}
          {symbolError && <div className="mt-1 text-[11px] text-red-400">{symbolError}</div>}
        </div>

        <div className="col-span-1 min-w-0 sm:col-span-3 lg:col-span-1">
          <label className="sr-only">Market</label>
          <select
            value={marketCategory}
            onChange={(e) => {
              onCategoryChange(e.target.value);
              setSymbolSearch('');
            }}
            className={`${fieldClass} w-full`}
          >
            <option value="linear">Futures / Perpetual</option>
            <option value="spot">Spot</option>
          </select>
        </div>

        <div className="col-span-1 min-w-0 sm:col-span-3 lg:col-span-1">
          <label className="sr-only">Timeframe</label>
          <select value={timeframe} onChange={(e) => onTimeframeChange(e.target.value)} className={`${fieldClass} w-full`}>
            {timeframeOptions.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 min-w-0 sm:col-span-3 lg:col-span-2">
          <label className="sr-only">Replay</label>
          <button type="button" onClick={onToggleReplayMode} disabled={replayAccessStatus === 'checking-access'} className={`flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${replayMode ? 'bg-red-600 text-white hover:bg-red-700' : neutralActionClass}`}>
            {replayAccessStatus === 'checking-access' ? <LoaderCircle size={15} className="animate-spin" /> : replayMode ? <X size={15} /> : <Play size={15} />}
            {replayAccessStatus === 'checking-access' ? 'Checking replay access…' : replayAccessStatus === 'pick-candle' ? 'Click a candle to start' : replayMode ? 'Back to Live' : 'Start Replay'}
          </button>
        </div>

        <div className="relative col-span-1 min-w-0 sm:col-span-3 lg:col-span-1">
          <button type="button" onClick={() => setIsAppearanceOpen((value) => !value)} className={`${fieldClass} flex w-full items-center justify-center gap-2 font-semibold hover:border-[#2962ff]/60`}>
            <SlidersHorizontal size={14} />
            <span className="hidden xl:inline">Style</span>
          </button>
          {isAppearanceOpen && (
            <div className="absolute left-0 top-full z-[90] mt-2 max-h-[min(32rem,calc(100vh-7rem))] w-full min-w-0 overflow-y-auto rounded-md border p-3 shadow-2xl sm:left-auto sm:right-0 sm:w-72" style={panelStyle}>
              <div className={`mb-2 text-xs font-semibold ${labelClass}`}>Candle appearance</div>
              <div className={`${fieldClass} flex w-full items-center gap-2 px-2`}>
                <label className={`flex items-center gap-1 text-[10px] font-semibold ${labelClass}`} title="Bull candle color">
                  G
                  <input
                    type="color"
                    value={candleColors.up}
                    onChange={(event) =>
                      onCandleColorChange((current) => ({
                        ...current,
                        up: event.target.value,
                      }))
                    }
                    className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </label>
                <label className={`flex items-center gap-1 text-[10px] font-semibold ${labelClass}`} title="Bear candle color">
                  R
                  <input
                    type="color"
                    value={candleColors.down}
                    onChange={(event) =>
                      onCandleColorChange((current) => ({
                        ...current,
                        down: event.target.value,
                      }))
                    }
                    className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </label>
                <label className={`flex min-w-0 flex-1 items-center gap-1 text-[10px] font-semibold ${labelClass}`} title="Candle size">
                  Size
                  <input type="range" min="3" max="24" step="1" value={candleSize} onChange={(event) => handleCandleSizeChange(event.target.value)} className="min-w-0 flex-1 accent-emerald-500" />
                  <span className="w-5 text-right tabular-nums">{candleSize}</span>
                </label>
              </div>
              <div className="mt-3 space-y-2 text-xs"></div>
            </div>
          )}
        </div>

        <div className="relative col-span-1 sm:col-span-3 lg:col-span-2">
          <button type="button" onClick={() => setIsIndicatorsOpen((value) => !value)} className={`${fieldClass} flex w-full items-center justify-center gap-2 font-semibold hover:border-[#2962ff]/60`}>
            <SlidersHorizontal size={14} />
            <span>Indicators</span>
            {activeIndicatorCount > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2962ff] px-1 text-[9px] text-white">{activeIndicatorCount}</span>}
          </button>
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

        <button type="button" onClick={onCreatePriceAlert} className="col-span-1 flex h-9 items-center justify-center gap-2 rounded-lg bg-[#2962ff] px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-600 sm:col-span-3 lg:col-span-1">
          <Bell size={14} />
          <span className="hidden xl:inline">Alert</span>
        </button>

        <div className="relative col-span-1 sm:col-span-3 lg:col-span-1">
          <button type="button" onClick={() => setIsMarketInfoOpen(value => !value)} className={`${fieldClass} flex w-full items-center justify-center gap-1.5 font-semibold hover:border-[#2962ff]/60`} title="Market information" aria-expanded={isMarketInfoOpen}><Info size={14}/><span className="hidden xl:inline">Info</span></button>
          {isMarketInfoOpen && marketInfo}
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

function MarketMetadataPopover({ metadata, loading, error, isDark, panelStyle }) {
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
  return <div className={`absolute right-0 top-full z-[150] mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-xl border p-3 shadow-2xl ${isDark ? 'text-white' : 'text-slate-900'}`} style={panelStyle}>
    {loading && <div className="flex items-center gap-2 py-4 text-xs text-[#787b86]"><LoaderCircle size={14} className="animate-spin"/>Loading market information…</div>}
    {!loading && error && <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-500"><CircleHelp size={14}/>{error}</div>}
    {!loading && !error && metadata && <><div className="flex items-center gap-2"><img src={fundamentals?.logo_url || ''} alt="" className={`h-8 w-8 rounded-full object-contain ${fundamentals?.logo_url ? '' : 'hidden'}`}/><div><div className="text-sm font-bold">{fundamentals?.name || metadata.market?.base_coin || metadata.market?.symbol}</div><div className="text-[10px] uppercase text-[#787b86]">{metadata.market?.exchange} · {marketCategoryLabel(metadata.market?.category)}{fundamentals?.market_cap_rank ? ` · Rank #${fundamentals.market_cap_rank}` : ''}</div></div></div><div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">{rows.map(([label, value]) => value !== '—' && value !== '— / —' ? <div key={label} className="min-w-0"><div className="text-[9px] uppercase text-[#787b86]">{label}</div><div className="truncate text-xs font-semibold tabular-nums">{value}</div></div> : null)}</div>{fundamentals && <div className={`mt-3 grid grid-cols-2 gap-2 border-t pt-2 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}><Meta label="Market cap" value={compactNumber(fundamentals.market_cap)}/><Meta label="FDV" value={compactNumber(fundamentals.fully_diluted_valuation)}/><Meta label="Circulating" value={compactNumber(fundamentals.circulating_supply)}/><Meta label="Max supply" value={compactNumber(fundamentals.max_supply)}/><Meta label="ATH" value={metadataPrice(fundamentals.ath)}/><Meta label="ATL" value={metadataPrice(fundamentals.atl)}/></div>}{metadata.warnings?.length > 0 && <div className="mt-2 text-[9px] text-[#787b86]">{metadata.warnings.join(' ')}</div>}</>}
  </div>;
}

function Meta({ label, value }) { return value === '—' ? null : <div><div className="text-[9px] uppercase text-[#787b86]">{label}</div><div className="text-xs font-semibold tabular-nums">{value}</div></div>; }
