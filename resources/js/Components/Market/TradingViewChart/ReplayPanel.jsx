import React, { useMemo, useState } from 'react';
import {
  BoxSelect,
  ChartNoAxesCombined,
  Crosshair,
  Gauge,
  LocateFixed,
  MousePointer2,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Save,
  SkipBack,
  SkipForward,
  Slash,
  Trash2,
  TrendingDown,
  TrendingUp,
  Type,
  X,
} from 'lucide-react';
import { DRAWING_COLORS, DRAWING_WIDTHS, PLAYBACK_SPEEDS } from './constants';

const controlBaseClass =
  'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40';

function controlVariantClass(variant, isActive) {
  if (variant === 'primary') return 'bg-blue-600 hover:bg-blue-700';
  if (variant === 'danger') return 'bg-red-600 hover:bg-red-500';
  if (variant === 'success') return 'bg-emerald-600 hover:bg-emerald-700';
  if (variant === 'warning') return 'bg-amber-600 hover:bg-amber-700';

  return isActive
    ? 'bg-blue-600 hover:bg-blue-700'
    : 'bg-gray-700 hover:bg-gray-600';
}

function ControlButton({
  icon: Icon,
  children,
  active = false,
  variant = 'neutral',
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      className={`${controlBaseClass} ${controlVariantClass(variant, active)} ${className}`}
      {...props}
    >
      {Icon && <Icon size={14} className="shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  );
}

function RailButton({ icon: Icon, active, disabled, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-10 w-10 items-center justify-center rounded-md text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active ? 'bg-blue-600' : 'bg-slate-900/95 hover:bg-slate-700'
      }`}
    >
      <Icon size={18} />
    </button>
  );
}

function Flyout({ title, icon: Icon, onClose, children }) {
  return (
    <div className="ml-2 w-[min(300px,calc(100vw-5.5rem))] rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
          {Icon && <Icon size={15} />}
          <span className="truncate">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-slate-800 hover:text-white"
          title="Close"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

const TOOL_BUTTONS = [
  { type: 'line', label: 'Line', icon: Slash },
  { type: 'long-position', label: 'Long', icon: TrendingUp },
  { type: 'short-position', label: 'Short', icon: TrendingDown },
  { type: 'forecast', label: 'Forecast', icon: ChartNoAxesCombined },
  { type: 'rect', label: 'Box', icon: BoxSelect },
  { type: 'text', label: 'Text', icon: Type },
];

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
  toolSettings,
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
  onDrawingLabelChange,
  onSaveSelectedToolPreset,
  onApplyToolPreset,
  onClearDrawings,
  onDeleteSelectedDrawing,
  className = '',
}) {
  const [activeGroup, setActiveGroup] = useState(null);

  const handleToolChange = (nextTool) => {
    onToolChange((currentTool) => (currentTool === nextTool ? null : nextTool));
  };

  const presetType = selectedDrawing?.type ?? tool;
  const presetLabel = presetType === 'rect'
    ? 'Box'
    : presetType === 'text'
      ? 'Text'
      : presetType
        ? presetType.charAt(0).toUpperCase() + presetType.slice(1)
        : '';
  const presetItems = Array.isArray(toolSettings?.presets?.[presetType])
    ? toolSettings.presets[presetType]
    : [];
  const canUsePresets = ['line', 'forecast', 'measure', 'rect', 'text'].includes(presetType);
  const selectedPresetName = (
    selectedDrawing?.type === 'text'
      ? selectedDrawing?.text
      : selectedDrawing?.labelText
  )?.trim();
  const hasSelectedDrawingStyle = Boolean(selectedDrawing);
  const activeToolIcon = useMemo(() => {
    return TOOL_BUTTONS.find((item) => item.type === tool)?.icon ?? MousePointer2;
  }, [tool]);

  const toggleGroup = (group) => {
    setActiveGroup((currentGroup) => (currentGroup === group ? null : group));
  };

  const ActiveToolIcon = activeToolIcon;

  return (
    <div className={`pointer-events-none flex items-start ${className}`}>
      <div className="pointer-events-auto flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur">
        <RailButton
          icon={Play}
          active={activeGroup === 'replay' || isPlaying}
          title="Replay Controls"
          onClick={() => toggleGroup('replay')}
        />
        <RailButton
          icon={Gauge}
          active={activeGroup === 'speed'}
          title="Playback Speed"
          onClick={() => toggleGroup('speed')}
        />
        <RailButton
          icon={ActiveToolIcon}
          active={activeGroup === 'tools' || Boolean(tool)}
          title="Drawing Tools"
          onClick={() => toggleGroup('tools')}
        />
        <RailButton
          icon={Palette}
          active={activeGroup === 'style'}
          title="Drawing Style"
          onClick={() => toggleGroup('style')}
        />
        <RailButton
          icon={Save}
          active={activeGroup === 'presets'}
          disabled={!canUsePresets}
          title="Tool Presets"
          onClick={() => toggleGroup('presets')}
        />
      </div>

      {activeGroup === 'replay' && (
        <div className="pointer-events-auto">
          <Flyout title="Replay" icon={Play} onClose={() => setActiveGroup(null)}>
            <div className="grid grid-cols-3 gap-2">
              <ControlButton icon={SkipBack} onClick={onStepBackward} className="px-0" title="Back">
                <span className="sr-only">Back</span>
              </ControlButton>
              <ControlButton
                icon={isPlaying ? Pause : Play}
                onClick={onTogglePlay}
                variant="primary"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </ControlButton>
              <ControlButton icon={SkipForward} onClick={onStepForward} className="px-0" title="Forward">
                <span className="sr-only">Forward</span>
              </ControlButton>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ControlButton icon={RotateCcw} onClick={onResetReplay} variant="danger">
                Reset
              </ControlButton>
              <ControlButton
                icon={LocateFixed}
                onClick={onFollowReplay}
                active={followReplay}
                variant={followReplay ? 'success' : 'neutral'}
              >
                {followReplay ? 'Following' : 'Follow'}
              </ControlButton>
            </div>

            <ControlButton
              icon={Crosshair}
              onClick={onToggleReplayPricePick}
              active={isReplayPricePickActive}
              variant={isReplayPricePickActive ? 'warning' : 'neutral'}
              className="w-full"
            >
              {isReplayPricePickActive ? 'Pick Price' : 'Set Replay Price'}
            </ControlButton>

            <div className="flex h-8 items-center justify-center rounded-md border border-gray-700 px-2 text-xs text-gray-300">
              Candle {Math.min(replayIndex + 1, candleCount)} / {candleCount}
            </div>
          </Flyout>
        </div>
      )}

      {activeGroup === 'speed' && (
        <div className="pointer-events-auto">
          <Flyout title="Speed" icon={Gauge} onClose={() => setActiveGroup(null)}>
            <div className="grid grid-cols-3 gap-2">
              {PLAYBACK_SPEEDS.map((speed) => (
                <ControlButton
                  key={speed.value}
                  onClick={() => onPlaybackSpeedChange(speed.value)}
                  active={playbackSpeed === speed.value}
                  className="h-7 px-2 text-[11px]"
                >
                  {speed.label}
                </ControlButton>
              ))}
            </div>
          </Flyout>
        </div>
      )}

      {activeGroup === 'tools' && (
        <div className="pointer-events-auto">
          <Flyout title="Tools" icon={MousePointer2} onClose={() => setActiveGroup(null)}>
            <div className="grid grid-cols-2 gap-2">
              {TOOL_BUTTONS.map(({ type, label, icon }) => (
                <ControlButton
                  key={type}
                  icon={icon}
                  onClick={() => handleToolChange(type)}
                  active={tool === type}
                >
                  {label}
                </ControlButton>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
              <ControlButton
                icon={Trash2}
                onClick={onClearDrawings}
                disabled={!drawings.length}
                variant="danger"
              >
                Clear
              </ControlButton>
              <ControlButton
                icon={Trash2}
                onClick={onDeleteSelectedDrawing}
                disabled={!selectedDrawingId}
                variant="danger"
              >
                Delete
              </ControlButton>
            </div>
          </Flyout>
        </div>
      )}

      {activeGroup === 'style' && (
        <div className="pointer-events-auto">
          <Flyout title="Style" icon={Palette} onClose={() => setActiveGroup(null)}>
            <div className="grid grid-cols-7 gap-1.5">
              {DRAWING_COLORS.map((color) => {
                const activeColor = selectedDrawing?.color ?? drawingColor;
                const isActive = activeColor?.toLowerCase() === color.toLowerCase();

                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onDrawingColorChange(color)}
                    className={`h-7 w-7 rounded-full border ${
                      isActive ? 'border-white ring-2 ring-blue-400' : 'border-gray-500'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                    aria-label={`Use color ${color}`}
                  />
                );
              })}
            </div>

            {hasSelectedDrawingStyle && ['line', 'rect', 'long-position', 'short-position', 'forecast'].includes(selectedDrawing.type) && (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Width</div>
                <div className="grid grid-cols-6 gap-2">
                  {DRAWING_WIDTHS.map((width) => (
                    <button
                      key={width}
                      type="button"
                      onClick={() => onDrawingWidthChange(width)}
                      className={`flex h-7 items-center justify-center rounded border text-[11px] text-white ${
                        (selectedDrawing.strokeWidth ?? 1) === width
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
              </div>
            )}

            {selectedDrawing && ['line', 'forecast', 'measure', 'rect'].includes(selectedDrawing.type) && (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Label</div>
                <input
                  value={selectedDrawing.labelText ?? ''}
                  onChange={(event) => onDrawingLabelChange({ labelText: event.target.value })}
                  placeholder={selectedDrawing.type === 'rect' ? 'Box text' : 'Line text'}
                  className="h-8 w-full rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none placeholder:text-gray-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedDrawing.labelVertical ?? 'top'}
                    onChange={(event) => onDrawingLabelChange({ labelVertical: event.target.value })}
                    className="h-8 rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none"
                    title="Vertical label position"
                  >
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                  <select
                    value={selectedDrawing.labelHorizontal ?? 'center'}
                    onChange={(event) => onDrawingLabelChange({ labelHorizontal: event.target.value })}
                    className="h-8 rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none"
                    title="Horizontal label position"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            )}

            {selectedDrawing?.type === 'text' && (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Text</div>
                <input
                  value={selectedDrawing.text ?? selectedDrawing.labelText ?? ''}
                  onChange={(event) => onDrawingLabelChange({
                    text: event.target.value,
                    labelText: event.target.value,
                  })}
                  placeholder="Text note"
                  className="h-8 w-full rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none placeholder:text-gray-500"
                />
              </div>
            )}
          </Flyout>
        </div>
      )}

      {activeGroup === 'presets' && (
        <div className="pointer-events-auto">
          <Flyout title={`${presetLabel || 'Tool'} Presets`} icon={Save} onClose={() => setActiveGroup(null)}>
            <div className="flex flex-wrap gap-2">
              {presetItems.map((preset) => (
                <ControlButton
                  key={preset.id ?? preset.name}
                  icon={MousePointer2}
                  onClick={() => onApplyToolPreset(presetType, preset)}
                  title={`Use ${preset.name}`}
                  className="max-w-full"
                >
                  {preset.name}
                </ControlButton>
              ))}

              {!presetItems.length && (
                <span className="text-[11px] text-gray-500">No saved presets</span>
              )}

              {selectedDrawing && selectedPresetName && (
                <ControlButton
                  icon={Save}
                  onClick={onSaveSelectedToolPreset}
                  variant="success"
                  className="w-full"
                >
                  Save Preset
                </ControlButton>
              )}
            </div>
          </Flyout>
        </div>
      )}
    </div>
  );
}
