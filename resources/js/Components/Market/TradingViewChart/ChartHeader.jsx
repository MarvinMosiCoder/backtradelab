import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, Play, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { TIMEFRAMES, TIMEFRAME_SECONDS } from './constants';
import { formatPrice } from './utils';

export default function ChartHeader({
  symbol,
  exchange,
  marketCategory,
  symbols,
  availableSymbols,
  isSavingSymbol,
  isRemovingSymbol,
  isLoadingAvailableSymbols,
  symbolError,
  timeframe,
  replayMode,
  currentPrice,
  selectedReplayPrice,
  candleColors,
  candleSize,
  indicators,
  onSymbolChange,
  onCategoryChange,
  onAddSymbol,
  onRemoveSymbol,
  onTimeframeChange,
  onToggleReplayMode,
  onCandleColorChange,
  onCandleSizeChange,
  onIndicatorsChange,
  onCreatePriceAlert,
  chartTheme,
  compact = false,
  className = '',
}) {
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
  const isDark = chartTheme?.mode === 'dark';
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const candleSeconds = TIMEFRAME_SECONDS[timeframe] ?? 60;
  const secondsRemaining = Math.max(0, candleSeconds - (Math.floor(clockNow / 1000) % candleSeconds));
  const candleCountdown = [
    Math.floor(secondsRemaining / 3600),
    Math.floor((secondsRemaining % 3600) / 60),
    secondsRemaining % 60,
  ].map((value) => String(value).padStart(2, '0')).join(':');
  const panelStyle = {
    backgroundColor: chartTheme?.panel ?? (isDark ? '#242627' : '#ffffff'),
    borderColor: chartTheme?.border ?? (isDark ? '#31363F' : '#e5e7eb'),
  };
  const fieldClass = `h-9 rounded-md border px-2 text-sm outline-none ${
    isDark
      ? 'border-gray-700 bg-black-table-color text-white'
      : 'border-gray-200 bg-gray-50 text-gray-800'
  }`;
  const labelClass = isDark ? 'text-gray-300' : 'text-gray-600';
  const neutralActionClass = isDark
    ? 'bg-white text-skin-black hover:bg-gray-200'
    : 'bg-skin-black text-white hover:bg-skin-black-light';
  const buildSymbolKey = (item) => `${item.exchange ?? 'bybit'}:${item.category ?? 'spot'}:${item.symbol}`;
  const categorySymbols = symbols.filter((item) => (item.category ?? 'spot') === marketCategory);
  const currentSymbolOption = { symbol, exchange: exchange ?? 'bybit', category: marketCategory ?? 'spot' };
  const currentSavedSymbol = symbols.find((item) => buildSymbolKey(item) === buildSymbolKey(currentSymbolOption));
  const symbolOptions = categorySymbols.some((item) => buildSymbolKey(item) === buildSymbolKey(currentSymbolOption))
    ? categorySymbols
    : [currentSymbolOption, ...categorySymbols];
  const savedSymbolSet = new Set(symbols.map((item) => buildSymbolKey(item)));
  const addSymbolOptions = availableSymbols.filter((item) => (
    !savedSymbolSet.has(buildSymbolKey(item))
  ));
  const filteredAddSymbolOptions = useMemo(() => {
    const query = symbolSearch.trim().toUpperCase();

    if (!query) {
      return availableSymbols.slice(0, 80);
    }

    return availableSymbols
      .filter((item) => {
        return [
          item.symbol,
          item.exchange,
          item.exchangeLabel,
          item.exchange_symbol,
          item.coin_name,
          item.baseCoin,
          item.quoteCoin,
          item.category,
          item.baseCoin && item.quoteCoin ? `${item.baseCoin}${item.quoteCoin}` : null,
          item.baseCoin && item.quoteCoin ? `${item.baseCoin}/${item.quoteCoin}` : null,
          `${item.exchange ?? ''} ${item.category ?? ''} ${item.symbol ?? ''}`,
        ].some((value) => String(value ?? '').toUpperCase().includes(query));
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

  if (compact) {
    const compactFieldClass = `h-8 rounded-md border px-2 text-xs outline-none ${
      isDark
        ? 'border-gray-700 bg-black-table-color/95 text-white'
        : 'border-gray-200 bg-white/95 text-gray-800'
    }`;

    return (
      <div
        className={`flex max-w-full flex-wrap items-center gap-2 rounded-md border p-2 shadow-xl backdrop-blur ${className}`}
        style={panelStyle}
      >
        <div className="relative">
          <button type="button" onClick={()=>setIsAddOpen((value)=>!value)} className={`${compactFieldClass} flex w-44 max-w-[42vw] items-center justify-between gap-2`}><span className="truncate">{symbol} · {String(exchange).toUpperCase()}</span><ChevronDown size={13}/></button>
          {isAddOpen&&<div className={`absolute left-0 top-full z-[120] mt-2 w-80 max-w-[85vw] overflow-hidden rounded-md border shadow-2xl ${isDark?'border-gray-700 bg-black-table-color':'border-gray-200 bg-white'}`}><div className="flex items-center gap-2 border-b border-gray-700 p-2"><Search size={14}/><input autoFocus value={symbolSearch} onChange={(e)=>setSymbolSearch(e.target.value)} placeholder="Search all symbols" className="min-w-0 flex-1 bg-transparent text-xs uppercase outline-none"/><button onClick={()=>setIsAddOpen(false)}><X size={14}/></button></div><div className="max-h-72 overflow-y-auto">{filteredAddSymbolOptions.map((item)=><button key={buildSymbolKey(item)} onClick={()=>handleSelectSymbol(item)} className="flex w-full items-center justify-between border-b border-gray-700/50 px-3 py-2 text-left text-xs hover:bg-[#2962ff]/15"><span>{item.symbol}</span><span className="text-[9px] text-gray-400">{String(item.exchange).toUpperCase()} {String(item.category).toUpperCase()}</span></button>)}</div></div>}
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
          <option value="linear">Futures</option>
          <option value="spot">Spot</option>
        </select>

        <select
          value={timeframe}
          onChange={(e) => onTimeframeChange(e.target.value)}
          className={`${compactFieldClass} w-28 min-w-28`}
          title="Timeframe"
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf.value} value={tf.value}>
              {tf.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onToggleReplayMode}
          className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ${
            replayMode ? 'bg-red-600 text-white hover:bg-red-700' : neutralActionClass
          }`}
          title={replayMode ? 'Back to live' : 'Start replay'}
        >
          {replayMode ? <X size={14} /> : <Play size={14} />}
          <span className="hidden sm:inline">{replayMode ? 'Live' : 'Replay'}</span>
        </button>

        <button type="button" onClick={onCreatePriceAlert} className="flex h-8 items-center gap-1.5 rounded-md bg-[#2962ff] px-2.5 text-xs font-semibold text-white"><Bell size={13}/><span className="hidden sm:inline">Alert</span></button>

        <div className="relative">
          <button type="button" onClick={()=>setIsIndicatorsOpen((value)=>!value)} className={`${compactFieldClass} flex items-center gap-1.5 font-semibold`}><SlidersHorizontal size={13}/><span className="hidden sm:inline">Indicators</span></button>
          {isIndicatorsOpen&&<div className="absolute left-0 top-full z-[100] mt-2 w-64 max-w-[80vw] space-y-2 rounded-md border p-3 shadow-2xl" style={panelStyle}>{[['volume','Volume'],['sma','SMA'],['ema','EMA'],['rsi','RSI']].map(([key,label])=><label key={key} className="flex items-center justify-between gap-3 text-xs"><span>{label}</span><input type="checkbox" checked={indicators[key]} onChange={(e)=>onIndicatorsChange((current)=>({...current,[key]:e.target.checked}))}/></label>)}</div>}
        </div>
        <div className="relative"><button type="button" onClick={()=>setIsAppearanceOpen((value)=>!value)} className={`${compactFieldClass} flex items-center gap-1.5 font-semibold`}><SlidersHorizontal size={13}/><span className="hidden md:inline">Style</span></button>{isAppearanceOpen&&<div className="absolute right-0 top-full z-[100] mt-2 flex w-56 items-center gap-3 rounded-md border p-3 shadow-2xl" style={panelStyle}><label className="text-[10px]">Buy<input type="color" value={candleColors.up} onChange={(e)=>onCandleColorChange((c)=>({...c,up:e.target.value}))}/></label><label className="text-[10px]">Sell<input type="color" value={candleColors.down} onChange={(e)=>onCandleColorChange((c)=>({...c,down:e.target.value}))}/></label><label className="min-w-0 flex-1 text-[10px]">Size<input className="w-full" type="range" min="3" max="24" value={candleSize} onChange={(e)=>handleCandleSizeChange(e.target.value)}/></label></div>}</div>

        <div className="min-w-0 px-1">
          <div className="truncate text-[10px] leading-none text-gray-400">
            {replayMode ? 'Replay' : 'Price'}
          </div>
          <div className="truncate text-sm font-bold leading-tight text-green-500">
            ${formatPrice(currentPrice)}
          </div>
          {!replayMode && <div className="text-[9px] leading-none text-[#787b86]">Closes in {candleCountdown}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative z-40 rounded-lg border p-1.5 shadow-lg sm:p-2 ${className}`} style={panelStyle}>
      <div className="grid grid-cols-2 items-end gap-1.5 sm:grid-cols-12 sm:gap-2">
        <div className="relative col-span-2 min-w-0 sm:col-span-12 lg:col-span-6 xl:col-span-5">
          <label className={`mb-1 block text-xs font-medium ${labelClass}`}>Symbol</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsAddOpen((current) => !current)}
              className={`${fieldClass} flex min-w-0 flex-1 items-center justify-between gap-2 text-left font-semibold`}
              aria-expanded={isAddOpen}
            >
              <span className="truncate">{symbol} <span className="text-[10px] text-gray-400">{String(exchange).toUpperCase()} {String(marketCategory).toUpperCase()}</span></span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
            {currentSavedSymbol && (
              <button type="button" onClick={() => onRemoveSymbol(currentSavedSymbol)} disabled={isRemovingSymbol} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40" aria-label={`Remove ${currentSavedSymbol.symbol}`}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {isAddOpen && (
            <div className={`absolute left-0 right-0 z-[80] mt-2 overflow-hidden rounded-md border shadow-xl sm:right-auto sm:w-96 ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-gray-200 bg-white'}`}>
              <div className={`flex items-center gap-2 border-b px-2 py-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <Search size={14} className="text-gray-400" />
                <input
                  autoFocus
                  value={symbolSearch}
                  onChange={(event) => setSymbolSearch(event.target.value)}
                  placeholder="Search all symbols"
                  className={`min-w-0 flex-1 bg-transparent text-xs uppercase outline-none placeholder:text-gray-500 ${isDark ? 'text-white' : 'text-gray-800'}`}
                />
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
                    <div
                      key={buildSymbolKey(item)}
                      className={`flex items-center gap-2 border-b px-2 py-1.5 last:border-b-0 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {item.symbol}
                          <span className="ml-1 text-[10px] font-medium text-emerald-300">
                            {String(item.exchangeLabel ?? item.exchange ?? '').toUpperCase()} {String(item.category ?? '').toUpperCase()}
                          </span>
                        </div>
                        {(item.coin_name || item.baseCoin || item.quoteCoin || item.status) && (
                          <div className="truncate text-[10px] text-gray-400">
                            {[item.coin_name, item.baseCoin && item.quoteCoin ? `${item.baseCoin}/${item.quoteCoin}` : null, item.status]
                              .filter(Boolean)
                              .join(' / ')}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectSymbol(item)}
                        disabled={isSavingSymbol}
                        className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                        title={`Open ${item.symbol}`}
                      >
                        Open
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-3 text-center text-xs text-gray-400">
                    No symbols found
                  </div>
                )}
              </div>
            </div>
          )}
          {symbolError && (
            <div className="mt-1 text-[11px] text-red-400">{symbolError}</div>
          )}
        </div>

        <div className="col-span-1 min-w-0 sm:col-span-4 lg:col-span-2">
          <label className={`mb-1 block text-xs font-medium ${labelClass}`}>Market</label>
          <select
            value={marketCategory}
            onChange={(e) => {
              onCategoryChange(e.target.value);
              setSymbolSearch('');
            }}
            className={`${fieldClass} w-full`}
          >
            <option value="linear">Futures</option>
            <option value="spot">Spot</option>
          </select>
        </div>

        <div className="col-span-1 min-w-0 sm:col-span-3 lg:col-span-2">
          <label className={`mb-1 block text-xs font-medium ${labelClass}`}>Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
            className={`${fieldClass} w-full`}
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 min-w-0 sm:col-span-5 lg:col-span-2 xl:col-span-3">
          <label className={`mb-1 block text-xs font-medium ${labelClass}`}>Replay</label>
          <button
            type="button"
            onClick={onToggleReplayMode}
            className={`flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-semibold transition-colors ${
              replayMode ? 'bg-red-600 text-white hover:bg-red-700' : neutralActionClass
            }`}
          >
            {replayMode ? <X size={15} /> : <Play size={15} />}
            {replayMode ? 'Back to Live' : 'Start Replay'}
          </button>
        </div>

        <div className="relative col-span-1 min-w-0 sm:col-span-4 lg:col-span-2">
          <button type="button" onClick={() => setIsAppearanceOpen((value) => !value)} className={`${fieldClass} flex w-full items-center justify-center gap-2 font-semibold`}>
            <SlidersHorizontal size={14} />
            <span>Appearance</span>
          </button>
          {isAppearanceOpen && <div className="absolute left-0 top-full z-[90] mt-2 max-h-[min(32rem,calc(100vh-7rem))] w-full min-w-0 overflow-y-auto rounded-md border p-3 shadow-2xl sm:left-auto sm:right-0 sm:w-72" style={panelStyle}>
            <div className={`mb-2 text-xs font-semibold ${labelClass}`}>Candle appearance</div>
            <div className={`${fieldClass} flex w-full items-center gap-2 px-2`}>
            <label className={`flex items-center gap-1 text-[10px] font-semibold ${labelClass}`} title="Bull candle color">
              G
              <input
                type="color"
                value={candleColors.up}
                onChange={(event) => onCandleColorChange((current) => ({
                  ...current,
                  up: event.target.value,
                }))}
                className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </label>
            <label className={`flex items-center gap-1 text-[10px] font-semibold ${labelClass}`} title="Bear candle color">
              R
              <input
                type="color"
                value={candleColors.down}
                onChange={(event) => onCandleColorChange((current) => ({
                  ...current,
                  down: event.target.value,
                }))}
                className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </label>
            <label className={`flex min-w-0 flex-1 items-center gap-1 text-[10px] font-semibold ${labelClass}`} title="Candle size">
              Size
              <input
                type="range"
                min="3"
                max="24"
                step="1"
                value={candleSize}
                onChange={(event) => handleCandleSizeChange(event.target.value)}
                className="min-w-0 flex-1 accent-emerald-500"
              />
              <span className="w-5 text-right tabular-nums">{candleSize}</span>
            </label>
            </div>
            <div className="mt-3 space-y-2 text-xs">
            </div>
          </div>}
        </div>

        <div className="relative col-span-1 sm:col-span-4 lg:col-span-2">
          <button type="button" onClick={() => setIsIndicatorsOpen((value) => !value)} className={`${fieldClass} flex w-full items-center justify-center gap-2 font-semibold`}><SlidersHorizontal size={14}/>Indicators</button>
          {isIndicatorsOpen && <div className="absolute right-0 top-full z-[100] mt-2 w-72 max-w-[calc(100vw-1rem)] space-y-2 rounded-md border p-3 shadow-2xl" style={panelStyle}>
            <label className="flex items-center justify-between gap-2 text-xs"><span>Volume</span><input type="checkbox" checked={indicators.volume} onChange={(e) => onIndicatorsChange((c) => ({...c, volume:e.target.checked}))}/></label>
            {indicators.volume && <input className="w-full" type="range" min="10" max="45" value={indicators.volumeSize} onChange={(e)=>onIndicatorsChange((c)=>({...c,volumeSize:Number(e.target.value)}))}/>}
            {[['sma','SMA','smaPeriod'],['ema','EMA','emaPeriod'],['rsi','RSI','rsiPeriod']].map(([key,label,periodKey])=><div key={key} className="flex items-center gap-2 text-xs"><label className="flex flex-1 items-center gap-2"><input type="checkbox" checked={indicators[key]} onChange={(e)=>onIndicatorsChange((c)=>({...c,[key]:e.target.checked}))}/>{label}</label><input className={`${fieldClass} w-16`} type="number" min="2" max="200" value={indicators[periodKey]} onChange={(e)=>onIndicatorsChange((c)=>({...c,[periodKey]:Math.min(200,Math.max(2,Number(e.target.value)||2))}))}/>{key==='rsi'&&<input title="RSI pane size" className="w-16" type="range" min="15" max="45" value={indicators.rsiSize ?? 25} onChange={(e)=>onIndicatorsChange((c)=>({...c,rsiSize:Number(e.target.value)}))}/>}</div>)}
          </div>}
        </div>

        <button type="button" onClick={onCreatePriceAlert} className="col-span-1 flex h-9 items-center justify-center gap-2 rounded-md bg-[#2962ff] px-3 text-xs font-semibold text-white hover:bg-blue-600 sm:col-span-4 lg:col-span-2"><Bell size={14}/>Alert</button>

        <div className="col-span-1 flex min-w-0 items-end justify-end rounded-md border px-2 py-1 sm:col-span-8 lg:col-span-10"
          style={{ borderColor: chartTheme?.border ?? (isDark ? '#31363F' : '#e5e7eb') }}
        >
          <div className={`min-h-9 min-w-0 max-w-full ${isDark ? 'text-white' : 'text-gray-800'} lg:text-right`}>
            <div className="truncate text-xs text-gray-400">
              {replayMode ? 'Replay Price' : 'Current Price'}
            </div>
            <div className="max-w-full truncate text-base font-bold leading-tight text-green-500 sm:text-lg">
              ${formatPrice(currentPrice)}
            </div>
            {!replayMode && <div className="max-w-full truncate text-[10px] text-[#787b86]">Candle closes in {candleCountdown}</div>}
            {replayMode && (
              <div className={`max-w-full truncate text-xs ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>
                Selected: ${formatPrice(selectedReplayPrice)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
