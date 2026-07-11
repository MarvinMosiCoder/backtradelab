import React, { useEffect, useMemo, useState } from 'react';
import {
  Bold,
  BoxSelect,
  ChevronDown,
  ChartNoAxesCombined,
  Copy,
  Crosshair,
  Gauge,
  Italic,
  LocateFixed,
  MousePointer2,
  MoveRight,
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
  Wallet,
  X,
} from 'lucide-react';
import { DRAWING_COLORS, DRAWING_WIDTHS, PLAYBACK_SPEEDS } from './constants';

const controlBaseClass =
  'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40';

function controlVariantClass(variant, isActive, chartTheme) {
  const isDark = chartTheme?.mode !== 'light';
  if (variant === 'primary') {
    return isDark
      ? 'bg-white text-skin-black hover:bg-gray-200'
      : 'bg-skin-black text-white hover:bg-skin-black-light';
  }
  if (variant === 'danger') return 'bg-red-600 text-white hover:bg-red-500';
  if (variant === 'success') return 'bg-emerald-600 text-white hover:bg-emerald-700';
  if (variant === 'warning') return 'bg-amber-600 text-white hover:bg-amber-700';

  return isActive
    ? isDark
      ? 'bg-white text-skin-black hover:bg-gray-200'
      : 'bg-skin-black text-white hover:bg-skin-black-light'
    : isDark
      ? 'border border-gray-700 bg-black-table-color text-gray-200 hover:bg-skin-black-light hover:text-white'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100';
}

