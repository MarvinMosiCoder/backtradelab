import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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

function formatDisplayMoney(value, currency, phpRate, digits = 2) {
  const amount = quoteToDisplayAmount(value, currency, phpRate);
  if (amount == null) return '---';
  return `${formatMoney(amount, digits)} ${currency}`;
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '---';
  return `${number.toFixed(2)}%`;
}

function formatLeverage(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '1x';
  return `${Number(number.toFixed(2))}x`;
}

function getTradeDate(trade) {
  if (Number.isFinite(Number(trade?.closedAtTime))) {
    return new Date(Number(trade.closedAtTime) * 1000);
  }

  if (trade?.updatedAt) {
    return new Date(trade.updatedAt);
  }

  if (trade?.createdAt) {
    return new Date(trade.createdAt);
  }

  return null;
}

function getDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatTradeDate(trade) {
  const date = getTradeDate(trade);
  if (!date || Number.isNaN(date.getTime())) return '---';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      date,
      key: getDateKey(date),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

function getResultClass(result) {
  if (result === 'win') return 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30';
  if (result === 'loss') return 'bg-red-500/15 text-red-300 ring-red-400/30';
  return 'bg-slate-500/15 text-slate-300 ring-slate-400/30';
}

function getPnlClass(value) {
  const number = Number(value);
  if (number > 0) return 'text-emerald-300';
  if (number < 0) return 'text-red-300';
  return 'text-slate-300';
}

function StatCard({ label, value, tone = 'neutral', icon: Icon }) {
  const toneClass =
    tone === 'win'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : tone === 'loss'
        ? 'border-red-500/30 bg-red-500/10'
        : 'border-slate-700 bg-slate-900';

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {Icon && <Icon size={14} />}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export default function TradeReport({ refreshKey = 0 }) {
  const [report, setReport] = useState({ summary: {}, trades: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState(() => (
    getStoredValue('market-backtest-display-currency', 'USDT') === 'PHP' ? 'PHP' : 'USDT'
  ));
  const [phpRate, setPhpRate] = useState(() => getStoredValue('market-backtest-php-rate', '58'));

  const loadReport = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get('/market-backtest/report', {
        params: { limit: 500 },
        headers: { Accept: 'application/json' },
      });

      setReport({
        account: response.data?.account ?? null,
        summary: response.data?.summary ?? {},
        trades: Array.isArray(response.data?.trades) ? response.data.trades : [],
      });
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load trade report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [refreshKey]);

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

  const dailyStats = useMemo(() => {
    const stats = {};

    report.trades.forEach((trade) => {
      const key = getDateKey(getTradeDate(trade));
      if (!key) return;

      if (!stats[key]) {
        stats[key] = {
          pnl: 0,
          wins: 0,
          losses: 0,
          breakeven: 0,
          trades: 0,
        };
      }

      const day = stats[key];
      const pnl = Number(trade.pnl ?? 0);

      day.pnl += Number.isFinite(pnl) ? pnl : 0;
      day.trades += 1;

      if (pnl > 0) day.wins += 1;
      else if (pnl < 0) day.losses += 1;
      else day.breakeven += 1;
    });

    return stats;
  }, [report.trades]);

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const maxDailyAbsPnl = useMemo(() => {
    return Math.max(
      1,
      ...Object.values(dailyStats).map((day) => Math.abs(Number(day.pnl ?? 0)))
    );
  }, [dailyStats]);

  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const selectableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear, monthDate.getFullYear()]);

    report.trades.forEach((trade) => {
      const date = getTradeDate(trade);
      if (date && !Number.isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });

    const minYear = Math.min(currentYear - 5, ...years);
    const maxYear = Math.max(currentYear + 1, ...years);

    return Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);
  }, [monthDate, report.trades]);

  const summary = report.summary ?? {};
  const quoteCurrency = report.account?.quoteCurrency ?? 'USDT';
  const normalizedPhpRate = getPhpRate(phpRate);
  const formatReportMoney = (value, digits = 2) => formatDisplayMoney(
    value,
    displayCurrency,
    normalizedPhpRate,
    digits
  );

  const moveMonth = (amount) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const goToCurrentMonth = () => {
    const today = new Date();
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setShowCalendarPicker(false);
  };

  const setCalendarMonth = (month) => {
    setMonthDate((current) => new Date(current.getFullYear(), Number(month), 1));
  };

  const setCalendarYear = (year) => {
    setMonthDate((current) => new Date(Number(year), current.getMonth(), 1));
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays size={16} />
            <span>Trade Win/Loss Report</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Closed replay trades, grouped like exchange history.</p>
        </div>
        <button
          type="button"
          onClick={loadReport}
          disabled={loading}
          className="inline-flex h-8 items-center gap-2 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Currency</span>
            <select
              value={displayCurrency}
              onChange={(event) => setDisplayCurrency(event.target.value === 'PHP' ? 'PHP' : 'USDT')}
              className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-white outline-none"
            >
              <option value="USDT">{quoteCurrency}</option>
              <option value="PHP">PHP</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">PHP / {quoteCurrency}</span>
            <input
              value={phpRate}
              onChange={(event) => setPhpRate(event.target.value)}
              inputMode="decimal"
              disabled={displayCurrency !== 'PHP'}
              className="h-8 w-24 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-white outline-none disabled:opacity-40"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-md border border-red-900 bg-red-950/60 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          label="Net PnL"
          value={formatReportMoney(summary.netPnl)}
          tone={Number(summary.netPnl) >= 0 ? 'win' : 'loss'}
          icon={Number(summary.netPnl) >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Loss Net PnL"
          value={formatReportMoney(summary.lossNetPnl ?? summary.grossLoss ?? 0)}
          tone="loss"
          icon={TrendingDown}
        />
        <StatCard label="Win Rate" value={formatPercent(summary.winRate)} />
        <StatCard label="Wins" value={summary.wins ?? 0} tone="win" />
        <StatCard label="Losses" value={summary.losses ?? 0} tone="loss" />
        <StatCard label="Fees" value={formatReportMoney(summary.fees)} />
      </div>

      <div className="grid gap-4 px-4 pb-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]">
        <section className="rounded-lg border border-slate-800 bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowCalendarPicker((current) => !current)}
              className="rounded-md px-2 py-1 text-sm font-semibold text-white hover:bg-slate-800"
              title="Select month and year"
            >
              {monthLabel}
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
              title="Next month"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
            {showCalendarPicker && (
              <div className="grid w-full grid-cols-[minmax(0,1fr)_96px_auto] gap-2 pt-2">
                <select
                  value={monthDate.getMonth()}
                  onChange={(event) => setCalendarMonth(event.target.value)}
                  className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-white outline-none"
                >
                  {MONTH_LABELS.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
                <select
                  value={monthDate.getFullYear()}
                  onChange={(event) => setCalendarYear(event.target.value)}
                  className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-white outline-none"
                >
                  {selectableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={goToCurrentMonth}
                  className="h-8 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Today
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-7 gap-px border-b border-slate-800 bg-slate-800 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {DAY_LABELS.map((day) => (
              <div key={day} className="bg-slate-900 px-1 py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-800">
            {calendarDays.map((item) => {
              const day = dailyStats[item.key];
              const pnl = Number(day?.pnl ?? 0);
              const alpha = day ? Math.min(0.16 + (Math.abs(pnl) / maxDailyAbsPnl) * 0.42, 0.58) : 0;
              const backgroundColor = !day
                ? undefined
                : pnl >= 0
                  ? `rgba(16, 185, 129, ${alpha})`
                  : `rgba(239, 68, 68, ${alpha})`;

              return (
                <div
                  key={item.key}
                  className={`min-h-[82px] bg-slate-950 p-2 ${item.isCurrentMonth ? '' : 'opacity-40'}`}
                  style={{ backgroundColor }}
                >
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-300">{item.date.getDate()}</span>
                    {day && <span className="text-[10px] text-slate-300">{day.trades}T</span>}
                  </div>
                  {day && (
                    <div className="space-y-1">
                      <div className={`text-xs font-semibold ${getPnlClass(pnl)}`}>
                        {pnl > 0 ? '+' : ''}{formatReportMoney(pnl)}
                      </div>
                      <div className="text-[10px] text-slate-300">
                        W {day.wins} / L {day.losses}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
            <div className="text-sm font-semibold">Closed Trades</div>
            <div className="text-xs text-slate-400">
              {summary.totalTrades ?? 0} trades, {summary.breakeven ?? 0} breakeven
            </div>
          </div>

          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-950 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">Closed</th>
                  <th className="px-3 py-2">Symbol</th>
                  <th className="px-3 py-2">Side</th>
                  <th className="px-3 py-2 text-right">Entry</th>
                  <th className="px-3 py-2 text-right">Exit</th>
                  <th className="px-3 py-2 text-right">Lev</th>
                  <th className="px-3 py-2 text-right">Margin</th>
                  <th className="px-3 py-2 text-right">Value</th>
                  <th className="px-3 py-2 text-right">Fee</th>
                  <th className="px-3 py-2 text-right">PnL</th>
                  <th className="px-3 py-2 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {report.trades.length ? (
                  report.trades.map((trade) => {
                    const pnl = Number(trade.pnl ?? 0);

                    return (
                      <tr key={trade.id} className="hover:bg-slate-800/60">
                        <td className="whitespace-nowrap px-3 py-2 text-slate-300">{formatTradeDate(trade)}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-white">{trade.symbol}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className={trade.side === 'long' ? 'text-emerald-300' : 'text-red-300'}>
                            {String(trade.side ?? '').toUpperCase()}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-slate-300">{formatMoney(trade.entryPrice)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-slate-300">{formatMoney(trade.exitPrice)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-slate-300">{formatLeverage(trade.leverage)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-slate-300">{formatReportMoney(trade.margin)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-slate-300">{formatReportMoney(trade.notional)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-slate-400">{formatReportMoney(trade.fee)}</td>
                        <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${getPnlClass(pnl)}`}>
                          {pnl > 0 ? '+' : ''}{formatReportMoney(pnl)}
                          <span className="ml-1 text-[10px] text-slate-400">({formatPercent(trade.pnlPercent)})</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${getResultClass(trade.result)}`}>
                            {trade.result}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-sm text-slate-500">
                      No closed trades yet. Close a replay position to populate the report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
