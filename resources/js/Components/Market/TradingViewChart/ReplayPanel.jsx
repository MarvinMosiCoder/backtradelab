import React, { useEffect, useMemo, useState } from 'react';
import {
  BoxSelect,
  ChartNoAxesCombined,
  Crosshair,
  Gauge,
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

function Flyout({ title, icon: Icon, onClose, children, bodyClassName = 'space-y-3' }) {
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
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

const TOOL_BUTTONS = [
  { type: 'line', label: 'Line', icon: Slash },
  { type: 'horizontal-ray', label: 'H Ray', icon: MoveRight },
  { type: 'long-position', label: 'Long', icon: TrendingUp },
  { type: 'short-position', label: 'Short', icon: TrendingDown },
  { type: 'forecast', label: 'Forecast', icon: ChartNoAxesCombined },
  { type: 'rect', label: 'Box', icon: BoxSelect },
  { type: 'text', label: 'Text', icon: Type },
];

const TOOL_LABELS = TOOL_BUTTONS.reduce((labels, toolButton) => ({
  ...labels,
  [toolButton.type]: toolButton.label,
}), {});

const WIDTH_TOOL_TYPES = ['line', 'horizontal-ray', 'rect', 'long-position', 'short-position', 'forecast'];
const LABEL_TOOL_TYPES = ['line', 'horizontal-ray', 'forecast', 'measure', 'rect'];
const PRESET_TOOL_TYPES = ['line', 'horizontal-ray', 'forecast', 'measure', 'rect', 'text'];

function getToolLabel(type) {
  return TOOL_LABELS[type] ?? (
    type
      ? type.charAt(0).toUpperCase() + type.slice(1)
      : ''
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
    rr: riskAmount && rewardAmount ? rewardAmount / riskAmount : null,
    isStopValid: riskPerUnit == null || riskPerUnit > 0,
    isTargetValid: rewardPerUnit == null || rewardPerUnit > 0,
  };
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
  symbol,
  executionPrice,
  backtestAccount,
  backtestError,
  isBacktestLoading,
  onOpenBacktestPosition,
  onCloseBacktestPosition,
  onCancelBacktestPosition,
  onResetBacktestAccount,
  className = '',
}) {
  const [activeGroup, setActiveGroup] = useState(null);
  const [presetNameDraft, setPresetNameDraft] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [orderSide, setOrderSide] = useState('long');
  const [orderNotional, setOrderNotional] = useState('1000');
  const [orderLeverage, setOrderLeverage] = useState('1');
  const [orderEntryPrice, setOrderEntryPrice] = useState('');
  const [orderStopLoss, setOrderStopLoss] = useState('');
  const [orderTakeProfit, setOrderTakeProfit] = useState('');
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
  const activeLabelText = selectedDrawing?.labelText ?? editorSettings.labelText ?? '';
  const activeText = selectedDrawing?.text ?? activeLabelText;
  const activeLabelVertical = selectedDrawing?.labelVertical ?? editorSettings.labelVertical ?? 'top';
  const activeLabelHorizontal = selectedDrawing?.labelHorizontal ?? editorSettings.labelHorizontal ?? 'center';
  const canEditWidth = WIDTH_TOOL_TYPES.includes(editorType);
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

  const toggleGroup = (group) => {
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
  const isConditionalOrder = orderType === 'conditional';
  const effectiveEntryPrice = hasCustomEntryPrice ? customEntryPrice : currentExecutionPrice;
  const quoteNotional = displayToQuoteAmount(orderNotional, displayCurrency, normalizedPhpRate);
  const leverageValue = Number(orderLeverage);
  const isLeverageValid = Number.isFinite(leverageValue) && leverageValue >= 1 && leverageValue <= 125;
  const feeRate = Number(backtestAccount?.feeRate ?? 0.0004);
  const orderPlan = getOrderPlan({
    side: orderSide,
    entryPrice: effectiveEntryPrice,
    stopLoss: orderStopLoss,
    takeProfit: orderTakeProfit,
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
    (!isConditionalOrder || hasCustomEntryPrice) &&
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
      stopLoss: getPositiveNumber(orderStopLoss),
      takeProfit: getPositiveNumber(orderTakeProfit),
    });
  };

  return (
    <div className={`pointer-events-none flex items-start ${className}`}>
      <div className="pointer-events-auto flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur">
        <RailButton
          icon={Play}
          active={activeGroup === 'replay' || replayMode || isPlaying}
          title={replayMode ? 'Replay Controls' : 'Start Replay'}
          onClick={() => toggleGroup('replay')}
        />
        <RailButton
          icon={ActiveToolIcon}
          active={activeGroup === 'tools' || Boolean(tool)}
          title="Drawing Tools"
          onClick={() => toggleGroup('tools')}
        />
        <RailButton
          icon={Wallet}
          active={activeGroup === 'backtest'}
          title="Backtest Account"
          onClick={() => toggleGroup('backtest')}
        />
        <RailButton
          icon={Palette}
          active={activeGroup === 'tool-editor'}
          disabled={!hasToolEditor}
          title="Tool Style and Presets"
          onClick={() => toggleGroup('tool-editor')}
        />
      </div>

      {activeGroup === 'replay' && (
        <div className="pointer-events-auto">
          <Flyout title="Replay" icon={Play} onClose={() => setActiveGroup(null)}>
            {!replayMode && (
              <ControlButton icon={Play} onClick={onTogglePlay} variant="primary" className="w-full">
                Start Replay
              </ControlButton>
            )}

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
                {replayMode ? 'Reset' : 'Go Latest'}
              </ControlButton>
              <ControlButton
                icon={LocateFixed}
                onClick={onFollowReplay}
                active={followReplay}
                variant={followReplay ? 'success' : 'neutral'}
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
            >
              {isReplayPricePickActive ? 'Pick Price' : 'Set Replay Price'}
            </ControlButton>

            <div className="flex h-8 items-center justify-center rounded-md border border-gray-700 px-2 text-xs text-gray-300">
              {replayMode
                ? `Candle ${Math.min(replayIndex + 1, candleCount)} / ${candleCount}`
                : `Live candles ${candleCount}`}
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
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

      {activeGroup === 'backtest' && (
        <div className="pointer-events-auto">
          <Flyout
            title="Backtest Account"
            icon={Wallet}
            onClose={() => setActiveGroup(null)}
            bodyClassName="max-h-[min(78vh,720px)] space-y-3 overflow-y-auto pr-1"
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                  Currency
                </span>
                <select
                  value={displayCurrency}
                  onChange={(event) => handleDisplayCurrencyChange(event.target.value)}
                  className="h-8 w-full rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none"
                >
                  <option value="USDT">{quoteCurrency}</option>
                  <option value="PHP">PHP</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                  PHP / {quoteCurrency}
                </span>
                <input
                  value={phpRate}
                  onChange={(event) => setPhpRate(event.target.value)}
                  inputMode="decimal"
                  disabled={displayCurrency !== 'PHP'}
                  className="h-8 w-full rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none disabled:opacity-40"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-slate-800 bg-slate-900 p-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-500">Equity</div>
                <div className="text-sm font-semibold text-white">
                  {formatAccountMoney(backtestMetrics.equity)}
                </div>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-900 p-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-500">Cash</div>
                <div className="text-sm font-semibold text-white">
                  {formatAccountMoney(backtestMetrics.cashBalance)}
                </div>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-900 p-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-500">Open PnL</div>
                <div className={`text-sm font-semibold ${backtestMetrics.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatAccountMoney(backtestMetrics.unrealizedPnl)}
                </div>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-900 p-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-500">Price</div>
                <div className="text-sm font-semibold text-white">
                  {formatMoney(executionPrice)}
                </div>
              </div>
            </div>

            {backtestError && (
              <div className="rounded-md border border-red-900 bg-red-950/60 px-2 py-1.5 text-[11px] text-red-200">
                {backtestError}
              </div>
            )}

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Enter Position</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('market')}
                  className={`h-8 rounded-md text-xs font-semibold text-white ${
                    orderType === 'market' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('conditional')}
                  className={`h-8 rounded-md text-xs font-semibold text-white ${
                    isConditionalOrder ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Conditional
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderSide('long')}
                  className={`h-8 rounded-md text-xs font-semibold text-white ${
                    orderSide === 'long' ? 'bg-emerald-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSide('short')}
                  className={`h-8 rounded-md text-xs font-semibold text-white ${
                    orderSide === 'short' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
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
                  className="h-8 min-w-0 rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none"
                  placeholder={`${displayCurrency} margin`}
                />
                <input
                  value={orderLeverage}
                  onChange={(event) => setOrderLeverage(event.target.value)}
                  inputMode="decimal"
                  className={`h-8 min-w-0 rounded border bg-slate-900 px-2 text-xs text-white outline-none placeholder:text-gray-500 ${
                    isLeverageValid ? 'border-slate-600' : 'border-red-500'
                  }`}
                  placeholder="Lev"
                  title="Leverage, 1x to 125x"
                />
                <ControlButton
                  icon={orderSide === 'long' ? TrendingUp : TrendingDown}
                  onClick={submitBacktestOrder}
                  disabled={!canSubmitOrder}
                  variant={orderSide === 'long' ? 'success' : 'danger'}
                >
                  {isConditionalOrder ? 'Place' : 'Enter'}
                </ControlButton>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-400">
                <span>Margin {orderPlan?.margin ? formatAccountMoney(orderPlan.margin) : '---'}</span>
                <span>Value {orderPlan?.positionNotional ? formatAccountMoney(orderPlan.positionNotional) : '---'}</span>
                <span>Lev {isLeverageValid ? formatLeverage(leverageValue) : '---'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                <span>Entry fee {orderPlan?.entryFee ? formatAccountMoney(orderPlan.entryFee) : '---'}</span>
                <span>Need {orderPlan?.requiredCash ? formatAccountMoney(orderPlan.requiredCash) : '---'}</span>
              </div>
              {orderPlan?.adjustedForFee && (
                <div className="rounded-md border border-amber-900 bg-amber-950/50 px-2 py-1 text-[11px] text-amber-200">
                  Margin adjusted to include entry fee in available cash.
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                    {isConditionalOrder ? 'Trigger' : 'Entry'}
                  </span>
                  <input
                    value={orderEntryPrice}
                    onChange={(event) => setOrderEntryPrice(event.target.value)}
                    inputMode="decimal"
                    className="h-8 w-full rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none placeholder:text-gray-500"
                    placeholder={isConditionalOrder ? 'Required' : formatMoney(executionPrice)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                    SL
                  </span>
                  <input
                    value={orderStopLoss}
                    onChange={(event) => setOrderStopLoss(event.target.value)}
                    inputMode="decimal"
                    className={`h-8 w-full rounded border bg-slate-900 px-2 text-xs text-white outline-none placeholder:text-gray-500 ${
                      orderPlan?.isStopValid === false ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="Stop"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                    TP
                  </span>
                  <input
                    value={orderTakeProfit}
                    onChange={(event) => setOrderTakeProfit(event.target.value)}
                    inputMode="decimal"
                    className={`h-8 w-full rounded border bg-slate-900 px-2 text-xs text-white outline-none placeholder:text-gray-500 ${
                      orderPlan?.isTargetValid === false ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="Target"
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-400">
                <span>Risk {orderPlan?.riskAmount ? formatAccountMoney(orderPlan.riskAmount) : '---'}</span>
                <span>Reward {orderPlan?.rewardAmount ? formatAccountMoney(orderPlan.rewardAmount) : '---'}</span>
                <span>R/R {orderPlan?.rr ? orderPlan.rr.toFixed(2) : '---'}</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pending Entries</div>
              <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                {backtestAccount?.pendingPositions?.length ? (
                  backtestAccount.pendingPositions.map((position) => (
                    <div key={position.id} className="rounded-md border border-slate-800 bg-slate-900 p-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">
                          {position.symbol} {position.side.toUpperCase()}
                        </span>
                        <span className="text-xs text-amber-300">Waiting</span>
                      </div>
                      <div className="mb-2 grid grid-cols-2 gap-1 text-[11px] text-gray-400">
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
                        variant="warning"
                        className="w-full"
                      >
                        Cancel
                      </ControlButton>
                    </div>
                  ))
                ) : (
                  <span className="text-[11px] text-gray-500">No pending entries</span>
                )}
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Open Positions</div>
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {backtestAccount?.openPositions?.length ? (
                  backtestAccount.openPositions.map((position) => {
                    const livePnl = getBacktestMetrics({
                      cashBalance: 0,
                      openPositions: [position],
                    }, symbol, executionPrice).unrealizedPnl;

                    return (
                      <div key={position.id} className="rounded-md border border-slate-800 bg-slate-900 p-2">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">
                            {position.symbol} {position.side.toUpperCase()}
                          </span>
                          <span className={livePnl >= 0 ? 'text-xs text-emerald-400' : 'text-xs text-red-400'}>
                            {formatAccountMoney(livePnl)}
                          </span>
                        </div>
                        <div className="mb-2 grid grid-cols-2 gap-1 text-[11px] text-gray-400">
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
                          variant="warning"
                          className="w-full"
                        >
                          Close
                        </ControlButton>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-[11px] text-gray-500">No open positions</span>
                )}
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recent Trades</div>
                <button
                  type="button"
                  onClick={onResetBacktestAccount}
                  disabled={isBacktestLoading}
                  className="text-[11px] font-semibold text-red-300 hover:text-red-200 disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
              <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                {backtestAccount?.trades?.length ? (
                  backtestAccount.trades.slice(0, 8).map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between gap-2 rounded bg-slate-900 px-2 py-1 text-[11px]">
                      <span className="truncate text-gray-300">
                        {trade.action.toUpperCase()} {trade.side.toUpperCase()} {trade.symbol}
                      </span>
                      <span className={Number(trade.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {trade.pnl == null ? formatAccountMoney(trade.notional) : formatAccountMoney(trade.pnl)}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-[11px] text-gray-500">No trades yet</span>
                )}
              </div>
            </div>
          </Flyout>
        </div>
      )}

      {activeGroup === 'tool-editor' && hasToolEditor && (
        <div className="pointer-events-auto">
          <Flyout title={`${editorLabel} Editor`} icon={Palette} onClose={() => setActiveGroup(null)}>
            <div className="grid grid-cols-7 gap-1.5">
              {DRAWING_COLORS.map((color) => {
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

            {canEditWidth && (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Width</div>
                <div className="grid grid-cols-6 gap-2">
                  {DRAWING_WIDTHS.map((width) => (
                    <button
                      key={width}
                      type="button"
                      onClick={() => onDrawingWidthChange(width)}
                      className={`flex h-7 items-center justify-center rounded border text-[11px] text-white ${
                        activeStrokeWidth === width
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

            {canEditLabel && (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Label</div>
                <input
                  value={activeLabelText}
                  onChange={(event) => onDrawingLabelChange({ labelText: event.target.value })}
                  placeholder={editorType === 'rect' ? 'Box text' : 'Line text'}
                  className="h-8 w-full rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none placeholder:text-gray-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={activeLabelVertical}
                    onChange={(event) => onDrawingLabelChange({ labelVertical: event.target.value })}
                    className="h-8 rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none"
                    title="Vertical label position"
                  >
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                  <select
                    value={activeLabelHorizontal}
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

            {canEditText && (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Text</div>
                <input
                  value={activeText}
                  onChange={(event) => onDrawingLabelChange({
                    text: event.target.value,
                    labelText: event.target.value,
                  })}
                  placeholder="Text note"
                  className="h-8 w-full rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none placeholder:text-gray-500"
                />
              </div>
            )}

            {canUsePresets && (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Presets</div>
                <div className="flex flex-wrap gap-2">
                  {presetItems.map((preset) => (
                    <ControlButton
                      key={preset.id ?? preset.name}
                      icon={MousePointer2}
                      onClick={() => onApplyToolPreset(editorType, preset)}
                      title={`Use ${preset.name}`}
                      className="max-w-full"
                    >
                      {preset.name}
                    </ControlButton>
                  ))}

                  {!presetItems.length && (
                    <span className="text-[11px] text-gray-500">No saved presets</span>
                  )}
                </div>
              </div>
            )}

            {selectedDrawing && canUsePresets && (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Save Preset</div>
                <input
                  value={presetNameDraft}
                  onChange={(event) => setPresetNameDraft(event.target.value)}
                  placeholder={`${editorLabel} preset name`}
                  className="h-8 w-full rounded border border-slate-600 bg-slate-900 px-2 text-xs text-white outline-none placeholder:text-gray-500"
                />
                <ControlButton
                  icon={Save}
                  onClick={handleSavePreset}
                  variant="success"
                  disabled={!presetNameDraft.trim()}
                  className="w-full"
                >
                  Save Preset
                </ControlButton>
              </div>
            )}

            {!canEditWidth && !canEditLabel && !canEditText && !canUsePresets && (
              <span className="text-[11px] text-gray-500">
                Select or draw a supported tool to edit its style.
              </span>
            )}
          </Flyout>
        </div>
      )}

      {activeGroup === 'tool-editor' && !hasToolEditor && (
        <div className="pointer-events-auto">
          <Flyout title="Tool Editor" icon={Palette} onClose={() => setActiveGroup(null)}>
            <span className="text-[11px] text-gray-500">
              Select a drawing or choose a tool to edit its style and presets.
            </span>
          </Flyout>
        </div>
      )}
    </div>
  );
}
