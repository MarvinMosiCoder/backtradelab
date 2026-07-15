import React from 'react';
import { Settings2, Trash2, X } from 'lucide-react';

const INDICATOR_META = {
  sma: { label: 'SMA', periodKey: 'smaPeriod', colorKey: 'smaColor', widthKey: 'smaLineWidth' },
  ema: { label: 'EMA', periodKey: 'emaPeriod', colorKey: 'emaColor', widthKey: 'emaLineWidth' },
  rsi: { label: 'RSI', periodKey: 'rsiPeriod', colorKey: 'rsiColor', widthKey: 'rsiLineWidth', sizeKey: 'rsiSize' },
};

export function IndicatorClickTargets({ indicators, rsiPaneTop, onSelect, chartTheme }) {
  const isDark = chartTheme?.mode === 'dark';
  const buttonClass = `flex h-6 items-center gap-1.5 rounded px-2 text-[10px] font-semibold shadow ${isDark ? 'bg-[#151617]/90 text-gray-200 hover:bg-[#25282e]' : 'bg-white/90 text-slate-700 hover:bg-slate-100'}`;
  const mainIndicators = ['sma', 'ema'].filter((key) => indicators[key]);

  return (
    <>
      {mainIndicators.length > 0 && (
        <div data-chart-ui className="pointer-events-auto absolute left-16 top-12 z-[54] flex flex-wrap gap-1">
          {mainIndicators.map((key) => {
            const meta = INDICATOR_META[key];
            return <button key={key} type="button" onClick={(event) => onSelect(key, event)} className={buttonClass} aria-label={`Open ${meta.label} settings`}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.colorKey ? indicators[meta.colorKey] : '#787b86' }} />{meta.label}{meta.periodKey ? ` ${indicators[meta.periodKey]}` : ''}</button>;
          })}
        </div>
      )}
      {indicators.rsi && Number.isFinite(Number(rsiPaneTop)) && (
        <div data-chart-ui className="pointer-events-auto absolute left-16 z-[54]" style={{ top: Number(rsiPaneTop) + 8 }}>
          <button type="button" onClick={(event) => onSelect('rsi', event)} className={buttonClass} aria-label="Open RSI settings"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: indicators.rsiColor }} />RSI {indicators.rsiPeriod}</button>
        </div>
      )}
    </>
  );
}

export default function IndicatorSettingsPanel({ indicators, selectedIndicator, position, overlaySize, onChange, onClose, chartTheme }) {
  const isDark = chartTheme?.mode === 'dark';
  const meta = INDICATOR_META[selectedIndicator];
  const shell = isDark ? 'border-gray-700 bg-[#151617] text-white' : 'border-slate-200 bg-white text-slate-900';
  const input = isDark ? 'border-gray-700 bg-[#0f1115] text-white' : 'border-slate-300 bg-slate-50 text-slate-900';
  const muted = isDark ? 'text-gray-400' : 'text-slate-500';

  if (!meta || !indicators[selectedIndicator] || !position) return null;

  const panelWidth = 256;
  const panelHeight = selectedIndicator === 'rsi' ? 330 : 280;
  const left = Math.min(Math.max(Number(position.x) + 12, 8), Math.max(Number(overlaySize?.width) - panelWidth - 8, 8));
  const preferredTop = Number(position.y) + 12;
  const top = preferredTop + panelHeight <= Number(overlaySize?.height)
    ? preferredTop
    : Math.max(Number(position.y) - panelHeight - 12, 8);

  const update = (updates) => onChange((current) => ({ ...current, ...updates }));
  const remove = () => {
    update({ [selectedIndicator]: false });
    onClose();
  };

  return (
    <div data-chart-ui className="pointer-events-auto absolute z-[55] max-w-[calc(100%-1rem)]" style={{ left, top }}>
        <section className={`w-64 max-w-full rounded-lg border p-3 shadow-2xl ${shell}`} aria-label={`${meta.label} settings`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold"><Settings2 size={15} />{meta.label} settings</div>
            <button type="button" onClick={onClose} className="rounded p-1 hover:bg-black/10" aria-label="Close indicator settings"><X size={15} /></button>
          </div>

          <div className="mt-3 grid gap-3">
            {meta.periodKey && (
              <label className={`grid gap-1 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
                Period
                <input
                  type="number"
                  min="2"
                  max="200"
                  value={indicators[meta.periodKey]}
                  onChange={(event) => update({ [meta.periodKey]: Math.min(200, Math.max(2, Number(event.target.value) || 2)) })}
                  className={`h-9 rounded border px-2 text-xs outline-none focus:border-[#2962ff] ${input}`}
                />
              </label>
            )}

            {meta.colorKey && (
              <label className={`flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
                Line color
                <input type="color" value={indicators[meta.colorKey]} onChange={(event) => update({ [meta.colorKey]: event.target.value })} className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent" />
              </label>
            )}

            {meta.widthKey && (
              <label className={`grid gap-1 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
                Line width
                <select value={indicators[meta.widthKey]} onChange={(event) => update({ [meta.widthKey]: Number(event.target.value) })} className={`h-9 rounded border px-2 text-xs outline-none focus:border-[#2962ff] ${input}`}>
                  {[1, 2, 3, 4].map((width) => <option key={width} value={width}>{width}px</option>)}
                </select>
              </label>
            )}

            {meta.sizeKey && (
              <label className={`grid gap-1 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
                Pane size: {indicators[meta.sizeKey]}%
                <input type="range" min="15" max="45" value={indicators[meta.sizeKey]} onChange={(event) => update({ [meta.sizeKey]: Number(event.target.value) })} className="accent-[#2962ff]" />
              </label>
            )}
          </div>

          <button type="button" onClick={remove} className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded bg-red-600 text-xs font-bold text-white hover:bg-red-500"><Trash2 size={14} />Remove {meta.label}</button>
        </section>
    </div>
  );
}
