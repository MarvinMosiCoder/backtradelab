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

function normalizeTagText(value) {
  return String(value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(', ');
}

export default function TradeReport({ refreshKey = 0 }) {
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

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>Trade Win/Loss Report</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Closed replay trades, grouped like exchange history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportReport('csv')}
            className="inline-flex h-8 items-center gap-2 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportReport('json')}
            className="inline-flex h-8 items-center gap-2 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700"
          >
            <Download size={14} />
            JSON
          </button>
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="inline-flex h-8 items-center gap-2 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
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

      <div className="px-4 pb-4">
        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
            <div className="text-sm font-semibold">Closed Trades</div>
            <div className="text-xs text-slate-400">
              {totalTrades ? `${pageStart + 1}-${pageEnd} of ${totalTrades}` : '0 trades'}, {summary.breakeven ?? 0} breakeven
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
                  <th className="px-3 py-2">Snapshots</th>
                  <th className="px-3 py-2">Journal</th>
                  <th className="px-3 py-2 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginatedTrades.length ? (
                  paginatedTrades.map((trade) => {
                    const pnl = Number(trade.pnl ?? 0);

                    return (
                      <React.Fragment key={trade.id}>
                        <tr className="hover:bg-slate-800/60">
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
                          <td className="whitespace-nowrap px-3 py-2">
                            <div className="flex gap-1">
                              {trade.entrySnapshotUrl ? (
                                <a
                                  href={trade.entrySnapshotUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-blue-200 hover:bg-slate-700"
                                >
                                  Entry
                                </a>
                              ) : (
                                <span className="rounded bg-slate-900 px-2 py-1 text-[10px] text-slate-600">Entry</span>
                              )}
                              {trade.exitSnapshotUrl ? (
                                <a
                                  href={trade.exitSnapshotUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-blue-200 hover:bg-slate-700"
                                >
                                  Exit
                                </a>
                              ) : (
                                <span className="rounded bg-slate-900 px-2 py-1 text-[10px] text-slate-600">Exit</span>
                              )}
                            </div>
                          </td>
                          <td className="min-w-48 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => editingTradeId === trade.id ? cancelJournalEdit() : startJournalEdit(trade)}
                                className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-800 px-2 text-[11px] font-semibold text-white hover:bg-slate-700"
                              >
                                {editingTradeId === trade.id ? <X size={13} /> : <Pencil size={13} />}
                                {editingTradeId === trade.id ? 'Close' : 'Edit'}
                              </button>
                              <div className="min-w-0">
                                <div className="truncate text-[11px] font-semibold text-slate-200">
                                  {trade.setupTag || 'No setup'}
                                </div>
                                <div className="truncate text-[10px] text-slate-500">
                                  {(trade.tags ?? []).length ? trade.tags.join(', ') : 'No tags'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${getResultClass(trade.result)}`}>
                              {trade.result}
                            </span>
                          </td>
                        </tr>
                        {editingTradeId === trade.id && (
                          <tr className="bg-slate-950/70">
                            <td colSpan={13} className="px-3 py-3">
                              <div className="grid gap-3 md:grid-cols-3">
                                <input
                                  value={journalDraft.setupTag ?? ''}
                                  onChange={(event) => updateJournalDraft('setupTag', event.target.value)}
                                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-xs text-white outline-none"
                                  placeholder="Setup tag"
                                />
                                <input
                                  value={journalDraft.tags ?? ''}
                                  onChange={(event) => updateJournalDraft('tags', event.target.value)}
                                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-xs text-white outline-none"
                                  placeholder="Tags, comma separated"
                                />
                                <input
                                  value={journalDraft.emotion ?? ''}
                                  onChange={(event) => updateJournalDraft('emotion', event.target.value)}
                                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-xs text-white outline-none"
                                  placeholder="Emotion"
                                />
                                <textarea
                                  value={journalDraft.entryReason ?? ''}
                                  onChange={(event) => updateJournalDraft('entryReason', event.target.value)}
                                  className="min-h-20 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none"
                                  placeholder="Entry reason"
                                />
                                <textarea
                                  value={journalDraft.exitReason ?? ''}
                                  onChange={(event) => updateJournalDraft('exitReason', event.target.value)}
                                  className="min-h-20 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none"
                                  placeholder="Exit reason"
                                />
                                <textarea
                                  value={journalDraft.mistake ?? ''}
                                  onChange={(event) => updateJournalDraft('mistake', event.target.value)}
                                  className="min-h-20 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none"
                                  placeholder="Mistake / improvement"
                                />
                                <textarea
                                  value={journalDraft.journalNotes ?? ''}
                                  onChange={(event) => updateJournalDraft('journalNotes', event.target.value)}
                                  className="min-h-24 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none md:col-span-3"
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
                                  className="inline-flex h-8 items-center gap-2 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700"
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
                    <td colSpan={13} className="px-3 py-10 text-center text-sm text-slate-500">
                      No closed trades yet. Close a replay position to populate the report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-3 py-2">
            <div className="text-xs text-slate-400">
              Page {safeCurrentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
                className="h-8 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
                className="h-8 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
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
