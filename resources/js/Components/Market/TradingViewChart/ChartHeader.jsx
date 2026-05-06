import React from 'react';
import { POPULAR_SYMBOLS, TIMEFRAMES } from './constants';
import { formatPrice } from './utils';

export default function ChartHeader({
  symbol,
  timeframe,
  replayMode,
  currentPrice,
  selectedReplayPrice,
  onSymbolChange,
  onTimeframeChange,
  onToggleReplayMode,
}) {
  return (
    <div className="rounded-lg bg-gray-800 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Symbol</label>
          <select
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white"
          >
            {POPULAR_SYMBOLS.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white"
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Replay</label>
          <button
            onClick={onToggleReplayMode}
            className={`w-full rounded-lg p-2 text-lg font-bold text-white ${
              replayMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {replayMode ? 'Exit Replay Mode' : 'Replay Mode'}
          </button>
        </div>

        <div className="flex items-end">
          <div className="text-white">
            <div className="text-sm text-gray-400">
              {replayMode ? 'Replay Price' : 'Current Price'}
            </div>
            <div className="text-2xl font-bold text-green-500">
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
