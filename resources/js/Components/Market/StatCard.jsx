import React from 'react';

export default function StatCard({ label, value, tone = 'neutral', icon: Icon, isDark }) {
  const toneClass =
    tone === 'win'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : tone === 'loss'
        ? 'border-red-500/30 bg-red-500/10'
        : tone === 'warning'
          ? 'border-amber-500/30 bg-amber-500/10'
          : isDark
            ? 'border-gray-700 bg-black-table-color'
            : 'border-slate-200 bg-slate-50';

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className={`mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
        {Icon && <Icon size={14} />}
        <span>{label}</span>
      </div>
      <div className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}
