import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Save, X } from 'lucide-react';
import getAppLogo from '../../SystemSettings/ApplicationLogo';
import { CHART_HEIGHT, DRAWING_COLOR, DRAWING_FILL } from './constants';
import {
  colorToRgba,
  isHorizontalRayDrawing,
  isLineLikeDrawing,
  isPositionDrawing,
  normalizeVisibleRect,
} from './utils';

function formatSignedNumber(value, digits = 2) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(digits)}`;
}

function formatPriceLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '---';

  return number.toLocaleString(undefined, {
    minimumFractionDigits: number >= 100 ? 2 : 4,
    maximumFractionDigits: number >= 100 ? 2 : 6,
  });
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(Math.round(Math.abs(seconds)), 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return `${totalSeconds}s`;
}

const FIB_RETRACEMENT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_EXTENSION_LEVELS = [
  0,
  0.236,
  0.382,
  0.5,
  0.618,
  0.786,
  1,
  1.272,
  1.414,
  1.618,
  2,
  2.272,
  2.414,
  2.618,
  3.618,
  4.236,
];

const FIB_LEVEL_COLORS = {
  0: '#787b86',
  0.236: '#f23645',
  0.382: '#ff9800',
  0.5: '#ffeb3b',
  0.618: '#4caf50',
  0.786: '#089981',
  1: '#2196f3',
  1.272: '#2962ff',
  1.414: '#673ab7',
  1.618: '#9c27b0',
  2: '#e91e63',
  2.272: '#ff5252',
  2.414: '#ff6d00',
  2.618: '#00bcd4',
  3.618: '#ab47bc',
  4.236: '#7e57c2',
};

function isFibonacciDrawing(drawing) {
  return ['fib-retracement', 'fib-extension'].includes(drawing?.type);
}

function formatFibLevel(level) {
  return Number.isInteger(level) ? String(level) : String(level);
}

function getFibonacciLevels(drawing, overlayWidth) {
  const levels = drawing.type === 'fib-extension'
    ? FIB_EXTENSION_LEVELS
    : FIB_RETRACEMENT_LEVELS;
  const { p1, p2, p3 } = drawing.screen;
  const anchor = drawing.type === 'fib-extension' ? (drawing.anchor ?? drawing.end) : drawing.start;
  const anchorPoint = drawing.type === 'fib-extension' ? (p3 ?? p2) : p1;
  const priceDelta = drawing.end.price - drawing.start.price;
  const yDelta = p2.y - p1.y;
  const leftX = Math.min(p1.x, p2.x, anchorPoint.x);
  const rightX = drawing.type === 'fib-extension'
    ? Math.max(anchorPoint.x, overlayWidth)
    : Math.max(p1.x, p2.x);

  return levels.map((level) => {
    const price = anchor.price + (priceDelta * level);

    return {
      level,
      price,
      y: anchorPoint.y + (yDelta * level),
      x1: leftX,
      x2: rightX,
      color: FIB_LEVEL_COLORS[level] ?? '#ffffff',
      label: `${formatFibLevel(level)} ${formatPriceLabel(price)}`,
    };
  });
}

function getToolLabel(drawing) {
  const priceDelta = drawing.end.price - drawing.start.price;
  const percentDelta = drawing.start.price
    ? (priceDelta / drawing.start.price) * 100
    : 0;
  const duration = formatDuration(drawing.end.time - drawing.start.time);
  const prefix = drawing.type === 'forecast' ? 'Forecast ' : 'Delta ';

  return `${prefix}${formatSignedNumber(priceDelta)} (${formatSignedNumber(percentDelta)}%) | ${duration}`;
}

function getPositionGeometry(drawing) {
  const { p1, p2, pStop } = drawing.screen;
  const isLong = drawing.type === 'long-position';
  const targetY = p2.y;
  const stopY = pStop.y;
  const left = Math.min(p1.x, p2.x, pStop.x);
  const right = Math.max(p1.x, p2.x, pStop.x);
  const width = Math.max(right - left, 2);
  const entryPrice = drawing.start.price;
  const targetPrice = drawing.end.price;
  const stopPrice = drawing.stop.price;
  const reward = Math.abs(targetPrice - entryPrice);
  const risk = Math.abs(entryPrice - stopPrice);
  const rewardPercent = entryPrice ? (reward / entryPrice) * 100 : 0;
  const riskPercent = entryPrice ? (risk / entryPrice) * 100 : 0;

  return {
    isLong,
    left,
    width,
    targetY,
    stopY,
    entryY: p1.y,
    profitRect: normalizeVisibleRect({ x: left, y: p1.y }, { x: right, y: targetY }),
    lossRect: normalizeVisibleRect({ x: left, y: p1.y }, { x: right, y: stopY }),
    targetPoint: { x: p2.x, y: targetY },
    stopPoint: { x: pStop.x, y: stopY },
    label: `${isLong ? 'Long' : 'Short'} R/R ${(reward / Math.max(risk, 0.0000001)).toFixed(2)} | Target ${formatSignedNumber(rewardPercent)}% | Stop -${riskPercent.toFixed(2)}% | ${formatDuration(drawing.end.time - drawing.start.time)}`,
    priceLabels: [
      {
        key: 'entry',
        label: formatPriceLabel(entryPrice),
        x: right,
        y: p1.y,
        color: '#e2e8f0',
      },
      {
        key: 'tp',
        label: formatPriceLabel(targetPrice),
        x: right,
        y: targetY,
        color: '#4ade80',
      },
      {
        key: 'sl',
        label: formatPriceLabel(stopPrice),
        x: right,
        y: stopY,
        color: '#f87171',
      },
    ],
  };
}

function getArrowHeadPoints(start, end, size = 10) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const left = {
    x: end.x - size * Math.cos(angle - Math.PI / 6),
    y: end.y - size * Math.sin(angle - Math.PI / 6),
  };
  const right = {
    x: end.x - size * Math.cos(angle + Math.PI / 6),
    y: end.y - size * Math.sin(angle + Math.PI / 6),
  };

  return `${end.x},${end.y} ${left.x},${left.y} ${right.x},${right.y}`;
}

function getLineLabelPosition(drawing) {
  const { p1, p2 } = drawing.screen;
  const visibleEnd = drawing.screen.rayEnd ?? p2;
  const horizontal = drawing.labelHorizontal ?? 'center';
  const vertical = drawing.labelVertical ?? 'top';
  const leftPoint = p1.x <= visibleEnd.x ? p1 : visibleEnd;
  const rightPoint = p1.x <= visibleEnd.x ? visibleEnd : p1;
  const anchor =
    horizontal === 'left'
      ? leftPoint
      : horizontal === 'right'
        ? rightPoint
        : {
            x: (p1.x + visibleEnd.x) / 2,
            y: (p1.y + visibleEnd.y) / 2,
          };
  const yOffset =
    vertical === 'top'
      ? -10
      : vertical === 'bottom'
        ? 18
        : 4;
  const textAnchor =
    horizontal === 'left'
      ? 'start'
      : horizontal === 'right'
        ? 'end'
        : 'middle';

  return {
    x: anchor.x,
    y: anchor.y + yOffset,
    textAnchor,
  };
}

function getBoxLabelPosition(rect, drawing) {
  const horizontal = drawing.labelHorizontal ?? 'center';
  const vertical = drawing.labelVertical ?? 'top';
  const x =
    horizontal === 'left'
      ? rect.left + 8
      : horizontal === 'right'
        ? rect.left + rect.width - 8
        : rect.left + rect.width / 2;
  const y =
    vertical === 'top'
      ? rect.top + 16
      : vertical === 'bottom'
        ? rect.top + rect.height - 8
        : rect.top + rect.height / 2 + 4;
  const textAnchor =
    horizontal === 'left'
      ? 'start'
      : horizontal === 'right'
        ? 'end'
        : 'middle';

  return { x, y, textAnchor };
}

function PositionPriceBadge({ item, overlayWidth, overlayHeight }) {
  const labelWidth = Math.min(Math.max(item.label.length * 6.5 + 16, 72), 132);
  const x = Math.max(overlayWidth - labelWidth / 2 - 6, 8);
  const y = Math.min(Math.max(item.y - 11, 8), Math.max(overlayHeight - 30, 8));

  return (
    <text
      x={x}
      y={y + 15}
      textAnchor="middle"
      fill={item.color}
      fontSize="11"
      fontWeight="700"
      paintOrder="stroke"
      stroke="rgba(21, 22, 23, 0.95)"
      strokeWidth="3"
      strokeLinejoin="round"
    >
      {item.label}
    </text>
  );
}

function DrawingOverlay({ renderedDrawings, selectedDrawingId, overlaySize, chartTheme }) {
  const selectedDrawing = renderedDrawings.find((d) => d.id === selectedDrawingId);

  const resizeHandles = [];

  if (isLineLikeDrawing(selectedDrawing)) {
    resizeHandles.push(selectedDrawing.screen.p1);

    if (!isHorizontalRayDrawing(selectedDrawing)) {
      resizeHandles.push(selectedDrawing.screen.p2);
    }

    if (selectedDrawing.type === 'fib-extension' && selectedDrawing.screen.p3) {
      resizeHandles.push(selectedDrawing.screen.p3);
    }
  }

  if (isPositionDrawing(selectedDrawing)) {
    const geometry = getPositionGeometry(selectedDrawing);
    resizeHandles.push(selectedDrawing.screen.p1, geometry.targetPoint, geometry.stopPoint);
  }

  if (selectedDrawing?.type === 'rect') {
    const { p1, p2 } = selectedDrawing.screen;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    resizeHandles.push(
      p1,
      p2,
      { x: p1.x, y: p2.y },
      { x: p2.x, y: p1.y },
      { x: p1.x, y: midY },
      { x: p2.x, y: midY },
      { x: midX, y: p1.y },
      { x: midX, y: p2.y }
    );
  }

  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 z-10"
        width={overlaySize.width}
        height={overlaySize.height}
        style={{ width: '100%', height: '100%' }}
      >
        {renderedDrawings.map((d) => {
          const drawingColor = d.color ?? DRAWING_COLOR;
          const stroke = drawingColor;
          const strokeWidth = d.id.startsWith('temp-')
            ? (d.strokeWidth ?? 1)
            : Math.max(d.strokeWidth ?? 1, 1);

          if (isLineLikeDrawing(d)) {
            const lineEnd = d.screen.rayEnd ?? d.screen.p2;
            const isUtilityTool = d.type === 'measure' || d.type === 'forecast';
            const isDashedLine = d.lineStyle === 'dashed';
            const labelText = d.labelText?.trim();
            const labelPosition = labelText ? getLineLabelPosition(d) : null;
            const midpoint = {
              x: (d.screen.p1.x + lineEnd.x) / 2,
              y: (d.screen.p1.y + lineEnd.y) / 2,
            };

            if (isFibonacciDrawing(d)) {
              const fibLevels = getFibonacciLevels(d, overlaySize.width);
              const labelX = Math.min(
                Math.max(Math.max(d.screen.p1.x, d.screen.p2.x, d.screen.p3?.x ?? 0) + 8, 8),
                Math.max(overlaySize.width - 96, 8)
              );

              return (
                <g key={d.id}>
                  <line
                    x1={d.screen.p1.x}
                    y1={d.screen.p1.y}
                    x2={d.screen.p2.x}
                    y2={d.screen.p2.y}
                    stroke={stroke}
                    strokeWidth={Math.max(strokeWidth, 1)}
                    strokeDasharray={d.id.startsWith('temp-') ? '5,5' : '4,4'}
                    opacity="0.8"
                  />
                  {d.type === 'fib-extension' && d.screen.p3 && (
                    <line
                      x1={d.screen.p2.x}
                      y1={d.screen.p2.y}
                      x2={d.screen.p3.x}
                      y2={d.screen.p3.y}
                      stroke={stroke}
                      strokeWidth={Math.max(strokeWidth, 1)}
                      strokeDasharray="4,4"
                      opacity="0.55"
                    />
                  )}
                  {fibLevels.map((item) => (
                    <g key={`${d.id}-${item.level}`}>
                      <line
                        x1={item.x1}
                        y1={item.y}
                        x2={item.x2}
                        y2={item.y}
                        stroke={item.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={
                          d.id.startsWith('temp-')
                            ? '5,5'
                            : isDashedLine
                              ? '8,5'
                              : undefined
                        }
                        opacity={item.level === 0 || item.level === 1 ? 0.95 : 0.72}
                      />
                      {!d.id.startsWith('temp-') && (
                        <text
                          x={labelX}
                          y={item.y - 4}
                          fill={item.color}
                          fontSize="11"
                          fontWeight="600"
                          paintOrder="stroke"
                          stroke="rgba(15, 23, 42, 0.95)"
                          strokeWidth="4"
                          strokeLinejoin="round"
                        >
                          {item.label}
                        </text>
                      )}
                    </g>
                  ))}
                  {labelText && !d.id.startsWith('temp-') && (
                    <text
                      x={labelPosition.x}
                      y={labelPosition.y}
                      textAnchor={labelPosition.textAnchor}
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="600"
                      paintOrder="stroke"
                      stroke="rgba(15, 23, 42, 0.95)"
                      strokeWidth="4"
                      strokeLinejoin="round"
                    >
                      {labelText}
                    </text>
                  )}
                </g>
              );
            }

            return (
              <g key={d.id}>
                <line
                  x1={d.screen.p1.x}
                  y1={d.screen.p1.y}
                  x2={lineEnd.x}
                  y2={lineEnd.y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={
                    d.id.startsWith('temp-')
                      ? '5,5'
                      : d.type === 'forecast'
                        ? '8,5'
                        : d.type === 'measure'
                          ? '4,4'
                          : isDashedLine
                            ? '8,5'
                            : undefined
                  }
                />
                {d.type === 'forecast' && (
                  <polygon
                    points={getArrowHeadPoints(d.screen.p1, d.screen.p2)}
                    fill={stroke}
                  />
                )}
                {d.type === 'measure' && (
                  <>
                    <circle cx={d.screen.p1.x} cy={d.screen.p1.y} r={4} fill={stroke} />
                    <circle cx={d.screen.p2.x} cy={d.screen.p2.y} r={4} fill={stroke} />
                  </>
                )}
                {isUtilityTool && !d.id.startsWith('temp-') && (
                  <text
                    x={midpoint.x + 8}
                    y={midpoint.y - 10}
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="600"
                    paintOrder="stroke"
                    stroke="rgba(15, 23, 42, 0.95)"
                    strokeWidth="4"
                    strokeLinejoin="round"
                  >
                    {getToolLabel(d)}
                  </text>
                )}
                {labelText && !d.id.startsWith('temp-') && (
                  <text
                    x={labelPosition.x}
                    y={labelPosition.y}
                    textAnchor={labelPosition.textAnchor}
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="600"
                    paintOrder="stroke"
                    stroke="rgba(15, 23, 42, 0.95)"
                    strokeWidth="4"
                    strokeLinejoin="round"
                  >
                    {labelText}
                  </text>
                )}
              </g>
            );
          }

          if (isPositionDrawing(d)) {
            const geometry = getPositionGeometry(d);
            const outline = 'rgba(226, 232, 240, 0.75)';

            return (
              <g key={d.id}>
                <rect
                  x={geometry.profitRect.left}
                  y={geometry.profitRect.top}
                  width={geometry.profitRect.width}
                  height={geometry.profitRect.height}
                  fill="rgba(34, 197, 94, 0.22)"
                  stroke="rgba(34, 197, 94, 0.85)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={d.id.startsWith('temp-') ? '5,5' : undefined}
                />
                <rect
                  x={geometry.lossRect.left}
                  y={geometry.lossRect.top}
                  width={geometry.lossRect.width}
                  height={geometry.lossRect.height}
                  fill="rgba(239, 68, 68, 0.22)"
                  stroke="rgba(239, 68, 68, 0.85)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={d.id.startsWith('temp-') ? '5,5' : undefined}
                />
                <line
                  x1={geometry.left}
                  y1={geometry.entryY}
                  x2={geometry.left + geometry.width}
                  y2={geometry.entryY}
                  stroke={outline}
                  strokeWidth={Math.max(strokeWidth, 2)}
                />
                <line
                  x1={geometry.left}
                  y1={geometry.targetY}
                  x2={geometry.left + geometry.width}
                  y2={geometry.targetY}
                  stroke="rgba(34, 197, 94, 0.95)"
                  strokeWidth={Math.max(strokeWidth, 2)}
                />
                <line
                  x1={geometry.left}
                  y1={geometry.stopY}
                  x2={geometry.left + geometry.width}
                  y2={geometry.stopY}
                  stroke="rgba(239, 68, 68, 0.95)"
                  strokeWidth={Math.max(strokeWidth, 2)}
                />
                {!d.id.startsWith('temp-') && (
                  <>
                    <text
                      x={geometry.left + 8}
                      y={geometry.isLong ? geometry.targetY + 18 : geometry.targetY - 10}
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="600"
                      paintOrder="stroke"
                      stroke="rgba(15, 23, 42, 0.95)"
                      strokeWidth="4"
                      strokeLinejoin="round"
                    >
                      {geometry.label}
                    </text>
                    {geometry.priceLabels.map((item) => (
                      <PositionPriceBadge
                        key={`${d.id}-${item.key}`}
                        item={item}
                        overlayWidth={overlaySize.width}
                        overlayHeight={overlaySize.height}
                      />
                    ))}
                  </>
                )}
              </g>
            );
          }

          if (d.type === 'rect') {
            const rect = normalizeVisibleRect(d.screen.p1, d.screen.p2);
            const labelText = d.labelText?.trim();
            const labelPosition = labelText ? getBoxLabelPosition(rect, d) : null;
            const rectDashArray = d.id.startsWith('temp-')
              ? '5,5'
              : d.lineStyle === 'dashed'
                ? '8,5'
                : undefined;

            return (
              <g key={d.id}>
                <rect
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  fill={
                    d.id.startsWith('temp-')
                      ? colorToRgba(drawingColor, 0.08)
                      : colorToRgba(drawingColor, 0.16) || DRAWING_FILL
                  }
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={rectDashArray}
                  rx={4}
                />
                {labelText && !d.id.startsWith('temp-') && (
                  <text
                    x={labelPosition.x}
                    y={labelPosition.y}
                    textAnchor={labelPosition.textAnchor}
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="600"
                    paintOrder="stroke"
                    stroke="rgba(15, 23, 42, 0.95)"
                    strokeWidth="4"
                    strokeLinejoin="round"
                  >
                    {labelText}
                  </text>
                )}
              </g>
            );
          }

          return null;
        })}

        {resizeHandles.map((point, index) => (
          <rect
            key={`resize-${selectedDrawingId}-${index}`}
            x={point.x - 5}
            y={point.y - 5}
            width={10}
            height={10}
            fill={chartTheme?.background ?? '#151617'}
            stroke="#fbbf24"
            strokeWidth={2}
            rx={2}
          />
        ))}
      </svg>

      {renderedDrawings
        .filter((d) => d.type === 'text')
        .map((d) => {
          return (
            <div
              key={d.id}
              className="pointer-events-none absolute z-10"
              style={{
                left: d.screen.p.x + 8,
                top: d.screen.p.y - 10,
                transform: 'translateY(-50%)',
              }}
            >
              <span
                className="text-xs font-semibold"
                style={{
                  color: d.color ?? '#ffffff',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
                }}
              >
                {d.text}
              </span>
            </div>
          );
        })}
    </>
  );
}

function TextInputPopover({
  textInput,
  textDraft,
  overlaySize,
  onTextDraftChange,
  onSaveText,
  onCancel,
}) {
  if (!textInput) return null;

  return (
    <div
      data-chart-ui="text-input"
      className="absolute z-20 w-56 rounded-lg border border-blue-500 bg-slate-900 p-3 shadow-2xl"
      style={{
        left: Math.min(textInput.x + 12, Math.max(overlaySize.width - 240, 12)),
        top: Math.max(textInput.y - 12, 12),
      }}
    >
      <div className="mb-2 text-xs font-medium text-gray-300">Text label</div>
      <input
        value={textDraft}
        onChange={(e) => onTextDraftChange(e.target.value)}
        placeholder="Enter note"
        autoFocus
        className="mb-2 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSaveText();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSaveText}
          className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white"
        >
          <Save size={14} />
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded bg-gray-700 px-3 py-2 text-xs font-medium text-white"
        >
          <X size={14} />
          Cancel
        </button>
      </div>
    </div>
  );
}

function ChartBrandLogo({ chartTheme }) {
  const [appLogo, setAppLogo] = useState('');
  useEffect(() => {
    let cancelled = false;

    getAppLogo().then((logo) => {
      if (!cancelled) {
        setAppLogo(logo);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!appLogo) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-10 left-[3px] z-10 flex h-7 w-12 items-center justify-center opacity-75"
      aria-hidden="true"
    >
      <img
        src={appLogo}
        alt=""
        className="max-h-6 max-w-10 object-contain"
        draggable="false"
      />
    </div>
  );
}

export default function ChartStage({
  wrapperRef,
  containerRef,
  isFullscreen,
  replayMode,
  isSpacePressed,
  isReplayPricePickActive,
  tool,
  chartTheme,
  overlaySize,
  renderedDrawings,
  selectedDrawingId,
  textInput,
  textDraft,
  onTextDraftChange,
  onSaveText,
  onCancelText,
  onToggleFullscreen,
}) {
  return (
    <div
      ref={wrapperRef}
      className={`relative min-h-0 overflow-hidden rounded-lg ${
        isFullscreen ? 'flex-1' : ''
      }`}
      style={{
        backgroundColor: chartTheme?.background ?? '#151617',
        height: isFullscreen ? '100%' : `${CHART_HEIGHT}px`,
        cursor: isSpacePressed
          ? 'grab'
          : tool || isReplayPricePickActive
            ? 'crosshair'
            : 'default',
      }}
    >
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <ChartBrandLogo chartTheme={chartTheme} />

      <button
        type="button"
        onClick={onToggleFullscreen}
        className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded border border-slate-600 bg-slate-900/90 text-white shadow-lg hover:bg-slate-800"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      <DrawingOverlay
        renderedDrawings={renderedDrawings}
        selectedDrawingId={selectedDrawingId}
        overlaySize={overlaySize}
        chartTheme={chartTheme}
      />

      <TextInputPopover
        textInput={textInput}
        textDraft={textDraft}
        overlaySize={overlaySize}
        onTextDraftChange={onTextDraftChange}
        onSaveText={onSaveText}
        onCancel={onCancelText}
      />
    </div>
  );
}