function ControlButton({
  icon: Icon,
  children,
  active = false,
  variant = 'neutral',
  className = '',
  chartTheme,
  title,
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={title}
      className={`${controlBaseClass} ${controlVariantClass(variant, active, chartTheme)} ${className}`}
      {...props}
    >
      {Icon && <Icon size={14} className="shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  );
}

function getPanelStyle(chartTheme) {
  const isDark = chartTheme?.mode === 'dark';
  const panel = chartTheme?.panel ?? (isDark ? '#242627' : '#ffffff');
  const border = chartTheme?.border ?? (isDark ? '#31363F' : '#e5e7eb');

  return {
    backgroundColor: panel,
    borderColor: border,
  };
}

function getControlStyle(chartTheme) {
  const isDark = chartTheme?.mode === 'dark';

  return {
    backgroundColor: chartTheme?.panelControl ?? (isDark ? '#151617' : '#f8fafc'),
    borderColor: chartTheme?.border ?? (isDark ? '#31363F' : '#e5e7eb'),
  };
}

function RailButton({ icon: Icon, active, disabled, title, onClick, chartTheme }) {
  const inactiveTextClass = chartTheme?.mode === 'dark' ? 'text-white' : 'text-slate-700';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      className={`flex h-10 w-10 items-center justify-center rounded-md border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active ? 'border-white bg-white text-skin-black' : `${inactiveTextClass} hover:brightness-95`
      }`}
      style={active ? undefined : getControlStyle(chartTheme)}
    >
      <Icon size={18} />
    </button>
  );
}

function Flyout({ title, icon: Icon, onClose, children, bodyClassName = 'space-y-3', chartTheme }) {
  const isDark = chartTheme?.mode === 'dark';
  const titleClass = isDark ? 'text-gray-300' : 'text-slate-700';
  const closeClass = isDark
    ? 'text-gray-400 hover:bg-skin-black-light hover:text-white'
    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';

  return (
    <div
      className={`ml-2 w-[min(300px,calc(100vw-5.5rem))] rounded-lg border p-3 shadow-2xl backdrop-blur ${
        isDark ? 'text-white' : 'text-slate-800'
      }`}
      style={{
        ...getPanelStyle(chartTheme),
        maxWidth: 'var(--replay-panel-content-width, 300px)',
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className={`flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide ${titleClass}`}>
          {Icon && <Icon size={15} />}
          <span className="truncate">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`flex h-7 w-7 items-center justify-center rounded-md ${closeClass}`}
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

function TopMenuButton({ icon: Icon, children, active, disabled, onClick, className = '', chartTheme }) {
  const inactiveClass = chartTheme?.mode === 'light'
    ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
    : 'bg-black-table-color text-white hover:bg-skin-black-light';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? (chartTheme?.mode === 'light' ? 'bg-skin-black text-white' : 'bg-white text-skin-black') : inactiveClass
      } ${className}`}
    >
      {Icon && <Icon size={14} className="shrink-0" />}
      <span className="truncate">{children}</span>
      <ChevronDown size={13} className="shrink-0 opacity-70" />
    </button>
  );
}

const TOOL_BUTTONS = [
  { type: 'line', label: 'Line', icon: Slash },
  { type: 'horizontal-ray', label: 'H Ray', icon: MoveRight },
  { type: 'path', label: 'Path', icon: Slash },
  { type: 'fib-retracement', label: 'Fib Retrace', icon: Crosshair },
  { type: 'fib-extension', label: 'Fib Extension', icon: ChartNoAxesCombined },
  { type: 'long-position', label: 'Long', icon: TrendingUp },
  { type: 'short-position', label: 'Short', icon: TrendingDown },
  { type: 'forecast', label: 'Forecast', icon: ChartNoAxesCombined },
  { type: 'measure', label: 'Measure', icon: LocateFixed },
  { type: 'rect', label: 'Box', icon: BoxSelect },
  { type: 'text', label: 'Text', icon: Type },
];

const TOOL_GROUPS = [
  { name: 'Trend Lines', tools: ['line', 'horizontal-ray', 'path'] },
  { name: 'Fibonacci', tools: ['fib-retracement', 'fib-extension'] },
  { name: 'Forecasting', tools: ['long-position', 'short-position', 'forecast'] },
  { name: 'Geometric Shape', tools: ['measure', 'rect'] },
  { name: 'Annotation', tools: ['text'] },
];

const TOOL_LABELS = TOOL_BUTTONS.reduce((labels, toolButton) => ({
  ...labels,
  [toolButton.type]: toolButton.label,
}), {});

const WIDTH_TOOL_TYPES = ['line', 'horizontal-ray', 'path', 'fib-retracement', 'fib-extension', 'rect', 'long-position', 'short-position', 'forecast', 'measure'];
const LINE_STYLE_TOOL_TYPES = ['line', 'horizontal-ray', 'path', 'fib-retracement', 'fib-extension', 'rect'];
const LABEL_TOOL_TYPES = ['line', 'horizontal-ray', 'path', 'fib-retracement', 'fib-extension', 'forecast', 'measure', 'rect'];
const PRESET_TOOL_TYPES = ['line', 'horizontal-ray', 'path', 'fib-retracement', 'fib-extension', 'forecast', 'measure', 'rect', 'text', 'long-position', 'short-position'];

function normalizeHexColor(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;

  const hex = match[1];
  if (hex.length === 3) {
    return `#${hex.split('').map((char) => `${char}${char}`).join('')}`.toLowerCase();
  }

  return `#${hex}`.toLowerCase();
}

function getToolLabel(type) {
  return TOOL_LABELS[type] ?? (
    type
      ? type.charAt(0).toUpperCase() + type.slice(1)
      : ''
  );
}

function TopToolEditorBar({
  editorLabel,
  editorType,
  activeColor,
  activeStrokeWidth,
  activeLineStyle,
  activeLabelText,
  activeText,
  activeTextBold,
  activeTextItalic,
  activeLabelVertical,
  activeLabelHorizontal,
  canEditWidth,
  canEditLineStyle,
  canEditLabel,
  canEditText,
  canUsePresets,
  presetItems,
  presetNameDraft,
  setPresetNameDraft,
  selectedDrawing,
  openMenu,
  setOpenMenu,
  onDrawingColorChange,
  onDrawingWidthChange,
  onDrawingLineStyleChange,
  onDrawingLabelChange,
  onApplyToolPreset,
  onDeleteToolPreset,
  onDuplicateSelectedDrawing,
  onDeleteSelectedDrawing,
  onSavePreset,
  chartTheme,
  availableWidth,
}) {
  const [hexColorDraft, setHexColorDraft] = useState(activeColor ?? '');

  const toggleMenu = (menu) => {
    setOpenMenu((currentMenu) => (currentMenu === menu ? null : menu));
  };

  const isDark = chartTheme?.mode !== 'light';
  const menuPanelClass = isDark
    ? 'absolute left-0 top-10 z-50 w-[min(300px,calc(100vw-2rem))] rounded-lg border border-gray-700 bg-skin-black/95 p-3 text-white shadow-2xl backdrop-blur'
    : 'absolute left-0 top-10 z-50 w-[min(300px,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl backdrop-blur';
  const editorBadgeClass = isDark
    ? 'bg-black-table-color text-gray-200'
    : 'border border-slate-200 bg-slate-50 text-slate-700';
  const editorLabelClass = isDark ? 'text-gray-400' : 'text-slate-600';
  const editorFieldClass = isDark
    ? 'border-gray-700 bg-black-table-color text-white placeholder:text-gray-500'
    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400';
  const editorOptionClass = (active) => (
    active
      ? isDark
        ? 'border-white bg-white text-skin-black'
        : 'border-skin-black bg-skin-black text-white'
      : isDark
        ? 'border-gray-700 bg-black-table-color text-white hover:bg-skin-black-light'
        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
  );
  const displayColor = normalizeHexColor(activeColor) ?? activeColor ?? '#60a5fa';

  useEffect(() => {
    setHexColorDraft(normalizeHexColor(activeColor) ?? activeColor ?? '');
  }, [activeColor]);

  const handleHexColorChange = (value) => {
    const nextValue = value.startsWith('#') ? value : `#${value}`;
    if (!/^#[0-9a-fA-F]{0,6}$/.test(nextValue)) return;

    setHexColorDraft(nextValue);

    const normalizedColor = normalizeHexColor(nextValue);
    if (normalizedColor) {
      onDrawingColorChange(normalizedColor);
    }
  };

  return (
    <div
      className="pointer-events-auto ml-2 rounded-lg border p-1.5 shadow-2xl backdrop-blur"
      style={{
        ...getPanelStyle(chartTheme),
        maxWidth: `${Math.max(Number(availableWidth) || 140, 140)}px`,
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <div className={`flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-semibold ${editorBadgeClass}`}>
          <Palette size={14} />
          <span>{editorLabel || 'Tool'}</span>
        </div>

        <div className="relative">
          <TopMenuButton
            active={openMenu === 'color'}
            onClick={() => toggleMenu('color')}
            className="w-24 justify-start"
            chartTheme={chartTheme}
          >
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-sm border border-white/50"
              style={{ backgroundColor: displayColor }}
            />
            Color
          </TopMenuButton>
          {openMenu === 'color' && (
            <div className={menuPanelClass}>
              <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${editorLabelClass}`}>Color</div>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="h-8 w-8 shrink-0 rounded-sm border border-gray-500"
                  style={{ backgroundColor: displayColor }}
                  aria-hidden="true"
                />
                <input
                  value={hexColorDraft}
                  onChange={(event) => handleHexColorChange(event.target.value)}
                  onBlur={() => {
                    const normalizedColor = normalizeHexColor(hexColorDraft);
                    setHexColorDraft(normalizedColor ?? displayColor);
                  }}
                  maxLength={7}
                  spellCheck={false}
                  placeholder="#60a5fa"
                  className={`h-8 min-w-0 flex-1 rounded border px-2 text-xs font-mono uppercase outline-none ${editorFieldClass}`}
                  aria-label="Hex color"
                />
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {DRAWING_COLORS.map((color) => {
                  const isActive = activeColor?.toLowerCase() === color.toLowerCase();

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        onDrawingColorChange(color);
                        setOpenMenu(null);
                      }}
                      className={`h-8 w-8 rounded-sm border ${
                        isActive ? 'border-white ring-2 ring-white' : 'border-gray-500'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                      aria-label={`Use color ${color}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {canEditWidth && (
          <div className="relative">
            <TopMenuButton active={openMenu === 'width'} onClick={() => toggleMenu('width')} chartTheme={chartTheme}>
              {activeStrokeWidth}px
            </TopMenuButton>
            {openMenu === 'width' && (
              <div className={menuPanelClass}>
                <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${editorLabelClass}`}>Line Width</div>
                <div className="grid grid-cols-6 gap-2">
                  {DRAWING_WIDTHS.map((width) => (
                    <button
                      key={width}
                      type="button"
                      onClick={() => {
                        onDrawingWidthChange(width);
                        setOpenMenu(null);
                      }}
                      className={`flex h-8 items-center justify-center rounded border text-[11px] ${editorOptionClass(activeStrokeWidth === width)}`}
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
          </div>
        )}

        {canEditLineStyle && (
          <div className="relative">
            <TopMenuButton active={openMenu === 'style'} onClick={() => toggleMenu('style')} chartTheme={chartTheme}>
              {activeLineStyle === 'dashed' ? 'Dashed' : 'Solid'}
            </TopMenuButton>
            {openMenu === 'style' && (
              <div className={menuPanelClass}>
                <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${editorLabelClass}`}>Line Style</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'solid', label: 'Solid', dash: false },
                    { value: 'dashed', label: 'Dashed', dash: true },
                  ].map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => {
                        onDrawingLineStyleChange(style.value);
                        setOpenMenu(null);
                      }}
                      className={`flex h-9 items-center justify-center gap-2 rounded border px-2 text-xs font-medium ${editorOptionClass(activeLineStyle === style.value)}`}
                    >
                      <span
                        className="h-px w-8 bg-white"
                        style={style.dash ? {
                          backgroundImage: 'linear-gradient(to right, #fff 0 55%, transparent 55% 100%)',
                          backgroundSize: '8px 1px',
                          backgroundColor: 'transparent',
                        } : undefined}
                      />
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <TopMenuButton active={openMenu === 'text-style'} onClick={() => toggleMenu('text-style')} chartTheme={chartTheme}>
            Style
          </TopMenuButton>
          {openMenu === 'text-style' && (
            <div className={menuPanelClass}>
              <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${editorLabelClass}`}>Text Style</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onDrawingLabelChange({ textBold: !activeTextBold })}
                  className={`flex h-9 items-center justify-center gap-2 rounded border px-2 text-xs font-medium ${editorOptionClass(activeTextBold)}`}
                  title="Bold text"
                  aria-label="Bold text"
                >
                  <Bold size={14} />
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() => onDrawingLabelChange({ textItalic: !activeTextItalic })}
                  className={`flex h-9 items-center justify-center gap-2 rounded border px-2 text-xs font-medium ${editorOptionClass(activeTextItalic)}`}
                  title="Italic text"
                  aria-label="Italic text"
                >
                  <Italic size={14} />
                  Italic
                </button>
              </div>
            </div>
          )}
        </div>

        {canEditLabel && (
          <div className="relative">
            <TopMenuButton active={openMenu === 'label'} onClick={() => toggleMenu('label')} chartTheme={chartTheme}>
              Label
            </TopMenuButton>
            {openMenu === 'label' && (
              <div className={menuPanelClass}>
                <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${editorLabelClass}`}>Label</div>
                <input
                  value={activeLabelText}
                  onChange={(event) => onDrawingLabelChange({ labelText: event.target.value })}
                  placeholder={editorType === 'rect' ? 'Box text' : 'Line text'}
                  className={`mb-2 h-8 w-full rounded border px-2 text-xs outline-none ${editorFieldClass}`}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={activeLabelVertical}
                    onChange={(event) => onDrawingLabelChange({ labelVertical: event.target.value })}
                    className={`h-8 rounded border px-2 text-xs outline-none ${editorFieldClass}`}
                    title="Vertical label position"
                  >
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                  <select
                    value={activeLabelHorizontal}
                    onChange={(event) => onDrawingLabelChange({ labelHorizontal: event.target.value })}
                    className={`h-8 rounded border px-2 text-xs outline-none ${editorFieldClass}`}
                    title="Horizontal label position"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {canEditText && (
          <div className="relative">
            <TopMenuButton active={openMenu === 'text'} onClick={() => toggleMenu('text')} chartTheme={chartTheme}>
              Text
            </TopMenuButton>
            {openMenu === 'text' && (
              <div className={menuPanelClass}>
                <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${editorLabelClass}`}>Text</div>
                <input
                  value={activeText}
                  onChange={(event) => onDrawingLabelChange({
                    text: event.target.value,
                    labelText: event.target.value,
                  })}
                  placeholder="Text note"
                  className={`h-8 w-full rounded border px-2 text-xs outline-none ${editorFieldClass}`}
                />
              </div>
            )}
          </div>
        )}

        {canUsePresets && (
          <div className="relative">
            <TopMenuButton active={openMenu === 'presets'} onClick={() => toggleMenu('presets')} chartTheme={chartTheme}>
              Presets
            </TopMenuButton>
            {openMenu === 'presets' && (
              <div className={menuPanelClass}>
                <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${editorLabelClass}`}>Presets</div>
                <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {presetItems.map((preset) => (
                    <div
                      key={preset.id ?? preset.name}
                      className="grid grid-cols-[minmax(0,1fr)_32px] gap-1.5"
                    >
                      <ControlButton
                        icon={MousePointer2}
                        onClick={() => {
                          onApplyToolPreset(editorType, preset);
                          setOpenMenu(null);
                        }}
                        title={`Use ${preset.name}`}
                        className="max-w-full justify-start"
                        chartTheme={chartTheme}
                      >
                        {preset.name}
                      </ControlButton>
                      <button
                        type="button"
                        onClick={() => onDeleteToolPreset(editorType, preset)}
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-red-950/70 text-red-200 hover:bg-red-900 hover:text-white"
                        title={`Delete ${preset.name}`}
                        aria-label={`Delete ${preset.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {!presetItems.length && (
                    <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>No saved presets</span>
                  )}
                </div>

                {selectedDrawing && (
                  <div className={`mt-3 border-t pt-3 ${isDark ? 'border-gray-800' : 'border-slate-200'}`}>
                    <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${editorLabelClass}`}>Save Preset</div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <input
                        value={presetNameDraft}
                        onChange={(event) => setPresetNameDraft(event.target.value)}
                        placeholder={`${editorLabel} preset name`}
                        className={`h-8 min-w-0 rounded border px-2 text-xs outline-none ${editorFieldClass}`}
                      />
                      <ControlButton
                        icon={Save}
                        onClick={onSavePreset}
                        variant="success"
                        disabled={!presetNameDraft.trim()}
                        chartTheme={chartTheme}
                      >
                        Save
                      </ControlButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedDrawing && (
          <>
            <button
              type="button"
              onClick={onDuplicateSelectedDrawing}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${
                isDark ? 'bg-black-table-color text-slate-100 hover:bg-skin-black-light hover:text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
              title="Duplicate selected drawing"
              aria-label="Duplicate selected drawing"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={onDeleteSelectedDrawing}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-950/80 text-red-200 transition hover:bg-red-900 hover:text-white"
              title="Delete selected drawing"
              aria-label="Delete selected drawing"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function formatMoney(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '---';
  return number.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getStoredValue(key, fallback) {
  if (typeof window === 'undefined') return fallback;

  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function getPhpRate(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : 58;
}

function quoteToDisplayAmount(value, currency, phpRate) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return currency === 'PHP' ? number * phpRate : number;
}

function displayToQuoteAmount(value, currency, phpRate) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return currency === 'PHP' ? number / phpRate : number;
}

function formatDisplayMoney(value, currency, phpRate, digits = 2) {
  const amount = quoteToDisplayAmount(value, currency, phpRate);
  if (amount == null) return '---';
  return `${formatMoney(amount, digits)} ${currency}`;
}

function formatLeverage(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '1x';
  return `${Number(number.toFixed(2))}x`;
}

function getPositiveNumber(value) {
  if (value === null || value === undefined || value === '') return null;

  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function getBacktestMetrics(account, symbol, executionPrice) {
  const positions = Array.isArray(account?.openPositions) ? account.openPositions : [];
  const price = Number(executionPrice);
  const unrealizedPnl = positions.reduce((total, position) => {
    if (!Number.isFinite(price) || position.symbol !== symbol) {
      return total + Number(position.unrealizedPnl ?? 0);
    }

    const quantity = Number(position.quantity);
    const entryPrice = Number(position.entryPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(entryPrice)) return total;

    const pnl = position.side === 'long'
      ? (price - entryPrice) * quantity
      : (entryPrice - price) * quantity;

    return total + pnl;
  }, 0);
  const lockedMargin = positions.reduce((total, position) => total + Number(position.margin ?? 0), 0);
  const cashBalance = Number(account?.cashBalance ?? 0);

  return {
    cashBalance,
    lockedMargin,
    unrealizedPnl,
    equity: cashBalance + lockedMargin + unrealizedPnl,
  };
}

function getOrderPlan({ side, entryPrice, stopLoss, takeProfit, notional, leverage, cashBalance, feeRate }) {
  const entry = Number(entryPrice);
  const stop = Number(stopLoss);
  const target = Number(takeProfit);
  const requestedMargin = Number(notional);
  let margin = requestedMargin;
  const leverageValue = Number(leverage);
  const feeRateValue = Number.isFinite(Number(feeRate)) ? Number(feeRate) : 0.0004;
  const positionNotional =
    Number.isFinite(margin) && margin > 0 && Number.isFinite(leverageValue) && leverageValue > 0
      ? margin * leverageValue
      : null;

  if (!Number.isFinite(entry) || entry <= 0) {
    return null;
  }

  let effectivePositionNotional = positionNotional;
  let entryFee = effectivePositionNotional ? effectivePositionNotional * feeRateValue : null;
  let requiredCash = margin && entryFee != null ? margin + entryFee : null;
  let adjustedForFee = false;
  const availableCash = Number(cashBalance);

  if (
    Number.isFinite(availableCash) &&
    availableCash > 0 &&
    requiredCash > availableCash &&
    requestedMargin <= availableCash
  ) {
    margin = availableCash / (1 + (leverageValue * feeRateValue));
    effectivePositionNotional = margin * leverageValue;
    entryFee = effectivePositionNotional * feeRateValue;
    requiredCash = margin + entryFee;
    adjustedForFee = true;
  }

  const riskPerUnit =
    Number.isFinite(stop) && stop > 0
      ? side === 'long'
        ? entry - stop
        : stop - entry
      : null;
  const rewardPerUnit =
    Number.isFinite(target) && target > 0
      ? side === 'long'
        ? target - entry
        : entry - target
      : null;
  const quantity = effectivePositionNotional ? effectivePositionNotional / entry : null;
  const riskAmount = quantity && riskPerUnit && riskPerUnit > 0 ? quantity * riskPerUnit : null;
  const rewardAmount = quantity && rewardPerUnit && rewardPerUnit > 0 ? quantity * rewardPerUnit : null;
  const exitFee = effectivePositionNotional ? effectivePositionNotional * feeRateValue : null;
  const totalEstimatedFees = entryFee != null && exitFee != null ? entryFee + exitFee : null;
  const estimatedProfit = rewardAmount != null && totalEstimatedFees != null
    ? rewardAmount - totalEstimatedFees
    : null;
  const estimatedLoss = riskAmount != null && totalEstimatedFees != null
    ? riskAmount + totalEstimatedFees
    : null;

  return {
    margin: Number.isFinite(margin) && margin > 0 ? margin : null,
    requestedMargin: Number.isFinite(requestedMargin) && requestedMargin > 0 ? requestedMargin : null,
    leverage: Number.isFinite(leverageValue) && leverageValue > 0 ? leverageValue : null,
    positionNotional: effectivePositionNotional,
    entryFee,
    requiredCash,
    adjustedForFee,
    quantity,
    riskAmount,
    rewardAmount,
    exitFee,
    estimatedProfit,
    estimatedLoss,
    rr: riskAmount && rewardAmount ? rewardAmount / riskAmount : null,
    isStopValid: riskPerUnit == null || riskPerUnit > 0,
    isTargetValid: rewardPerUnit == null || rewardPerUnit > 0,
  };
}

function getMaxMarginForCash(cashBalance, leverage, feeRate) {
  const cash = Number(cashBalance);
  const leverageValue = Number(leverage);
  const feeRateValue = Number.isFinite(Number(feeRate)) ? Number(feeRate) : 0.0004;

  if (!Number.isFinite(cash) || cash <= 0 || !Number.isFinite(leverageValue) || leverageValue <= 0) {
    return null;
  }

  return cash / (1 + (leverageValue * feeRateValue));
}

export default function ReplayPanel({
  replayMode,
  isPlaying,
  followReplay,
  isReplayPricePickActive,
  playbackSpeed,
  replayIndex,
  candleCount,
  tool,
  drawingColor,
  drawings,
  drawingSaveStatus = 'saved',
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
  onDrawingLineStyleChange,
  onDrawingLabelChange,
  onSaveSelectedToolPreset,
  onApplyToolPreset,
  onDeleteToolPreset,
  onClearDrawings,
  onDuplicateSelectedDrawing,
  onDeleteSelectedDrawing,
  onStartBacktestSession,
  onEndBacktestSession,
  symbol,
  executionPrice,
  backtestAccount,
  backtestError,
  isBacktestLoading,
  onOpenBacktestPosition,
  onCloseBacktestPosition,
  onCancelBacktestPosition,
  onResetBacktestAccount,
  orderLineDraftPatch,
  orderEntryRequest,
  orderDraftClearRequest,
  onBacktestOrderDraftChange,
  chartTheme,
  overlayWidth,
  className = '',
}) {
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeEditorMenu, setActiveEditorMenu] = useState(null);
  const [presetNameDraft, setPresetNameDraft] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [orderSide, setOrderSide] = useState('long');
  const [orderNotional, setOrderNotional] = useState('1000');
  const [orderLeverage, setOrderLeverage] = useState('1');
  const [orderEntryPrice, setOrderEntryPrice] = useState('');
  const [orderStopLoss, setOrderStopLoss] = useState('');
  const [orderTakeProfit, setOrderTakeProfit] = useState('');
  const [showOrderDraft, setShowOrderDraft] = useState(false);
  const [resetBalance, setResetBalance] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState(() => (
    getStoredValue('market-backtest-display-currency', 'USDT') === 'PHP' ? 'PHP' : 'USDT'
  ));
  const [phpRate, setPhpRate] = useState(() => getStoredValue('market-backtest-php-rate', '58'));

  const handleToolChange = (nextTool) => {
    onToolChange((currentTool) => (currentTool === nextTool ? null : nextTool));
  };

  const editorType = selectedDrawing?.type ?? tool;
  const editorLabel = getToolLabel(editorType);
  const editorSettings = editorType && toolSettings?.[editorType]
    ? toolSettings[editorType]
    : {};
  const presetItems = Array.isArray(toolSettings?.presets?.[editorType])
    ? toolSettings.presets[editorType]
    : [];
  const canUsePresets = PRESET_TOOL_TYPES.includes(editorType);
  const selectedPresetName = (
    selectedDrawing?.type === 'text'
      ? selectedDrawing?.text
      : selectedDrawing?.labelText
  )?.trim();
  const activeColor = selectedDrawing?.color ?? editorSettings.color ?? drawingColor;
  const activeStrokeWidth = selectedDrawing?.strokeWidth ?? editorSettings.strokeWidth ?? 1;
  const activeLineStyle = selectedDrawing?.lineStyle ?? editorSettings.lineStyle ?? 'solid';
  const activeLabelText = selectedDrawing?.labelText ?? editorSettings.labelText ?? '';
  const activeText = selectedDrawing?.text ?? activeLabelText;
  const activeTextBold = Boolean(selectedDrawing?.textBold ?? editorSettings.textBold ?? false);
  const activeTextItalic = Boolean(selectedDrawing?.textItalic ?? editorSettings.textItalic ?? false);
  const activeLabelVertical = selectedDrawing?.labelVertical ?? editorSettings.labelVertical ?? 'top';
  const activeLabelHorizontal = selectedDrawing?.labelHorizontal ?? editorSettings.labelHorizontal ?? 'center';
  const canEditWidth = WIDTH_TOOL_TYPES.includes(editorType);
  const canEditLineStyle = LINE_STYLE_TOOL_TYPES.includes(editorType);
  const canEditLabel = LABEL_TOOL_TYPES.includes(editorType);
  const canEditText = editorType === 'text';
  const hasToolEditor = Boolean(editorType);
  const activeToolIcon = useMemo(() => {
    return TOOL_BUTTONS.find((item) => item.type === tool)?.icon ?? MousePointer2;
  }, [tool]);

  useEffect(() => {
    if (selectedDrawing || tool) {
      setActiveGroup('tool-editor');
    }
  }, [selectedDrawingId, selectedDrawing, tool]);

  useEffect(() => {
    setActiveEditorMenu(null);
  }, [editorType]);

  useEffect(() => {
    setPresetNameDraft(selectedPresetName ?? '');
  }, [selectedPresetName, selectedDrawingId]);

  useEffect(() => {
    try {
      localStorage.setItem('market-backtest-display-currency', displayCurrency);
    } catch {}
  }, [displayCurrency]);

  useEffect(() => {
    try {
      localStorage.setItem('market-backtest-php-rate', phpRate);
    } catch {}
  }, [phpRate]);

  useEffect(() => {
    if (backtestAccount?.startingBalance != null) {
      setResetBalance(String(Number(backtestAccount.startingBalance)));
    }
  }, [backtestAccount?.startingBalance]);

  useEffect(() => {
    if (!orderLineDraftPatch) return;

    if (orderLineDraftPatch.kind === 'entry') {
      setOrderEntryPrice(orderLineDraftPatch.value);
    }

    if (orderLineDraftPatch.kind === 'sl') {
      setOrderStopLoss(orderLineDraftPatch.value);
    }

    if (orderLineDraftPatch.kind === 'tp') {
      setOrderTakeProfit(orderLineDraftPatch.value);
    }
  }, [orderLineDraftPatch]);

  useEffect(() => {
    const requestedPrice = getPositiveNumber(orderEntryRequest?.price);
    if (!orderEntryRequest?.id || requestedPrice == null) return;

    setOrderType('limit');
    setOrderEntryPrice(String(Number(requestedPrice.toFixed(8))));
    setShowOrderDraft(true);
    setActiveGroup('backtest');
  }, [orderEntryRequest]);

  useEffect(() => {
    if (!orderDraftClearRequest?.id) return;
    setShowOrderDraft(false);
    setOrderEntryPrice('');
    setOrderStopLoss('');
    setOrderTakeProfit('');
    onBacktestOrderDraftChange?.(null);
  }, [onBacktestOrderDraftChange, orderDraftClearRequest]);

  const toggleGroup = (group) => {
    if (activeGroup === 'backtest') {
      setShowOrderDraft(false);
      setOrderEntryPrice('');
      setOrderStopLoss('');
      setOrderTakeProfit('');
      onBacktestOrderDraftChange?.(null);
    }
    setActiveGroup((currentGroup) => (currentGroup === group ? null : group));
  };

  const handleSavePreset = () => {
    onSaveSelectedToolPreset(presetNameDraft);
    setPresetNameDraft('');
  };

  const ActiveToolIcon = activeToolIcon;
  const quoteCurrency = backtestAccount?.quoteCurrency ?? 'USDT';
  const normalizedPhpRate = getPhpRate(phpRate);
  const formatAccountMoney = (value, digits = 2) => formatDisplayMoney(
    value,
    displayCurrency,
    normalizedPhpRate,
    digits
  );
  const handleDisplayCurrencyChange = (nextCurrency) => {
    const normalizedCurrency = nextCurrency === 'PHP' ? 'PHP' : 'USDT';
    const currentQuoteNotional = displayToQuoteAmount(orderNotional, displayCurrency, normalizedPhpRate);
    const nextDisplayNotional = quoteToDisplayAmount(
      currentQuoteNotional,
      normalizedCurrency,
      normalizedPhpRate
    );

    setDisplayCurrency(normalizedCurrency);
    if (nextDisplayNotional != null) {
      setOrderNotional(String(Number(nextDisplayNotional.toFixed(2))));
    }
  };
  const backtestMetrics = getBacktestMetrics(backtestAccount, symbol, executionPrice);
  const currentExecutionPrice = getPositiveNumber(executionPrice);
  const customEntryPrice = getPositiveNumber(orderEntryPrice);
  const canTrade = currentExecutionPrice != null && !isBacktestLoading;
  const hasCustomEntryPrice = customEntryPrice != null;
  const isPendingOrder = orderType === 'limit' || orderType === 'trigger' || orderType === 'conditional';
  const effectiveEntryPrice = hasCustomEntryPrice ? customEntryPrice : currentExecutionPrice;
  const quoteNotional = displayToQuoteAmount(orderNotional, displayCurrency, normalizedPhpRate);
  const leverageValue = Number(orderLeverage);
  const isLeverageValid = Number.isFinite(leverageValue) && leverageValue >= 1 && leverageValue <= 125;
  const feeRate = Number(backtestAccount?.feeRate ?? 0.0004);
  const plannedStopLoss = getPositiveNumber(orderStopLoss) ?? (
    effectiveEntryPrice != null
      ? orderSide === 'short'
        ? effectiveEntryPrice * 1.01
        : effectiveEntryPrice * 0.99
      : null
  );
  const plannedTakeProfit = getPositiveNumber(orderTakeProfit) ?? (
    effectiveEntryPrice != null
      ? orderSide === 'short'
        ? effectiveEntryPrice * 0.99
        : effectiveEntryPrice * 1.01
      : null
  );
  const orderPlan = getOrderPlan({
    side: orderSide,
    entryPrice: effectiveEntryPrice,
    stopLoss: plannedStopLoss,
    takeProfit: plannedTakeProfit,
    notional: quoteNotional,
    leverage: leverageValue,
    cashBalance: backtestMetrics.cashBalance,
    feeRate,
  });
  const canSubmitOrder =
    canTrade &&
    Number.isFinite(Number(quoteNotional)) &&
    Number(quoteNotional) > 0 &&
    isLeverageValid &&
    effectiveEntryPrice != null &&
    orderPlan?.margin != null &&
    orderPlan.margin >= 1 &&
    orderPlan?.requiredCash != null &&
    orderPlan.requiredCash <= backtestMetrics.cashBalance + 0.00000001 &&
    (!isPendingOrder || hasCustomEntryPrice) &&
    (orderPlan?.isStopValid ?? true) &&
    (orderPlan?.isTargetValid ?? true);

  const submitBacktestOrder = () => {
    const notional = Number(quoteNotional);
    if (!canSubmitOrder || !Number.isFinite(notional) || notional <= 0) return;

    onOpenBacktestPosition({
      side: orderSide,
      orderType,
      notional,
      leverage: leverageValue,
      entryPrice: effectiveEntryPrice,
      stopLoss: plannedStopLoss,
      takeProfit: plannedTakeProfit,
    });
    setShowOrderDraft(false);
  };
  const removeOrderDraft = () => {
    setShowOrderDraft(false);
    setOrderEntryPrice('');
    setOrderStopLoss('');
    setOrderTakeProfit('');
    onBacktestOrderDraftChange?.(null);
  };
  const resetBalanceValue = displayToQuoteAmount(resetBalance, displayCurrency, normalizedPhpRate);
  const canResetAccount =
    !isBacktestLoading &&
    Number.isFinite(Number(resetBalanceValue)) &&
    Number(resetBalanceValue) > 0;
  const submitAccountReset = () => {
    if (!canResetAccount) return;

    const confirmed = window.confirm(
      `Reset paper account to ${formatAccountMoney(resetBalanceValue)}? This deletes current positions and trade history.`
    );

    if (!confirmed) return;

    onResetBacktestAccount(resetBalanceValue);
  };
  const isDarkTheme = chartTheme?.mode === 'dark';
  const sectionBorderClass = isDarkTheme ? 'border-gray-800' : 'border-slate-200';
  const mutedTextClass = isDarkTheme ? 'text-gray-500' : 'text-slate-500';
  const labelTextClass = isDarkTheme ? 'text-gray-400' : 'text-slate-600';
  const valueTextClass = isDarkTheme ? 'text-white' : 'text-slate-900';
  const cardSurfaceClass = isDarkTheme
    ? 'border-gray-700 bg-black-table-color'
    : 'border-slate-200 bg-slate-50';
  const fieldClass = isDarkTheme
    ? 'border-gray-700 bg-black-table-color text-white placeholder:text-gray-500 focus:border-gray-500'
    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400';
  const invalidFieldClass = isDarkTheme
    ? 'border-red-500 bg-black-table-color text-white placeholder:text-gray-500'
    : 'border-red-500 bg-white text-slate-900 placeholder:text-slate-400';
  const neutralToggleClass = (active) => (
    active
      ? isDarkTheme
        ? 'bg-white text-skin-black'
        : 'bg-skin-black text-white'
      : isDarkTheme
        ? 'border border-gray-700 bg-black-table-color text-gray-200 hover:bg-skin-black-light hover:text-white'
        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
  );

  useEffect(() => {
    onBacktestOrderDraftChange?.({
      visible: activeGroup === 'backtest' && showOrderDraft,
      orderType,
      side: orderSide,
      entryPrice: orderEntryPrice,
      stopLoss: plannedStopLoss,
      takeProfit: plannedTakeProfit,
      effectiveEntryPrice,
      isPendingOrder,
      estimatedProfit: orderPlan?.estimatedProfit ?? null,
      estimatedLoss: orderPlan?.estimatedLoss ?? null,
      quoteCurrency,
    });
  }, [
    activeGroup,
    effectiveEntryPrice,
    isPendingOrder,
    onBacktestOrderDraftChange,
    orderEntryPrice,
    orderPlan?.estimatedLoss,
    orderPlan?.estimatedProfit,
    orderSide,
    orderStopLoss,
    orderTakeProfit,
    orderType,
    quoteCurrency,
    showOrderDraft,
  ]);

  return (
    <div
      className={`pointer-events-none flex items-start ${className}`}
      style={{ '--replay-panel-content-width': `${Math.max((Number(overlayWidth) || 0) - 164, 140)}px` }}
    >
      <div
        className="pointer-events-auto flex flex-col gap-2 rounded-lg border p-1.5 shadow-2xl backdrop-blur"
        style={getPanelStyle(chartTheme)}
      >
        <RailButton
          icon={Play}
          active={activeGroup === 'replay' || replayMode || isPlaying}
          title={replayMode ? 'Replay Controls' : 'Start Replay'}
          onClick={() => toggleGroup('replay')}
          chartTheme={chartTheme}
        />
        <RailButton
          icon={ActiveToolIcon}
          active={activeGroup === 'tools' || Boolean(tool)}
          title="Drawing Tools"
          onClick={() => toggleGroup('tools')}
          chartTheme={chartTheme}
        />
        <RailButton
          icon={Wallet}
          active={activeGroup === 'backtest'}
          title="Backtest Account"
          onClick={() => toggleGroup('backtest')}
          chartTheme={chartTheme}
        />
        <RailButton
          icon={Palette}
          active={activeGroup === 'tool-editor'}
          disabled={!hasToolEditor}
          title="Tool Style and Presets"
          onClick={() => toggleGroup('tool-editor')}
          chartTheme={chartTheme}
        />
        <div
          className={`h-1.5 w-full rounded-full ${
            drawingSaveStatus === 'saving'
              ? 'animate-pulse bg-amber-400'
              : drawingSaveStatus === 'local'
                ? 'bg-red-500'
                : 'bg-emerald-500'
          }`}
          title={
            drawingSaveStatus === 'saving'
              ? 'Saving drawings'
              : drawingSaveStatus === 'local'
                ? 'Saved on this device; server sync failed'
                : 'Drawings saved'
          }
          aria-label={
            drawingSaveStatus === 'saving'
              ? 'Saving drawings'
              : drawingSaveStatus === 'local'
                ? 'Drawings saved locally only'
                : 'Drawings saved'
          }
        />
      </div>

      {activeGroup === 'replay' && (
        <div className="pointer-events-auto">
          <Flyout title="Replay" icon={Play} onClose={() => setActiveGroup(null)} chartTheme={chartTheme}>
            {!replayMode && (
              <ControlButton icon={Crosshair} onClick={onToggleReplayPricePick} variant={isReplayPricePickActive ? 'warning' : 'primary'} className="w-full" chartTheme={chartTheme}>
                {isReplayPricePickActive ? 'Click Chart to Start' : 'Start Replay'}
              </ControlButton>
            )}

            <div className="grid grid-cols-3 gap-2">
              <ControlButton icon={SkipBack} onClick={onStepBackward} className="px-0" title="Back" chartTheme={chartTheme}>
                <span className="sr-only">Back</span>
              </ControlButton>
              <ControlButton
                icon={isPlaying ? Pause : Play}
                onClick={onTogglePlay}
                variant="primary"
                chartTheme={chartTheme}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </ControlButton>
              <ControlButton icon={SkipForward} onClick={onStepForward} className="px-0" title="Forward" chartTheme={chartTheme}>
                <span className="sr-only">Forward</span>
              </ControlButton>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ControlButton icon={RotateCcw} onClick={onResetReplay} variant="danger" chartTheme={chartTheme}>
                {replayMode ? 'Reset' : 'Go Latest'}
              </ControlButton>
              <ControlButton
                icon={LocateFixed}
                onClick={onFollowReplay}
                active={followReplay}
                variant={followReplay ? 'success' : 'neutral'}
                chartTheme={chartTheme}
              >
                {replayMode && followReplay ? 'Following' : 'Follow'}
              </ControlButton>
            </div>

            <ControlButton
              icon={Crosshair}
              onClick={onToggleReplayPricePick}
              active={isReplayPricePickActive}
              variant={isReplayPricePickActive ? 'warning' : 'neutral'}
              className="w-full"
              chartTheme={chartTheme}
            >
              {isReplayPricePickActive ? 'Pick Price' : 'Set Replay Price'}
            </ControlButton>

            <div className={`flex h-8 items-center justify-center rounded-md border px-2 text-xs ${isDarkTheme ? 'border-gray-700 bg-black-table-color text-gray-300' : 'border-slate-300 text-slate-600'}`}>
              {replayMode
                ? `Candle ${Math.min(replayIndex + 1, candleCount)} / ${candleCount}`
                : `Live candles ${candleCount}`}
            </div>

            <div className={`space-y-2 border-t pt-3 ${sectionBorderClass}`}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${labelTextClass}`}>
                <Gauge size={13} />
                <span>Speed</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PLAYBACK_SPEEDS.map((speed) => (
                  <ControlButton
                    key={speed.value}
                    onClick={() => onPlaybackSpeedChange(speed.value)}
                    active={playbackSpeed === speed.value}
                    className="h-7 px-2 text-[11px]"
                    chartTheme={chartTheme}
                  >
                    {speed.label}
                  </ControlButton>
                ))}
              </div>
            </div>
          </Flyout>
        </div>
      )}

      {activeGroup === 'tools' && (
        <div className="pointer-events-auto">
          <Flyout
            title="Tools"
            icon={MousePointer2}
            onClose={() => setActiveGroup(null)}
            bodyClassName="max-h-[min(78vh,720px)] space-y-3 overflow-y-auto pr-1"
            chartTheme={chartTheme}
          >
            <div className="space-y-3">
              {TOOL_GROUPS.map((group) => {
                const groupTools = group.tools
                  .map((toolType) => TOOL_BUTTONS.find((item) => item.type === toolType))
                  .filter(Boolean);

                return (
                  <div key={group.name} className={`space-y-2 rounded-md border p-2 ${isDarkTheme ? 'border-gray-700 bg-black-table-color' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`text-[10px] font-semibold uppercase tracking-wide ${mutedTextClass}`}>
                      {group.name}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {groupTools.map(({ type, label, icon }) => (
                        <ControlButton
                          key={type}
                          icon={icon}
                          onClick={() => handleToolChange(type)}
                          active={tool === type}
                          chartTheme={chartTheme}
                        >
                          {label}
                        </ControlButton>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`border-t pt-3 ${sectionBorderClass}`}>
              <ControlButton
                icon={Trash2}
                onClick={onClearDrawings}
                disabled={!drawings.length}
                variant="danger"
                className="w-full"
                chartTheme={chartTheme}
              >
                Clear
              </ControlButton>
            </div>
          </Flyout>
        </div>
      )}

      {activeGroup === 'backtest' && (
        <div className="pointer-events-auto">
          <Flyout
            title="Backtest Account"
            icon={Wallet}
            onClose={() => setActiveGroup(null)}
            bodyClassName="max-h-[min(78vh,720px)] space-y-3 overflow-y-auto pr-1"
            chartTheme={chartTheme}
          >
            <div className={`rounded-md border p-2 ${cardSurfaceClass}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className={`text-[10px] uppercase tracking-wide ${mutedTextClass}`}>Session</div>
                  <div className={`truncate text-xs font-semibold ${valueTextClass}`}>
                    {backtestAccount?.activeSession?.name ?? 'No active session'}
                  </div>
                  {backtestAccount?.activeSession && (
                    <div className={`mt-0.5 text-[11px] ${mutedTextClass}`}>
                      {backtestAccount.activeSession.symbol} {backtestAccount.activeSession.timeframe}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <ControlButton
                    onClick={onStartBacktestSession}
                    disabled={isBacktestLoading}
                    className="h-7 px-2 text-[11px]"
                    chartTheme={chartTheme}
                  >
                    New
                  </ControlButton>
                  <ControlButton
                    onClick={onEndBacktestSession}
                    disabled={isBacktestLoading || !backtestAccount?.activeSession}
                    variant="primary"
                    className="h-7 px-2 text-[11px]"
                    chartTheme={chartTheme}
                  >
                    End
                  </ControlButton>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={`mb-1 block text-[10px] uppercase tracking-wide ${mutedTextClass}`}>
                  Currency
                </span>
                <select
                  value={displayCurrency}
                  onChange={(event) => handleDisplayCurrencyChange(event.target.value)}
                  className={`h-8 w-full rounded border px-2 text-xs outline-none ${fieldClass}`}
                >
                  <option value="USDT">{quoteCurrency}</option>
                  <option value="PHP">PHP</option>
                </select>
              </label>
              <label className="block">
                <span className={`mb-1 block text-[10px] uppercase tracking-wide ${mutedTextClass}`}>
                  PHP / {quoteCurrency}
                </span>
                <input
                  value={phpRate}
                  onChange={(event) => setPhpRate(event.target.value)}
                  inputMode="decimal"
                  disabled={displayCurrency !== 'PHP'}
                  className={`h-8 w-full rounded border px-2 text-xs outline-none disabled:opacity-40 ${fieldClass}`}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-md border p-2 ${cardSurfaceClass}`}>
                <div className={`text-[10px] uppercase tracking-wide ${mutedTextClass}`}>Equity</div>
                <div className={`text-sm font-semibold ${valueTextClass}`}>
                  {formatAccountMoney(backtestMetrics.equity)}
                </div>
              </div>
              <div className={`rounded-md border p-2 ${cardSurfaceClass}`}>
                <div className={`text-[10px] uppercase tracking-wide ${mutedTextClass}`}>Cash</div>
                <div className={`text-sm font-semibold ${valueTextClass}`}>
                  {formatAccountMoney(backtestMetrics.cashBalance)}
                </div>
              </div>
              <div className={`rounded-md border p-2 ${cardSurfaceClass}`}>
                <div className={`text-[10px] uppercase tracking-wide ${mutedTextClass}`}>Open PnL</div>
                <div className={`text-sm font-semibold ${backtestMetrics.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatAccountMoney(backtestMetrics.unrealizedPnl)}
                </div>
              </div>
              <div className={`rounded-md border p-2 ${cardSurfaceClass}`}>
                <div className={`text-[10px] uppercase tracking-wide ${mutedTextClass}`}>Price</div>
                <div className={`text-sm font-semibold ${valueTextClass}`}>
                  {formatMoney(executionPrice)}
                </div>
              </div>
            </div>

            {backtestError && (
              <div className="rounded-md border border-red-900 bg-red-950/60 px-2 py-1.5 text-[11px] text-red-200">
                {backtestError}
              </div>
            )}

            <div className={`space-y-2 border-t pt-3 ${sectionBorderClass}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${labelTextClass}`}>Enter Position</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('market')}
                  className={`h-8 rounded-md text-xs font-semibold ${neutralToggleClass(orderType === 'market')}`}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('limit')}
                  className={`h-8 rounded-md text-xs font-semibold ${neutralToggleClass(orderType === 'limit')}`}
                >
                  Limit
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('trigger')}
                  className={`h-8 rounded-md text-xs font-semibold ${neutralToggleClass(orderType === 'trigger')}`}
                >
                  Trigger
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderSide('long')}
                  className={`h-8 rounded-md text-xs font-semibold ${
                    orderSide === 'long' ? 'bg-emerald-600 text-white' : neutralToggleClass(false)
                  }`}
                >
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSide('short')}
                  className={`h-8 rounded-md text-xs font-semibold ${
                    orderSide === 'short' ? 'bg-red-600 text-white' : neutralToggleClass(false)
                  }`}
                >
                  Short
                </button>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_72px_auto] gap-2">
                <input
                  value={orderNotional}
                  onChange={(event) => setOrderNotional(event.target.value)}
                  inputMode="decimal"
                  className={`h-8 min-w-0 rounded border px-2 text-xs outline-none ${fieldClass}`}
                  placeholder={`${displayCurrency} margin`}
                />
                <input
                  value={orderLeverage}
                  onChange={(event) => setOrderLeverage(event.target.value)}
                  inputMode="decimal"
                  className={`h-8 min-w-0 rounded border px-2 text-xs outline-none ${
                    isLeverageValid ? fieldClass : invalidFieldClass
                  }`}
                  placeholder="Lev"
                  title="Leverage, 1x to 125x"
                />
                <ControlButton
                  icon={orderSide === 'long' ? TrendingUp : TrendingDown}
                  onClick={submitBacktestOrder}
                  disabled={!canSubmitOrder}
                  variant={orderSide === 'long' ? 'success' : 'danger'}
                  chartTheme={chartTheme}
                >
                  {isPendingOrder ? 'Place' : 'Enter'}
                </ControlButton>
              </div>
              <div className={`grid grid-cols-3 gap-2 text-[11px] ${labelTextClass}`}>
                <span>Margin {orderPlan?.margin ? formatAccountMoney(orderPlan.margin) : '---'}</span>
                <span>Value {orderPlan?.positionNotional ? formatAccountMoney(orderPlan.positionNotional) : '---'}</span>
                <span>Lev {isLeverageValid ? formatLeverage(leverageValue) : '---'}</span>
              </div>
              <div className={`grid grid-cols-2 gap-2 text-[11px] ${labelTextClass}`}>
                <span>Entry fee {orderPlan?.entryFee ? formatAccountMoney(orderPlan.entryFee) : '---'}</span>
                <span>Need {orderPlan?.requiredCash ? formatAccountMoney(orderPlan.requiredCash) : '---'}</span>
              </div>
              {orderPlan?.adjustedForFee && (
                <div className="rounded-md border border-amber-900 bg-amber-950/50 px-2 py-1 text-[11px] text-amber-200">
                  Margin adjusted to include entry fee in available cash.
                </div>
              )}
              {orderPlan && orderPlan.requiredCash > backtestMetrics.cashBalance && (
                <div className="rounded-md border border-red-900 bg-red-950/60 px-2 py-1 text-[11px] text-red-200">
                  Reduce margin to {formatAccountMoney(getMaxMarginForCash(backtestMetrics.cashBalance, leverageValue, feeRate))} or less.
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className={`mb-1 block text-[10px] uppercase tracking-wide ${mutedTextClass}`}>
                    {isPendingOrder ? 'Price' : 'Entry'}
                  </span>
                  <input
                    value={orderEntryPrice}
                    onChange={(event) => setOrderEntryPrice(event.target.value)}
                    inputMode="decimal"
                    className={`h-8 w-full rounded border px-2 text-xs outline-none ${fieldClass}`}
                    placeholder={isPendingOrder ? 'Required' : formatMoney(executionPrice)}
                  />
                </label>
                <label className="block">
                  <span className={`mb-1 block text-[10px] uppercase tracking-wide ${mutedTextClass}`}>
                    SL
                  </span>
                  <input
                    value={orderStopLoss}
                    onChange={(event) => setOrderStopLoss(event.target.value)}
                    inputMode="decimal"
                    className={`h-8 w-full rounded border px-2 text-xs outline-none ${
                      orderPlan?.isStopValid === false ? invalidFieldClass : fieldClass
                    }`}
                    placeholder="Stop"
                  />
                </label>
                <label className="block">
                  <span className={`mb-1 block text-[10px] uppercase tracking-wide ${mutedTextClass}`}>
                    TP
                  </span>
                  <input
                    value={orderTakeProfit}
                    onChange={(event) => setOrderTakeProfit(event.target.value)}
                    inputMode="decimal"
                    className={`h-8 w-full rounded border px-2 text-xs outline-none ${
                      orderPlan?.isTargetValid === false ? invalidFieldClass : fieldClass
                    }`}
                    placeholder="Target"
                  />
                </label>
              </div>
              <div className={`grid grid-cols-3 gap-2 text-[11px] ${labelTextClass}`}>
                <span>Risk {orderPlan?.riskAmount ? formatAccountMoney(orderPlan.riskAmount) : '---'}</span>
                <span>Reward {orderPlan?.rewardAmount ? formatAccountMoney(orderPlan.rewardAmount) : '---'}</span>
                <span>R/R {orderPlan?.rr ? orderPlan.rr.toFixed(2) : '---'}</span>
              </div>
              <div className={`grid grid-cols-2 gap-2 text-[11px] ${labelTextClass}`}>
                <span className={orderPlan?.estimatedProfit != null ? (orderPlan.estimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400') : undefined}>
                  Est profit {orderPlan?.estimatedProfit != null ? formatAccountMoney(orderPlan.estimatedProfit) : '---'}
                </span>
                <span className={orderPlan?.estimatedLoss != null ? 'text-red-400' : undefined}>
                  Est loss {orderPlan?.estimatedLoss != null ? formatAccountMoney(orderPlan.estimatedLoss) : '---'}
                </span>
              </div>
              {showOrderDraft && (
                <ControlButton icon={X} onClick={removeOrderDraft} variant="danger" className="w-full" chartTheme={chartTheme}>
                  Remove Entry / SL / TP Plan
                </ControlButton>
              )}
            </div>

            <div className={`space-y-2 border-t pt-3 ${sectionBorderClass}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${labelTextClass}`}>Pending Entries</div>
              <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                {backtestAccount?.pendingPositions?.length ? (
                  backtestAccount.pendingPositions.map((position) => (
                    <div key={position.id} className={`rounded-md border p-2 ${cardSurfaceClass}`}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${valueTextClass}`}>
                          {position.symbol} {position.side.toUpperCase()}
                        </span>
                        <span className="text-xs text-amber-300">Waiting</span>
                      </div>
                      <div className={`mb-2 grid grid-cols-2 gap-1 text-[11px] ${labelTextClass}`}>
                        <span>Trigger {formatMoney(position.entryPrice)}</span>
                        <span>Margin {formatAccountMoney(position.margin)}</span>
                        <span>Value {formatAccountMoney(position.notional ?? Number(position.margin) * Number(position.leverage ?? 1))}</span>
                        <span>Lev {formatLeverage(position.leverage)}</span>
                        <span>SL {position.stopLoss ? formatMoney(position.stopLoss) : '---'}</span>
                        <span>TP {position.takeProfit ? formatMoney(position.takeProfit) : '---'}</span>
                      </div>
                      <ControlButton
                        icon={X}
                        onClick={() => onCancelBacktestPosition(position.id)}
                        disabled={isBacktestLoading}
                        variant="primary"
                        className="w-full"
                        chartTheme={chartTheme}
                      >
                        Cancel
                      </ControlButton>
                    </div>
                  ))
                ) : (
                  <span className={`text-[11px] ${mutedTextClass}`}>No pending entries</span>
                )}
              </div>
            </div>

            <div className={`space-y-2 border-t pt-3 ${sectionBorderClass}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${labelTextClass}`}>Open Positions</div>
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {backtestAccount?.openPositions?.length ? (
                  backtestAccount.openPositions.map((position) => {
                    const livePnl = getBacktestMetrics({
                      cashBalance: 0,
                      openPositions: [position],
                    }, symbol, executionPrice).unrealizedPnl;

                    return (
                      <div key={position.id} className={`rounded-md border p-2 ${cardSurfaceClass}`}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className={`text-xs font-semibold ${valueTextClass}`}>
                            {position.symbol} {position.side.toUpperCase()}
                          </span>
                          <span className={livePnl >= 0 ? 'text-xs text-emerald-400' : 'text-xs text-red-400'}>
                            {formatAccountMoney(livePnl)}
                          </span>
                        </div>
                        <div className={`mb-2 grid grid-cols-2 gap-1 text-[11px] ${labelTextClass}`}>
                          <span>Entry {formatMoney(position.entryPrice)}</span>
                          <span>Margin {formatAccountMoney(position.margin)}</span>
                          <span>Value {formatAccountMoney(position.notional ?? Number(position.margin) * Number(position.leverage ?? 1))}</span>
                          <span>Lev {formatLeverage(position.leverage)}</span>
                          <span>SL {position.stopLoss ? formatMoney(position.stopLoss) : '---'}</span>
                          <span>TP {position.takeProfit ? formatMoney(position.takeProfit) : '---'}</span>
                        </div>
                        <ControlButton
                          icon={X}
                          onClick={() => onCloseBacktestPosition(position.id)}
                          disabled={!canTrade}
                          variant="primary"
                          className="w-full"
                          chartTheme={chartTheme}
                        >
                          Close
                        </ControlButton>
                      </div>
                    );
                  })
                ) : (
                  <span className={`text-[11px] ${mutedTextClass}`}>No open positions</span>
                )}
              </div>
            </div>

            <div className={`space-y-2 border-t pt-3 ${sectionBorderClass}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${labelTextClass}`}>Account Reset</div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  value={resetBalance}
                  onChange={(event) => setResetBalance(event.target.value)}
                  inputMode="decimal"
                  className={`h-8 min-w-0 rounded border px-2 text-xs outline-none ${
                    resetBalance && !canResetAccount ? invalidFieldClass : fieldClass
                  }`}
                  placeholder={`${displayCurrency} balance`}
                />
                <ControlButton
                  icon={RotateCcw}
                  onClick={submitAccountReset}
                  disabled={!canResetAccount}
                  variant="danger"
                  chartTheme={chartTheme}
                >
                  Reset
                </ControlButton>
              </div>
              <div className={`text-[11px] ${mutedTextClass}`}>
                Clears positions and trades, then sets starting cash.
              </div>
            </div>

            <div className={`space-y-2 border-t pt-3 ${sectionBorderClass}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${labelTextClass}`}>Recent Trades</div>
              <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                {backtestAccount?.trades?.length ? (
                  backtestAccount.trades.slice(0, 8).map((trade) => (
                    <div key={trade.id} className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-[11px] ${isDarkTheme ? 'bg-black-table-color' : 'bg-slate-50'}`}>
                      <span className={`truncate ${isDarkTheme ? 'text-gray-300' : 'text-slate-700'}`}>
                        {trade.action.toUpperCase()} {trade.side.toUpperCase()} {trade.symbol}
                      </span>
                      <span className={Number(trade.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {trade.pnl == null ? formatAccountMoney(trade.notional) : formatAccountMoney(trade.pnl)}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className={`text-[11px] ${mutedTextClass}`}>No trades yet</span>
                )}
              </div>
            </div>
          </Flyout>
        </div>
      )}

      {activeGroup === 'tool-editor' && hasToolEditor && (
        <TopToolEditorBar
          editorLabel={editorLabel}
          editorType={editorType}
          activeColor={activeColor}
          activeStrokeWidth={activeStrokeWidth}
          activeLineStyle={activeLineStyle}
          activeLabelText={activeLabelText}
          activeText={activeText}
          activeTextBold={activeTextBold}
          activeTextItalic={activeTextItalic}
          activeLabelVertical={activeLabelVertical}
          activeLabelHorizontal={activeLabelHorizontal}
          canEditWidth={canEditWidth}
          canEditLineStyle={canEditLineStyle}
          canEditLabel={canEditLabel}
          canEditText={canEditText}
          canUsePresets={canUsePresets}
          presetItems={presetItems}
          presetNameDraft={presetNameDraft}
          setPresetNameDraft={setPresetNameDraft}
          selectedDrawing={selectedDrawing}
          openMenu={activeEditorMenu}
          setOpenMenu={setActiveEditorMenu}
          onDrawingColorChange={onDrawingColorChange}
          onDrawingWidthChange={onDrawingWidthChange}
          onDrawingLineStyleChange={onDrawingLineStyleChange}
          onDrawingLabelChange={onDrawingLabelChange}
          onApplyToolPreset={onApplyToolPreset}
          onDeleteToolPreset={onDeleteToolPreset}
          onDuplicateSelectedDrawing={onDuplicateSelectedDrawing}
          onDeleteSelectedDrawing={onDeleteSelectedDrawing}
          onSavePreset={handleSavePreset}
          chartTheme={chartTheme}
          availableWidth={Math.max((Number(overlayWidth) || 0) - 164, 140)}
        />
      )}

      {activeGroup === 'tool-editor' && !hasToolEditor && (
        <div className="pointer-events-auto">
          <Flyout title="Tool Editor" icon={Palette} onClose={() => setActiveGroup(null)} chartTheme={chartTheme}>
            <span className="text-[11px] text-gray-500">
              Select a drawing or choose a tool to edit its style and presets.
            </span>
          </Flyout>
        </div>
      )}
    </div>
  );
}
