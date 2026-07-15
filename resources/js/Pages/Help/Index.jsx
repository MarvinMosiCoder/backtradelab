import React from 'react';
import { Head } from '@inertiajs/react';

const sections = [
  ['1. Choose a market', 'Open Market chart, choose Spot or Futures, then select or add a symbol.'],
  ['2. Set the timeframe', 'Use the timeframe control. The lower-right countdown shows when the live candle closes.'],
  ['3. Add indicators', 'Open Appearance to enable Volume, SMA, EMA, or RSI and edit their periods or volume height.'],
  ['4. Start Replay', 'Select Start Replay to activate your free seven-day trial when you are ready, choose a historical candle, then play or step through candles.'],
  ['5. Practice execution', 'Open Wallet, start a session, plan margin, leverage, entry, stop loss, and take profit, then place the paper order.'],
  ['6. Draw and annotate', 'Use the left chart rail for trend lines, Fibonacci tools, positions, boxes, forecasts, and notes.'],
  ['7. Set alerts', 'Open Appearance and select Set price alert. In-app and browser notifications are created when the live price reaches the target.'],
  ['8. Review and improve', 'Open Trade journal to review PnL, snapshots, setup tags, reasons, emotions, mistakes, and notes.'],
];

export default function HelpIndex() {
  return <><Head title="How to use BacktradeLab"/><div className="mx-auto max-w-4xl space-y-4"><div><h1 className="text-xl font-bold">How to use BacktradeLab</h1><p className="mt-1 text-sm text-[#787b86]">A practical chart-to-journal workflow.</p></div><div className="grid gap-3 sm:grid-cols-2">{sections.map(([title, copy]) => <section key={title} className="rounded-lg border border-[#2a2e39] bg-[#131722] p-4"><h2 className="font-semibold text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-[#b2b5be]">{copy}</p></section>)}</div></div></>;
}
