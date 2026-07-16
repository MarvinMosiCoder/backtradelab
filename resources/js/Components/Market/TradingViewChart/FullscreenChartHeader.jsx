import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Wallet } from 'lucide-react';
import getAppLogo from '../../SystemSettings/ApplicationLogo';
import getAppName from '../../SystemSettings/ApplicationName';
import ChartHeader from './ChartHeader';

export default function FullscreenChartHeader({
  chartHeaderProps,
  isFullscreen = true,
  onToggleFullscreen,
  chartTheme,
  backtestAccount,
  isEntryPanelOpen,
  onEntryPanelOpenChange,
  showAppName = true,
  showEntryWallet = true,
}) {
  const [appLogo, setAppLogo] = useState('');
  const [appName, setAppName] = useState('BacktradeLab');
  const isDark = chartTheme?.mode === 'dark';

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAppLogo(), getAppName()]).then(([logo, name]) => {
      if (cancelled) return;
      setAppLogo(logo || '');
      setAppName(name || 'BacktradeLab');
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <header
      data-chart-ui="fullscreen-navbar"
      className="relative z-[80] flex h-12 shrink-0 items-center border-b"
      style={{
        backgroundColor: chartTheme?.panel ?? (isDark ? '#131722' : '#ffffff'),
        borderColor: chartTheme?.border ?? (isDark ? '#2a2e39' : '#e2e8f0'),
      }}
    >
      <div className="flex h-full min-w-0 shrink-0 items-center gap-2 border-r px-2 sm:px-3" style={{ borderColor: chartTheme?.border }}>
        {appLogo && <img src={appLogo} alt="" className="h-7 w-7 shrink-0 object-contain" draggable="false" />}
        {showAppName && (
          <span className={`hidden max-w-32 truncate text-xs font-bold sm:block ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {appName}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 overflow-visible px-1.5">
        <ChartHeader
          {...chartHeaderProps}
          compact
          className="h-10 flex-nowrap border-0 bg-transparent p-0 shadow-none"
        />
      </div>

      {showEntryWallet && <button
        type="button"
        onClick={() => onEntryPanelOpenChange?.(!isEntryPanelOpen)}
        className={`mx-1 flex h-9 shrink-0 items-center gap-2 rounded-md border px-2 transition ${
          isEntryPanelOpen
            ? 'border-[#2962ff] bg-[#2962ff] text-white'
            : isDark
              ? 'border-gray-700 bg-black-table-color text-white hover:bg-skin-black-light'
              : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
        }`}
        title="Enter Position"
        aria-label="Enter Position"
        aria-expanded={isEntryPanelOpen}
      >
        <Wallet size={15} />
        <span className="hidden text-[11px] font-semibold lg:inline">Enter Position</span>
        {backtestAccount && (
          <span className="hidden text-[10px] tabular-nums opacity-75 xl:inline">
            {Number(backtestAccount.cashBalance ?? backtestAccount.cash_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
      </button>}

      <button
        type="button"
        onClick={onToggleFullscreen}
        className={`mx-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition sm:mx-2 ${
          isDark
            ? 'border-gray-700 bg-black-table-color text-white hover:bg-white hover:text-black'
            : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-900 hover:text-white'
        }`}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </header>
  );
}
