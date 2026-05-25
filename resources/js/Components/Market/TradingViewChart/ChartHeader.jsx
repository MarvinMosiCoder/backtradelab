import React, { useMemo, useState } from 'react';
import { Play, Plus, Search, X } from 'lucide-react';
import { TIMEFRAMES } from './constants';
import { formatPrice } from './utils';

export default function ChartHeader({
  symbol,
  exchange,
  marketCategory,
  symbols,
  availableSymbols,
  isSavingSymbol,
  isLoadingAvailableSymbols,
  symbolError,
  timeframe,
  replayMode,
  currentPrice,
  selectedReplayPrice,
  candleColors,
  onSymbolChange,
  onCategoryChange,
  onAddSymbol,
  onTimeframeChange,
  onToggleReplayMode,
  onCandleColorChange,
  chartTheme,
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
  const isDark = chartTheme?.mode === 'dark';
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
  const buildSymbolKey = (item) => `${item.exchange ?? 'bybit'}:${item.category ?? 'spot'}:${item.symbol}`;
  const categorySymbols = symbols.filter((item) => (item.category ?? 'spot') === marketCategory);
  const currentSymbolOption = { symbol, exchange: exchange ?? 'bybit', category: marketCategory ?? 'spot' };
  const symbolOptions = categorySymbols.some((item) => buildSymbolKey(item) === buildSymbolKey(currentSymbolOption))
    ? categorySymbols
    : [currentSymbolOption, ...categorySymbols];
  const savedSymbolSet = new Set(symbols.map((item) => buildSymbolKey(item)));
  const addSymbolOptions = availableSymbols.filter((item) => (
    !savedSymbolSet.has(buildSymbolKey(item))
  ));
  const addButtonLabel = isLoadingAvailableSymbols
    ? 'Loading symbols...'
    : !availableSymbols.length
      ? 'Symbols unavailable'
      : addSymbolOptions.length
        ? 'Add Symbol'
        : 'All symbols added';
  const filteredAddSymbolOptions = useMemo(() => {
    const query = symbolSearch.trim().toUpperCase();

    if (!query) {
      return addSymbolOptions.slice(0, 80);
    }

    return addSymbolOptions
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
  }, [addSymbolOptions, symbolSearch]);

  const handleSelectSymbol = (nextSymbol) => {
    onAddSymbol(nextSymbol);
    setSymbolSearch('');
    setIsAddOpen(false);
  };

  return (
    <div className="relative z-40 rounded-lg border p-3" style={panelStyle}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1.2fr)_minmax(105px,0.45fr)_minmax(115px,0.45fr)_minmax(130px,0.55fr)_minmax(140px,0.55fr)_minmax(0,0.65fr)]">
        <div className="relative">
          <label className={`mb-1 block text-xs font-medium ${labelClass}`}>Symbol</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={`${exchange ?? 'bybit'}:${marketCategory ?? 'spot'}:${symbol}`}
              onChange={(e) => onSymbolChange(e.target.value)}
              className={`${fieldClass} min-w-0 flex-1`}
            >
              {symbolOptions.map((item) => (
                <option
                  key={buildSymbolKey(item)}
                  value={buildSymbolKey(item)}
                >
                  {item.symbol} ({String(item.exchange ?? 'bybit').toUpperCase()} {String(item.category ?? 'spot').toUpperCase()})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsAddOpen((current) => !current)}
              disabled={isLoadingAvailableSymbols || !addSymbolOptions.length}
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              <Plus size={14} />
              {addButtonLabel}
            </button>
          </div>
          {isAddOpen && (
            <div className={`absolute left-0 right-0 z-[80] mt-2 overflow-hidden rounded-md border shadow-xl sm:right-auto sm:w-96 ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-gray-200 bg-white'}`}>
              <div className={`flex items-center gap-2 border-b px-2 py-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <Search size={14} className="text-gray-400" />
                <input
                  autoFocus
                  value={symbolSearch}
                  onChange={(event) => setSymbolSearch(event.target.value)}
                  placeholder="Search symbol"
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
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                        title={`Add ${item.symbol} from ${String(item.exchange ?? '').toUpperCase()} ${String(item.category ?? '').toUpperCase()}`}
                      >
                        <Plus size={15} />
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

        <div>
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

        <div>
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

        <div>
          <label className={`mb-1 block text-xs font-medium ${labelClass}`}>Replay</label>
          <button
            type="button"
            onClick={onToggleReplayMode}
            className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold text-white ${
              replayMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {replayMode ? <X size={15} /> : <Play size={15} />}
            {replayMode ? 'Back to Live' : 'Start Replay'}
          </button>
        </div>

        <div>
          <label className={`mb-1 block text-xs font-medium ${labelClass}`}>Candles</label>
          <div className={`${fieldClass} flex w-full items-center gap-2`}>
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
          </div>
        </div>

        <div className="flex min-w-0 items-end lg:justify-end">
          <div className={`min-h-9 min-w-0 max-w-full ${isDark ? 'text-white' : 'text-gray-800'} lg:text-right`}>
            <div className="truncate text-xs text-gray-400">
              {replayMode ? 'Replay Price' : 'Current Price'}
            </div>
            <div className="max-w-full truncate text-base font-bold leading-tight text-green-500 sm:text-lg">
              ${formatPrice(currentPrice)}
            </div>
            {replayMode && (
              <div className="max-w-full truncate text-xs text-blue-400">
                Selected: ${formatPrice(selectedReplayPrice)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
