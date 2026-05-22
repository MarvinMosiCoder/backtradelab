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
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
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
    <div className="relative z-40 rounded-lg bg-gray-800 p-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1.2fr)_minmax(120px,0.5fr)_minmax(140px,0.5fr)_minmax(140px,0.55fr)_minmax(150px,0.55fr)_minmax(170px,0.6fr)]">
        <div className="relative">
          <label className="mb-1 block text-xs font-medium text-gray-300">Symbol</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={`${exchange ?? 'bybit'}:${marketCategory ?? 'spot'}:${symbol}`}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-md border border-gray-600 bg-gray-700 px-2 text-sm text-white outline-none"
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
            <div className="absolute left-0 right-0 z-[80] mt-2 overflow-hidden rounded-md border border-gray-600 bg-gray-900 shadow-xl sm:right-auto sm:w-96">
              <div className="flex items-center gap-2 border-b border-gray-700 px-2 py-2">
                <Search size={14} className="text-gray-400" />
                <input
                  autoFocus
                  value={symbolSearch}
                  onChange={(event) => setSymbolSearch(event.target.value)}
                  placeholder="Search symbol"
                  className="min-w-0 flex-1 bg-transparent text-xs uppercase text-white outline-none placeholder:text-gray-500"
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
                      className="flex items-center gap-2 border-b border-gray-800 px-2 py-1.5 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-white">
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
          <label className="mb-1 block text-xs font-medium text-gray-300">Market</label>
          <select
            value={marketCategory}
            onChange={(e) => {
              onCategoryChange(e.target.value);
              setSymbolSearch('');
            }}
            className="h-9 w-full rounded-md border border-gray-600 bg-gray-700 px-2 text-sm text-white outline-none"
          >
            <option value="linear">Futures</option>
            <option value="spot">Spot</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-300">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
            className="h-9 w-full rounded-md border border-gray-600 bg-gray-700 px-2 text-sm text-white outline-none"
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-300">Replay</label>
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
          <label className="mb-1 block text-xs font-medium text-gray-300">Candles</label>
          <div className="flex h-9 items-center gap-2 rounded-md border border-gray-600 bg-gray-700 px-2">
            <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-300" title="Bull candle color">
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
            <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-300" title="Bear candle color">
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

        <div className="flex items-end lg:justify-end">
          <div className="min-h-9 text-white lg:text-right">
            <div className="text-xs text-gray-400">
              {replayMode ? 'Replay Price' : 'Current Price'}
            </div>
            <div className="text-lg font-bold leading-tight text-green-500">
              ${formatPrice(currentPrice)}
            </div>
            {replayMode && (
              <div className="text-xs text-blue-400">
                Selected: ${formatPrice(selectedReplayPrice)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
