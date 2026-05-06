import React from 'react';
import { CHART_HEIGHT, DRAWING_COLOR, DRAWING_FILL } from './constants';
import { normalizeRect } from './utils';

function DrawingOverlay({ renderedDrawings, selectedDrawingId, overlaySize }) {
  const selectedDrawing = renderedDrawings.find((d) => d.id === selectedDrawingId);

  const resizeHandles = [];

  if (selectedDrawing?.type === 'line') {
    resizeHandles.push(selectedDrawing.screen.p1, selectedDrawing.screen.p2);
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
          const stroke = isSelected ? '#fbbf24' : DRAWING_COLOR;
          const strokeWidth = d.id.startsWith('temp-')
            ? 2
            : Math.max(d.strokeWidth ?? 2, isSelected ? 3 : 1);

          if (d.type === 'line') {
            return (
              <line
                key={d.id}
                x1={d.screen.p1.x}
                y1={d.screen.p1.y}
                x2={d.screen.p2.x}
                y2={d.screen.p2.y}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={d.id.startsWith('temp-') ? '5,5' : undefined}
              />
            );
          }

          if (d.type === 'rect') {
            const rect = normalizeRect(d.screen.p1, d.screen.p2);
            return (
              <rect
                key={d.id}
                x={rect.left}
                y={rect.top}
                width={Math.max(rect.width, 1)}
                height={Math.max(rect.height, 1)}
                fill={d.id.startsWith('temp-') ? 'rgba(96, 165, 250, 0.08)' : DRAWING_FILL}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={d.id.startsWith('temp-') ? '5,5' : undefined}
                rx={4}
              />
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
          const isSelected = d.id === selectedDrawingId;
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
              <div
                className="rounded border px-2 py-1 text-xs text-white shadow-lg"
                style={{
                  borderColor: isSelected ? '#fbbf24' : DRAWING_COLOR,
                  background: 'rgba(15, 23, 42, 0.9)',
                }}
              >
                {d.text}
              </div>
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
          onClick={onSaveText}
          className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded bg-gray-700 px-3 py-2 text-xs font-medium text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ChartStage({
  wrapperRef,
  containerRef,
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
}) {
  return (
    <div
      ref={wrapperRef}
      className="relative overflow-hidden rounded-lg bg-[#081631]"
      style={{
        height: `${CHART_HEIGHT}px`,
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
