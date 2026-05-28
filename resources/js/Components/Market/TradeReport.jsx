import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Download,
  Pencil,
  RefreshCcw,
  Save,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useTheme } from '../../Context/ThemeContext';

const TRADES_PER_PAGE = 10;

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

function getResultClass(result, isDark) {
  if (result === 'win') {
    return isDark
      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (result === 'loss') {
    return isDark
      ? 'bg-red-500/15 text-red-300 ring-red-400/30'
      : 'bg-red-50 text-red-700 ring-red-200';
  }
  return isDark
    ? 'bg-gray-500/15 text-gray-300 ring-gray-400/30'
    : 'bg-slate-100 text-slate-600 ring-slate-300';
}

function getPnlClass(value, isDark) {
  const number = Number(value);
  if (number > 0) return isDark ? 'text-emerald-300' : 'text-emerald-700';
  if (number < 0) return isDark ? 'text-red-300' : 'text-red-700';
  return isDark ? 'text-gray-300' : 'text-slate-600';
}

function StatCard({ label, value, tone = 'neutral', icon: Icon, isDark }) {
  const toneClass =
    tone === 'win'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : tone === 'loss'
        ? 'border-red-500/30 bg-red-500/10'
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

function normalizeTagText(value) {
  return String(value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(', ');
}

export default function TradeReport({ refreshKey = 0 }) {
  const { theme: adminTheme } = useTheme();
  const isDark = adminTheme === 'bg-skin-black';
  const [report, setReport] = useState({ summary: {}, trades: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState(() => (
    getStoredValue('market-backtest-display-currency', 'USDT') === 'PHP' ? 'PHP' : 'USDT'
  ));
  const [phpRate, setPhpRate] = useState(() => getStoredValue('market-backtest-php-rate', '58'));
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [journalDraft, setJournalDraft] = useState({});
  const [journalSaving, setJournalSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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
    setCurrentPage(1);
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

  const summary = report.summary ?? {};
  const sortedTrades = useMemo(() => {
    return [...report.trades].sort((a, b) => {
      const aTime = Number(a.closedAtTime ?? 0);
      const bTime = Number(b.closedAtTime ?? 0);

      if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
        return bTime - aTime;
      }

      return new Date(b.updatedAt ?? b.createdAt ?? 0) - new Date(a.updatedAt ?? a.createdAt ?? 0);
    });
  }, [report.trades]);
  const totalTrades = sortedTrades.length;
  const totalPages = Math.max(Math.ceil(totalTrades / TRADES_PER_PAGE), 1);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = totalTrades ? (safeCurrentPage - 1) * TRADES_PER_PAGE : 0;
  const pageEnd = Math.min(pageStart + TRADES_PER_PAGE, totalTrades);
  const paginatedTrades = sortedTrades.slice(pageStart, pageEnd);
  const quoteCurrency = report.account?.quoteCurrency ?? 'USDT';
  const normalizedPhpRate = getPhpRate(phpRate);
  const formatReportMoney = (value, digits = 2) => formatDisplayMoney(
    value,
    displayCurrency,
    normalizedPhpRate,
    digits
  );

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const startJournalEdit = (trade) => {
    setEditingTradeId(trade.id);
    setJournalDraft({
      setupTag: trade.setupTag ?? '',
      tags: normalizeTagText((trade.tags ?? []).join(', ')),
      entryReason: trade.entryReason ?? '',
      exitReason: trade.exitReason ?? '',
      mistake: trade.mistake ?? '',
      emotion: trade.emotion ?? '',
      journalNotes: trade.journalNotes ?? '',
    });
  };

  const cancelJournalEdit = () => {
    setEditingTradeId(null);
    setJournalDraft({});
  };

  const updateJournalDraft = (field, value) => {
    setJournalDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveJournal = async (tradeId) => {
    setJournalSaving(true);
    setError('');

    try {
      const response = await axios.put(`/market-backtest/trades/${tradeId}/journal`, {
        setup_tag: journalDraft.setupTag,
        tags: String(journalDraft.tags ?? '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        entry_reason: journalDraft.entryReason,
        exit_reason: journalDraft.exitReason,
        mistake: journalDraft.mistake,
        emotion: journalDraft.emotion,
        journal_notes: journalDraft.journalNotes,
      });
      const updatedTrade = response.data?.trade;

      if (updatedTrade) {
        setReport((current) => ({
          ...current,
          trades: current.trades.map((trade) => (
            trade.id === updatedTrade.id ? updatedTrade : trade
          )),
        }));
      }

      cancelJournalEdit();
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to save journal');
    } finally {
      setJournalSaving(false);
    }
  };

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
    cancelJournalEdit();
  };

  const exportReport = (format) => {
    const params = new URLSearchParams({
      format,
      limit: '5000',
    });

    window.location.href = `/market-backtest/report/export?${params.toString()}`;
  };

  const shellClass = isDark
    ? 'border-gray-800 bg-skin-black text-white shadow-xl'
    : 'border-slate-200 bg-white text-slate-900 shadow-sm';
  const borderClass = isDark ? 'border-gray-800' : 'border-slate-200';
  const mutedTextClass = isDark ? 'text-gray-400' : 'text-slate-500';
  const faintTextClass = isDark ? 'text-gray-500' : 'text-slate-400';
  const valueTextClass = isDark ? 'text-white' : 'text-slate-900';
  const bodyTextClass = isDark ? 'text-gray-300' : 'text-slate-600';
  const sectionClass = isDark
    ? 'border-gray-800 bg-black-table-color/70'
    : 'border-slate-200 bg-slate-50';
  const buttonClass = isDark
    ? 'bg-black-table-color text-white hover:bg-skin-black-light'
    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100';
  const fieldClass = isDark
    ? 'border-gray-700 bg-black-table-color text-white placeholder:text-gray-500'
    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400';
  const tableDivideClass = isDark ? 'divide-gray-800' : 'divide-slate-200';
  const tableHeadClass = isDark
    ? 'bg-skin-black text-gray-400'
    : 'bg-white text-slate-500';
  const rowHoverClass = isDark ? 'hover:bg-skin-black-light/60' : 'hover:bg-white';
  const editRowClass = isDark ? 'bg-skin-black/70' : 'bg-white';
  const inactivePillClass = isDark
    ? 'bg-black-table-color text-gray-600'
    : 'bg-slate-100 text-slate-400';
  const longTextClass = isDark ? 'text-emerald-300' : 'text-emerald-700';
  const shortTextClass = isDark ? 'text-red-300' : 'text-red-700';

  return (
    <div className={`rounded-lg border ${shellClass}`}>
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${borderClass}`}>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>Trade Win/Loss Report</span>
          </div>
          <p className={`mt-1 text-xs ${mutedTextClass}`}>Closed replay trades, grouped like exchange history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportReport('csv')}
            className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold ${buttonClass}`}
          >
            <Download size={14} />
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportReport('json')}
            className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold ${buttonClass}`}
          >
            <Download size={14} />
            JSON
          </button>
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className={`mb-1 block text-[10px] uppercase tracking-wide ${faintTextClass}`}>Currency</span>
            <select
              value={displayCurrency}
              onChange={(event) => setDisplayCurrency(event.target.value === 'PHP' ? 'PHP' : 'USDT')}
              className={`h-8 rounded-md border px-2 text-xs outline-none ${fieldClass}`}
            >
              <option value="USDT">{quoteCurrency}</option>
              <option value="PHP">PHP</option>
            </select>
          </label>
          <label className="block">
            <span className={`mb-1 block text-[10px] uppercase tracking-wide ${faintTextClass}`}>PHP / {quoteCurrency}</span>
            <input
              value={phpRate}
              onChange={(event) => setPhpRate(event.target.value)}
              inputMode="decimal"
              disabled={displayCurrency !== 'PHP'}
              className={`h-8 w-24 rounded-md border px-2 text-xs outline-none disabled:opacity-40 ${fieldClass}`}
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
          isDark={isDark}
        />
        <StatCard
          label="Loss Net PnL"
          value={formatReportMoney(summary.lossNetPnl ?? summary.grossLoss ?? 0)}
          tone="loss"
          icon={TrendingDown}
          isDark={isDark}
        />
        <StatCard label="Win Rate" value={formatPercent(summary.winRate)} isDark={isDark} />
        <StatCard label="Wins" value={summary.wins ?? 0} tone="win" isDark={isDark} />
        <StatCard label="Losses" value={summary.losses ?? 0} tone="loss" isDark={isDark} />
        <StatCard label="Fees" value={formatReportMoney(summary.fees)} isDark={isDark} />
      </div>

      <div className="px-4 pb-4">
        <section className={`overflow-hidden rounded-lg border ${sectionClass}`}>
          <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 ${borderClass}`}>
            <div className="text-sm font-semibold">Closed Trades</div>
            <div className={`text-xs ${mutedTextClass}`}>
              {totalTrades ? `${pageStart + 1}-${pageEnd} of ${totalTrades}` : '0 trades'}, {summary.breakeven ?? 0} breakeven
            </div>
          </div>

          <div className="max-h-[560px] overflow-auto">
            <table className={`min-w-full divide-y text-left text-xs ${tableDivideClass}`}>
              <thead className={`sticky top-0 z-10 text-[10px] uppercase tracking-wide ${tableHeadClass}`}>
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
                  <th className="px-3 py-2">Snapshots</th>
                  <th className="px-3 py-2">Journal</th>
                  <th className="px-3 py-2 text-right">Result</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${tableDivideClass}`}>
                {paginatedTrades.length ? (
                  paginatedTrades.map((trade) => {
                    const pnl = Number(trade.pnl ?? 0);

                    return (
                      <React.Fragment key={trade.id}>
                        <tr className={rowHoverClass}>
                          <td className={`whitespace-nowrap px-3 py-2 ${bodyTextClass}`}>{formatTradeDate(trade)}</td>
                          <td className={`whitespace-nowrap px-3 py-2 font-semibold ${valueTextClass}`}>{trade.symbol}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <span className={trade.side === 'long' ? longTextClass : shortTextClass}>
                              {String(trade.side ?? '').toUpperCase()}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap px-3 py-2 text-right ${bodyTextClass}`}>{formatMoney(trade.entryPrice)}</td>
                          <td className={`whitespace-nowrap px-3 py-2 text-right ${bodyTextClass}`}>{formatMoney(trade.exitPrice)}</td>
                          <td className={`whitespace-nowrap px-3 py-2 text-right ${bodyTextClass}`}>{formatLeverage(trade.leverage)}</td>
                          <td className={`whitespace-nowrap px-3 py-2 text-right ${bodyTextClass}`}>{formatReportMoney(trade.margin)}</td>
                          <td className={`whitespace-nowrap px-3 py-2 text-right ${bodyTextClass}`}>{formatReportMoney(trade.notional)}</td>
                          <td className={`whitespace-nowrap px-3 py-2 text-right ${mutedTextClass}`}>{formatReportMoney(trade.fee)}</td>
                          <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${getPnlClass(pnl, isDark)}`}>
                            {pnl > 0 ? '+' : ''}{formatReportMoney(pnl)}
                            <span className={`ml-1 text-[10px] ${mutedTextClass}`}>({formatPercent(trade.pnlPercent)})</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <div className="flex gap-1">
                              {trade.entrySnapshotUrl ? (
                                <a
                                  href={trade.entrySnapshotUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`rounded px-2 py-1 text-[10px] font-semibold ${isDark ? 'bg-black-table-color text-blue-200 hover:bg-skin-black-light' : 'border border-slate-300 bg-white text-blue-700 hover:bg-slate-100'}`}
                                >
                                  Entry
                                </a>
                              ) : (
                                <span className={`rounded px-2 py-1 text-[10px] ${inactivePillClass}`}>Entry</span>
                              )}
                              {trade.exitSnapshotUrl ? (
                                <a
                                  href={trade.exitSnapshotUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`rounded px-2 py-1 text-[10px] font-semibold ${isDark ? 'bg-black-table-color text-blue-200 hover:bg-skin-black-light' : 'border border-slate-300 bg-white text-blue-700 hover:bg-slate-100'}`}
                                >
                                  Exit
                                </a>
                              ) : (
                                <span className={`rounded px-2 py-1 text-[10px] ${inactivePillClass}`}>Exit</span>
                              )}
                            </div>
                          </td>
                          <td className="min-w-48 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => editingTradeId === trade.id ? cancelJournalEdit() : startJournalEdit(trade)}
                                className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold ${buttonClass}`}
                              >
                                {editingTradeId === trade.id ? <X size={13} /> : <Pencil size={13} />}
                                {editingTradeId === trade.id ? 'Close' : 'Edit'}
                              </button>
                              <div className="min-w-0">
                                <div className={`truncate text-[11px] font-semibold ${valueTextClass}`}>
                                  {trade.setupTag || 'No setup'}
                                </div>
                                <div className={`truncate text-[10px] ${faintTextClass}`}>
                                  {(trade.tags ?? []).length ? trade.tags.join(', ') : 'No tags'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${getResultClass(trade.result, isDark)}`}>
                              {trade.result}
                            </span>
                          </td>
                        </tr>
                        {editingTradeId === trade.id && (
                          <tr className={editRowClass}>
                            <td colSpan={13} className="px-3 py-3">
                              <div className="grid gap-3 md:grid-cols-3">
                                <input
                                  value={journalDraft.setupTag ?? ''}
                                  onChange={(event) => updateJournalDraft('setupTag', event.target.value)}
                                  className={`h-9 rounded-md border px-3 text-xs outline-none ${fieldClass}`}
                                  placeholder="Setup tag"
                                />
                                <input
                                  value={journalDraft.tags ?? ''}
                                  onChange={(event) => updateJournalDraft('tags', event.target.value)}
                                  className={`h-9 rounded-md border px-3 text-xs outline-none ${fieldClass}`}
                                  placeholder="Tags, comma separated"
                                />
                                <input
                                  value={journalDraft.emotion ?? ''}
                                  onChange={(event) => updateJournalDraft('emotion', event.target.value)}
                                  className={`h-9 rounded-md border px-3 text-xs outline-none ${fieldClass}`}
                                  placeholder="Emotion"
                                />
                                <textarea
                                  value={journalDraft.entryReason ?? ''}
                                  onChange={(event) => updateJournalDraft('entryReason', event.target.value)}
                                  className={`min-h-20 rounded-md border px-3 py-2 text-xs outline-none ${fieldClass}`}
                                  placeholder="Entry reason"
                                />
                                <textarea
                                  value={journalDraft.exitReason ?? ''}
                                  onChange={(event) => updateJournalDraft('exitReason', event.target.value)}
                                  className={`min-h-20 rounded-md border px-3 py-2 text-xs outline-none ${fieldClass}`}
                                  placeholder="Exit reason"
                                />
                                <textarea
                                  value={journalDraft.mistake ?? ''}
                                  onChange={(event) => updateJournalDraft('mistake', event.target.value)}
                                  className={`min-h-20 rounded-md border px-3 py-2 text-xs outline-none ${fieldClass}`}
                                  placeholder="Mistake / improvement"
                                />
                                <textarea
                                  value={journalDraft.journalNotes ?? ''}
                                  onChange={(event) => updateJournalDraft('journalNotes', event.target.value)}
                                  className={`min-h-24 rounded-md border px-3 py-2 text-xs outline-none md:col-span-3 ${fieldClass}`}
                                  placeholder="Journal notes"
                                />
                              </div>
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveJournal(trade.id)}
                                  disabled={journalSaving}
                                  className="inline-flex h-8 items-center gap-2 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                                >
                                  <Save size={14} />
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelJournalEdit}
                                  className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold ${buttonClass}`}
                                >
                                  <X size={14} />
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className={`px-3 py-10 text-center text-sm ${faintTextClass}`}>
                      No closed trades yet. Close a replay position to populate the report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={`flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 ${borderClass}`}>
            <div className={`text-xs ${mutedTextClass}`}>
              Page {safeCurrentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
                className={`h-8 rounded-md px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${buttonClass}`}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
                className={`h-8 rounded-md px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${buttonClass}`}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
