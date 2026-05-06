import React from 'react';
import { DRAWING_COLORS, DRAWING_WIDTHS, PLAYBACK_SPEEDS } from './constants';

function toolButtonClass(isActive) {
  return `rounded-md px-2 py-1 text-xs text-white ${isActive ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`;
}

export default function ReplayPanel({
  isPlaying,
  followReplay,
  isReplayPricePickActive,
  playbackSpeed,
  replayIndex,
  candleCount,
  tool,
  drawingColor,
  drawings,
  selectedDrawingId,
  selectedDrawing,
  onStepBackward,
  onTogglePlay,
  onStepForward,
  onResetReplay,
  onFollowReplay,
  onToggleReplayPricePick,
  onPlaybackSpeedChange,
  onToolChange,
  onDrawingColorChange,
  onDrawingWidthChange,
  onClearDrawings,
  onDeleteSelectedDrawing,
}) {
  const handleToolChange = (nextTool) => {
    onToolChange((currentTool) => (currentTool === nextTool ? null : nextTool));
  };

  return (
    <div className="space-y-2 rounded-lg bg-gray-800 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={onStepBackward}
          className="rounded-md bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
        >
          {'<'}
        </button>

        <button
          onClick={onTogglePlay}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <button
          onClick={onStepForward}
          className="rounded-md bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
        >
          {'>'}
        </button>

        <button
          onClick={onResetReplay}
          className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500"
        >
          Reset
        </button>

        <button
          onClick={onFollowReplay}
          className={`rounded-md px-2 py-1 text-xs text-white ${
            followReplay ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {followReplay ? 'Following' : 'Follow Replay'}
        </button>

        <button
          onClick={onToggleReplayPricePick}
          className={`rounded-md px-2 py-1 text-xs text-white ${
            isReplayPricePickActive
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isReplayPricePickActive ? 'Click Chart to Set Price' : 'Set Replay Price'}
        </button>

        <div className="ml-2 flex flex-wrap items-center gap-1">
          <span className="text-xs text-white">Speed:</span>
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed.value}
              onClick={() => onPlaybackSpeedChange(speed.value)}
              className={`rounded px-1.5 py-0.5 text-[11px] text-white ${
                playbackSpeed === speed.value ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {speed.label}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs text-gray-300">
          Candle {Math.min(replayIndex + 1, candleCount)} / {candleCount}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => handleToolChange('line')}
          className={toolButtonClass(tool === 'line')}
        >
          Line
        </button>

        <button
          onClick={() => handleToolChange('long-position')}
          className={toolButtonClass(tool === 'long-position')}
        >
          Long
        </button>

        <button
          onClick={() => handleToolChange('short-position')}
          className={toolButtonClass(tool === 'short-position')}
        >
          Short
        </button>

        <button
          onClick={() => handleToolChange('forecast')}
          className={toolButtonClass(tool === 'forecast')}
        >
          Forecast
        </button>

        <button
          onClick={() => handleToolChange('rect')}
          className={toolButtonClass(tool === 'rect')}
        >
          Box
        </button>

        <button
          onClick={() => handleToolChange('text')}
          className={toolButtonClass(tool === 'text')}
        >
          Text
        </button>

        <button
          onClick={onClearDrawings}
          disabled={!drawings.length}
          className="rounded-md bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          Clear Drawings
        </button>

        <button
          onClick={onDeleteSelectedDrawing}
          disabled={!selectedDrawingId}
          className="rounded-md bg-red-700 px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          Delete Selected
        </button>

        <div className="ml-1 flex flex-wrap items-center gap-1">
          <span className="text-xs text-gray-300">Color:</span>
          {DRAWING_COLORS.map((color) => {
            const activeColor = selectedDrawing?.color ?? drawingColor;
            const isActive = activeColor?.toLowerCase() === color.toLowerCase();

            return (
              <button
                key={color}
                type="button"
                onClick={() => onDrawingColorChange(color)}
                className={`h-6 w-6 rounded-full border ${
                  isActive ? 'border-white ring-2 ring-blue-400' : 'border-gray-500'
                }`}
                style={{ backgroundColor: color }}
                title={color}
                aria-label={`Use color ${color}`}
              />
            );
          })}
        </div>
      </div>

      {selectedDrawing && ['line', 'rect', 'long-position', 'short-position', 'forecast'].includes(selectedDrawing.type) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-300">Width:</span>
          {DRAWING_WIDTHS.map((width) => (
            <button
              key={width}
              onClick={() => onDrawingWidthChange(width)}
              className={`flex h-6 w-8 items-center justify-center rounded border text-[11px] text-white ${
                (selectedDrawing.strokeWidth ?? 2) === width
                  ? 'border-blue-400 bg-blue-600'
                  : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
              }`}
              title={`${width}px`}
            >
              <span
                className="block rounded-full bg-white"
                style={{ width: 18, height: Math.max(width, 1) }}
              />
            </button>
          ))}
        </div>
      )}

      <div className="text-[11px] text-gray-400">
        Default chart mouse behavior is preserved. Use "Set Replay Price" to arm the next chart click for price selection. Drawings can be selected and dragged. Hold Space to pan if you want, but normal chart drag/pan remains available when no drawing tool is active.
      </div>
    </div>
  );
}
