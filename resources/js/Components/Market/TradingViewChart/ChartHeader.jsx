import React from 'react';
import { TIMEFRAMES } from './constants';
import { formatPrice } from './utils';

export default function ChartHeader({
  symbol,
  symbols,
  newSymbol,
  isSavingSymbol,
  symbolError,
  timeframe,
  replayMode,
  currentPrice,
  selectedReplayPrice,
  onSymbolChange,
  onNewSymbolChange,
  onAddSymbol,
  onTimeframeChange,
  onToggleReplayMode,
}) {
  const symbolOptions = symbols.length ? symbols : [{ symbol }];

  return (
    <div className="rounded-lg bg-gray-800 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-300">Symbol</label>
          <select
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-white"
          >
            {symbolOptions.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol}
              </option>
            ))}
          </select>
          <form onSubmit={onAddSymbol} className="mt-1 flex gap-1">
            <input
              value={newSymbol}
              onChange={(e) => onNewSymbolChange(e.target.value)}
              placeholder="Add symbol"
              className="min-w-0 flex-1 rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-xs uppercase text-white outline-none"
            />
            <button
              type="submit"
              disabled={isSavingSymbol || !newSymbol.trim()}
              className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Add
            </button>
          </form>
          {symbolError && (
            <div className="mt-1 text-[11px] text-red-400">{symbolError}</div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-300">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-white"
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
            onClick={onToggleReplayMode}
            className={`w-full rounded-md px-2 py-1.5 text-sm font-semibold text-white ${
              replayMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {replayMode ? 'Exit Replay Mode' : 'Replay Mode'}
          </button>
        </div>

        <div className="flex items-end">
          <div className="text-white">
            <div className="text-xs text-gray-400">
              {replayMode ? 'Replay Price' : 'Current Price'}
            </div>
            <div className="text-xl font-bold text-green-500">
              ${formatPrice(currentPrice)}
            </div>
            {replayMode && (
              <div className="mt-1 text-xs text-blue-400">
                Selected: ${formatPrice(selectedReplayPrice)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
