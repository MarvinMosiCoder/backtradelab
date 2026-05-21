import React from 'react';
import { Maximize2, Minimize2, Save, X } from 'lucide-react';
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

function DrawingOverlay({ renderedDrawings, selectedDrawingId, overlaySize }) {
  const selectedDrawing = renderedDrawings.find((d) => d.id === selectedDrawingId);

  const resizeHandles = [];

  if (isLineLikeDrawing(selectedDrawing)) {
    resizeHandles.push(selectedDrawing.screen.p1);

    if (!isHorizontalRayDrawing(selectedDrawing)) {
      resizeHandles.push(selectedDrawing.screen.p2);
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
          const isSelected = d.id === selectedDrawingId;
          const drawingColor = d.color ?? DRAWING_COLOR;
          const stroke = isSelected ? '#fbbf24' : drawingColor;
          const strokeWidth = d.id.startsWith('temp-')
            ? (d.strokeWidth ?? 1)
            : Math.max(d.strokeWidth ?? 1, isSelected ? 3 : 1);

          if (isLineLikeDrawing(d)) {
            const lineEnd = d.screen.rayEnd ?? d.screen.p2;
            const isUtilityTool = d.type === 'measure' || d.type === 'forecast';
            const labelText = d.labelText?.trim();
            const labelPosition = labelText ? getLineLabelPosition(d) : null;
            const midpoint = {
              x: (d.screen.p1.x + lineEnd.x) / 2,
              y: (d.screen.p1.y + lineEnd.y) / 2,
            };

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
            const outline = isSelected ? '#fbbf24' : 'rgba(226, 232, 240, 0.75)';

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
                )}
              </g>
            );
          }

          if (d.type === 'rect') {
            const rect = normalizeVisibleRect(d.screen.p1, d.screen.p2);
            const labelText = d.labelText?.trim();
            const labelPosition = labelText ? getBoxLabelPosition(rect, d) : null;

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
                  strokeDasharray={d.id.startsWith('temp-') ? '5,5' : undefined}
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
            fill="#081631"
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

export default function ChartStage({
  wrapperRef,
  containerRef,
  isFullscreen,
  replayMode,
  isSpacePressed,
  isReplayPricePickActive,
  tool,
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
      className={`relative min-h-0 overflow-hidden rounded-lg bg-[#081631] ${
        isFullscreen ? 'flex-1' : ''
      }`}
      style={{
        height: isFullscreen ? '100%' : `${CHART_HEIGHT}px`,
        cursor: replayMode
          ? (
              isSpacePressed
                ? 'grab'
                : tool
                  ? 'crosshair'
                  : isReplayPricePickActive
                    ? 'crosshair'
                    : 'default'
            )
          : 'default',
      }}
    >
      <div ref={containerRef} className="absolute inset-0 z-0" />

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
