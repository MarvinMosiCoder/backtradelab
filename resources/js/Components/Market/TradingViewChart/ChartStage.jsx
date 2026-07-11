import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Save, X } from 'lucide-react';
import getAppLogo from '../../SystemSettings/ApplicationLogo';
import { CHART_HEIGHT, DRAWING_COLOR, DRAWING_FILL } from './constants';
import {
  colorToRgba,
  isHorizontalRayDrawing,
  isLineLikeDrawing,
  isPathDrawing,
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

const FIB_LABEL_WIDTH = 126;
const RIGHT_PRICE_SCALE_SAFE_GAP = 92;

function isFibonacciDrawing(drawing) {
  return ['fib-retracement', 'fib-extension'].includes(drawing?.type);
}

function formatFibLevel(level) {
  return Number.isInteger(level) ? String(level) : Number(level).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function getFibonacciRange(drawing, overlayWidth) {
  const { p1, p2, p3 } = drawing.screen;
  const anchorPoint = drawing.type === 'fib-extension' ? (p3 ?? p2) : p1;
  const points = drawing.type === 'fib-extension' && p3 ? [p1, p2, p3] : [p1, p2];
  const leftX = Math.max(0, Math.min(...points.map((point) => point.x)));
  const rightX = Math.max(...points.map((point) => point.x), overlayWidth);
  const drawingRightX = Math.max(...points.map((point) => point.x));
  const maxLabelX = Math.max(8, overlayWidth - RIGHT_PRICE_SCALE_SAFE_GAP - FIB_LABEL_WIDTH);
  const labelX = Math.min(Math.max(drawingRightX + 8, 8), maxLabelX);

  return {
    anchorPoint,
    leftX,
    rightX,
    labelX,
  };
}

function getFibonacciLevels(drawing, overlayWidth) {
  const levels = drawing.type === 'fib-extension'
    ? FIB_EXTENSION_LEVELS
    : FIB_RETRACEMENT_LEVELS;
  const { p1, p2, p3 } = drawing.screen;
  const anchor = drawing.type === 'fib-extension' ? (drawing.anchor ?? drawing.end) : drawing.start;
  const { anchorPoint, leftX, rightX, labelX } = getFibonacciRange(drawing, overlayWidth);
  const priceDelta = drawing.end.price - drawing.start.price;
  const yDelta = p2.y - p1.y;

  return levels.map((level) => {
    const price = anchor.price + (priceDelta * level);

    return {
      level,
      price,
      y: anchorPoint.y + (yDelta * level),
      x1: leftX,
      x2: rightX,
      labelX,
      color: FIB_LEVEL_COLORS[level] ?? '#ffffff',
      label: `${formatFibLevel(level)}  ${formatPriceLabel(price)}`,
    };
  });
}

function FibLevelBadge({ item, overlayHeight, chartTheme, textWeight = '600', textStyle }) {
  const labelWidth = Math.min(Math.max(item.label.length * 6.2 + 16, 76), FIB_LABEL_WIDTH);
  const x = item.labelX;
  const y = Math.min(Math.max(item.y - 10, 4), Math.max(overlayHeight - 24, 4));
  const isDark = chartTheme?.mode !== 'light';
  const fill = isDark ? 'rgba(21, 22, 23, 0.96)' : 'rgba(255, 255, 255, 0.96)';
  const textFill = isDark ? '#f8fafc' : '#0f172a';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={labelWidth}
        height={20}
        rx={3}
        fill={fill}
        stroke={item.color}
        strokeWidth="1"
      />
      <text
        x={x + labelWidth - 7}
        y={y + 14}
        textAnchor="end"
        fill={textFill}
        fontSize="11"
        fontWeight={textWeight}
        fontStyle={textStyle}
      >
        {item.label}
      </text>
    </g>
  );
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
  const { p1, p2, pStop, pCurrent } = drawing.screen;
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
    positionRect: normalizeVisibleRect({ x: left, y: Math.min(targetY, stopY) }, { x: right, y: Math.max(targetY, stopY) }),
    profitRect: normalizeVisibleRect({ x: left, y: p1.y }, { x: right, y: targetY }),
    lossRect: normalizeVisibleRect({ x: left, y: p1.y }, { x: right, y: stopY }),
    currentRect: pCurrent
      ? normalizeVisibleRect(p1, pCurrent)
      : null,
    currentIsProfit: pCurrent
      ? (isLong ? pCurrent.y < p1.y : pCurrent.y > p1.y)
      : false,
    targetPoint: { x: p2.x, y: targetY },
    stopPoint: { x: pStop.x, y: stopY },
    label: `${isLong ? 'Long' : 'Short'} R/R ${(reward / Math.max(risk, 0.0000001)).toFixed(2)} | Target ${formatSignedNumber(rewardPercent)}% | Stop -${riskPercent.toFixed(2)}% | ${formatDuration(drawing.end.time - drawing.start.time)}`,
    priceLabels: [
      {
        key: 'entry',
        label: formatPriceLabel(entryPrice),
        y: p1.y,
        color: '#e2e8f0',
      },
      {
        key: 'tp',
        label: formatPriceLabel(targetPrice),
        y: targetY,
        color: '#4ade80',
      },
      {
        key: 'sl',
        label: formatPriceLabel(stopPrice),
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

function getLineLabelGapSegments(start, end, labelText, drawing) {
  if (
    !labelText ||
    (drawing.labelHorizontal ?? 'center') !== 'center' ||
    (drawing.labelVertical ?? 'top') !== 'middle'
  ) {
    return null;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 12) return null;

  const textWidth = Math.min(Math.max(labelText.length * 6 + 10, 24), 160);
  const halfGap = Math.min(textWidth / 2, Math.max(length / 2 - 3, 0));
  if (halfGap <= 0) return null;

  const unitX = dx / length;
  const unitY = dy / length;
  const center = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  return [
    {
      x1: start.x,
      y1: start.y,
      x2: center.x - unitX * halfGap,
      y2: center.y - unitY * halfGap,
    },
    {
      x1: center.x + unitX * halfGap,
      y1: center.y + unitY * halfGap,
      x2: end.x,
      y2: end.y,
    },
  ];
}

function buildPathData(points) {
  if (!Array.isArray(points) || !points.length) return '';

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function getPathLabelPosition(drawing) {
  const points = drawing.screen?.points ?? [];
  if (!points.length) return null;

  const horizontal = drawing.labelHorizontal ?? 'center';
  const vertical = drawing.labelVertical ?? 'top';
  const index =
    horizontal === 'left'
      ? 0
      : horizontal === 'right'
        ? points.length - 1
        : Math.floor((points.length - 1) / 2);
  const anchor = points[index];
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

function getDrawingTextWeight(drawing) {
  return drawing?.textBold ? '800' : '600';
}

function getDrawingTextStyle(drawing) {
  return drawing?.textItalic ? 'italic' : undefined;
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

function PositionPriceBadge({ item, overlayWidth, overlayHeight, textWeight = '700', textStyle }) {
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
      fontWeight={textWeight}
      fontStyle={textStyle}
      paintOrder="stroke"
      stroke="rgba(21, 22, 23, 0.95)"
      strokeWidth="3"
      strokeLinejoin="round"
    >
      {item.label}
    </text>
  );
}

function BacktestOrderOverlay({ renderedBacktestOrders = [], overlaySize, chartTheme }) {
  if (!renderedBacktestOrders.length) return null;

  const isDark = chartTheme?.mode !== 'light';
  const badgeFill = isDark ? 'rgba(21, 22, 23, 0.96)' : 'rgba(255, 255, 255, 0.96)';
  const textFill = isDark ? '#f8fafc' : '#0f172a';
  const x2 = Math.max(overlaySize.width - 96, 0);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[11]"
      width={overlaySize.width}
      height={overlaySize.height}
      style={{ width: '100%', height: '100%' }}
    >
      {renderedBacktestOrders.map((item) => {
        const estimatedTextWidth = item.label.length * 6.4;
        const maxBadgeWidth = Math.max(40, Math.min(300, overlaySize.width - 16));
        const badgeWidth = Math.min(Math.max(estimatedTextWidth + 22, 82), maxBadgeWidth);
        const badgeX = Math.max(8, overlaySize.width - badgeWidth - 8);
        const badgeY = Math.min(Math.max(item.y - 11, 4), Math.max(overlaySize.height - 24, 4));
        const availableTextWidth = Math.max(badgeWidth - 16, 1);
        const shouldCompressText = estimatedTextWidth > availableTextWidth;

        return (
          <g key={item.id}>
            <line
              x1={0}
              y1={item.y}
              x2={x2}
              y2={item.y}
              stroke={item.color}
              strokeWidth={1}
              strokeDasharray={item.dashed ? '7,5' : undefined}
              opacity="0.95"
            />
            <rect
              x={badgeX}
              y={badgeY}
              width={badgeWidth}
              height={22}
              rx={2}
              fill={badgeFill}
              stroke={item.color}
              strokeWidth="1"
            />
            <text
              x={badgeX + badgeWidth - 8}
              y={badgeY + 15}
              textAnchor="end"
              fill={textFill}
              fontSize="11"
              fontWeight="700"
              textLength={shouldCompressText ? availableTextWidth : undefined}
              lengthAdjust={shouldCompressText ? 'spacingAndGlyphs' : undefined}
            >
              {item.label}
            </text>
            <rect
              x={Math.max(overlaySize.width - 14, 4)}
              y={item.y - 5}
              width={10}
              height={10}
              rx={2}
              fill={chartTheme?.background ?? '#151617'}
              stroke={item.color}
              strokeWidth={2}
            />
            {item.canCancel && (
              <>
                <rect
                  x={Math.max(overlaySize.width - 42, 4)}
                  y={item.y - 8}
                  width={16}
                  height={16}
                  rx={2}
                  fill={chartTheme?.background ?? '#151617'}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                />
                <text
                  x={Math.max(overlaySize.width - 34, 12)}
                  y={item.y + 4}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize="12"
                  fontWeight="800"
                >
                  x
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
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

  if (isPathDrawing(selectedDrawing)) {
    resizeHandles.push(...(selectedDrawing.screen.points ?? []));
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
          const textWeight = getDrawingTextWeight(d);
          const textStyle = getDrawingTextStyle(d);

          if (isPathDrawing(d)) {
            const pathPoints = [
              ...(d.screen.points ?? []),
              ...(d.screen.previewPoint ? [d.screen.previewPoint] : []),
            ];
            const pathData = buildPathData(pathPoints);
            const labelText = d.labelText?.trim();
            const labelPosition = labelText ? getPathLabelPosition(d) : null;
            const pathDashArray = d.id.startsWith('temp-')
              ? '5,5'
              : d.lineStyle === 'dashed'
                ? '8,5'
                : undefined;

            return (
              <g key={d.id}>
                {pathData && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={pathDashArray}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {(d.screen.points ?? []).map((point, index) => (
                  <circle
                    key={`${d.id}-point-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    fill={stroke}
                    stroke={chartTheme?.background ?? '#151617'}
                    strokeWidth={1.5}
                  />
                ))}
                {labelText && !d.id.startsWith('temp-') && labelPosition && (
                  <text
                    x={labelPosition.x}
                    y={labelPosition.y}
                    textAnchor={labelPosition.textAnchor}
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight={textWeight}
                    fontStyle={textStyle}
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

          if (isLineLikeDrawing(d)) {
            const lineEnd = d.screen.rayEnd ?? d.screen.p2;
            const isUtilityTool = d.type === 'measure' || d.type === 'forecast';
            const isDashedLine = d.lineStyle === 'dashed';
            const labelText = d.labelText?.trim();
            const labelPosition = labelText ? getLineLabelPosition(d) : null;
            const lineGapSegments = getLineLabelGapSegments(d.screen.p1, lineEnd, labelText, d);
            const lineDashArray = d.id.startsWith('temp-')
              ? '5,5'
              : d.type === 'forecast'
                ? '8,5'
                : d.type === 'measure'
                  ? '4,4'
                  : isDashedLine
                    ? '8,5'
                    : undefined;
            const midpoint = {
              x: (d.screen.p1.x + lineEnd.x) / 2,
              y: (d.screen.p1.y + lineEnd.y) / 2,
            };

            if (isFibonacciDrawing(d)) {
              const fibLevels = getFibonacciLevels(d, overlaySize.width);

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
                        <FibLevelBadge
                          item={item}
                          overlayHeight={overlaySize.height}
                          chartTheme={chartTheme}
                          textWeight={textWeight}
                          textStyle={textStyle}
                        />
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
                      fontWeight={textWeight}
                      fontStyle={textStyle}
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
                {lineGapSegments ? (
                  lineGapSegments.map((segment, index) => (
                    <line
                      key={`${d.id}-line-segment-${index}`}
                      x1={segment.x1}
                      y1={segment.y1}
                      x2={segment.x2}
                      y2={segment.y2}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeDasharray={lineDashArray}
                    />
                  ))
                ) : (
                  <line
                    x1={d.screen.p1.x}
                    y1={d.screen.p1.y}
                    x2={lineEnd.x}
                    y2={lineEnd.y}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={lineDashArray}
                  />
                )}
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
                    fontWeight={textWeight}
                    fontStyle={textStyle}
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
                    fontWeight={textWeight}
                    fontStyle={textStyle}
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
            const baseProfitFill = chartTheme?.mode === 'light'
              ? 'rgba(22, 101, 52, 0.18)'
              : 'rgba(22, 101, 52, 0.18)';
            const baseLossFill = chartTheme?.mode === 'light'
              ? 'rgba(127, 29, 29, 0.18)'
              : 'rgba(127, 29, 29, 0.18)';
            const currentFill = geometry.currentIsProfit
              ? 'rgba(34, 197, 94, 0.16)'
              : 'rgba(239, 68, 68, 0.16)';

            return (
              <g key={d.id}>
                <rect
                  x={geometry.profitRect.left}
                  y={geometry.profitRect.top}
                  width={geometry.profitRect.width}
                  height={geometry.profitRect.height}
                  fill={baseProfitFill}
                  stroke="rgba(34, 197, 94, 0.85)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={d.id.startsWith('temp-') ? '5,5' : undefined}
                />
                <rect
                  x={geometry.lossRect.left}
                  y={geometry.lossRect.top}
                  width={geometry.lossRect.width}
                  height={geometry.lossRect.height}
                  fill={baseLossFill}
                  stroke="rgba(239, 68, 68, 0.85)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={d.id.startsWith('temp-') ? '5,5' : undefined}
                />
                {geometry.currentRect && (
                  <rect
                    x={geometry.currentRect.left}
                    y={geometry.currentRect.top}
                    width={geometry.currentRect.width}
                    height={geometry.currentRect.height}
                    fill={currentFill}
                    stroke="none"
                  />
                )}
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
                {d.screen.pCurrent && (
                  <>
                    <line
                      x1={d.screen.p1.x}
                      y1={d.screen.p1.y}
                      x2={d.screen.pCurrent.x}
                      y2={d.screen.pCurrent.y}
                      stroke="#9ca3af"
                      strokeWidth={1}
                      strokeDasharray="6,5"
                      opacity="0.95"
                    />
                    <circle
                      cx={d.screen.pCurrent.x}
                      cy={d.screen.pCurrent.y}
                      r={3}
                      fill="#9ca3af"
                      stroke={chartTheme?.background ?? '#151617'}
                      strokeWidth={2}
                    />
                  </>
                )}
                {!d.id.startsWith('temp-') && (
                  <>
                    <text
                      x={geometry.left + 8}
                      y={geometry.isLong ? geometry.targetY + 18 : geometry.targetY - 10}
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight={textWeight}
                      fontStyle={textStyle}
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
                        textWeight={d.textBold ? '800' : '700'}
                        textStyle={textStyle}
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
                />
                {labelText && !d.id.startsWith('temp-') && (
                  <text
                    x={labelPosition.x}
                    y={labelPosition.y}
                    textAnchor={labelPosition.textAnchor}
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight={textWeight}
                    fontStyle={textStyle}
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
                  fontWeight: d.textBold ? 800 : 600,
                  fontStyle: d.textItalic ? 'italic' : undefined,
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
      className="absolute z-20 w-56 rounded-lg border border-gray-700 bg-skin-black p-3 shadow-2xl"
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
        className="mb-2 w-full rounded border border-gray-700 bg-black-table-color px-3 py-2 text-sm text-white outline-none focus:border-gray-500"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSaveText();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSaveText}
          className="inline-flex items-center gap-1.5 rounded bg-skin-black-light px-3 py-2 text-xs font-medium text-white hover:bg-skin-black"
        >
          <Save size={14} />
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded bg-black-table-color px-3 py-2 text-xs font-medium text-white hover:bg-skin-black-light"
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
  renderedBacktestOrders,
  selectedDrawingId,
  textInput,
  textDraft,
  onTextDraftChange,
  onSaveText,
  onCancelText,
  onToggleFullscreen,
}) {
  const [replayPickPreviewX, setReplayPickPreviewX] = useState(null);
  const [isChartDragging, setIsChartDragging] = useState(false);

  useEffect(() => {
    if (!isReplayPricePickActive) {
      setReplayPickPreviewX(null);
    }
  }, [isReplayPricePickActive]);

  useEffect(() => {
    const stopDragging = () => setIsChartDragging(false);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('blur', stopDragging);
    return () => {
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('blur', stopDragging);
    };
  }, []);

  const handleReplayPickPreviewMove = (event) => {
    if (!isReplayPricePickActive) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    setReplayPickPreviewX(Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width));
  };

  return (
    <div
      ref={wrapperRef}
      onMouseDown={(event) => {
        if (event.button !== 0 || event.target?.closest?.('button, input, textarea, select, [data-chart-ui]')) return;
        setIsChartDragging(true);
      }}
      onMouseMove={handleReplayPickPreviewMove}
      onMouseLeave={() => setReplayPickPreviewX(null)}
      className={`relative min-h-0 overflow-hidden rounded-lg ${
        isFullscreen ? 'flex-1' : ''
      }`}
      style={{
        backgroundColor: chartTheme?.background ?? '#151617',
        height: isFullscreen ? '100%' : `${CHART_HEIGHT}px`,
        cursor: isChartDragging
          ? 'grabbing'
          : isSpacePressed
            ? 'grab'
          : tool || isReplayPricePickActive
            ? 'crosshair'
            : 'grab',
      }}
    >
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {isReplayPricePickActive && replayPickPreviewX != null && (
        <div className="pointer-events-none absolute inset-0 z-[9] overflow-hidden">
          <div
            className="absolute bottom-0 top-0 border-l-2 border-dashed border-blue-400"
            style={{ left: replayPickPreviewX }}
          />
          <div
            className="absolute bottom-0 right-0 top-0 bg-[#131722]/75"
            style={{ left: replayPickPreviewX + 2 }}
          />
          <div
            className="absolute top-3 -translate-x-1/2 whitespace-nowrap rounded bg-[#2962ff] px-2 py-1 text-[11px] font-semibold text-white shadow-lg"
            style={{ left: replayPickPreviewX }}
          >
            Select replay start
          </div>
        </div>
      )}

      <ChartBrandLogo chartTheme={chartTheme} />

      <button
        type="button"
        onClick={onToggleFullscreen}
        className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded border border-gray-700 bg-black-table-color/95 text-white shadow-lg hover:bg-skin-black-light"
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

      <BacktestOrderOverlay
        renderedBacktestOrders={renderedBacktestOrders}
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
