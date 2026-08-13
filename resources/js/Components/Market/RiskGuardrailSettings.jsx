import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTheme } from '../../Context/ThemeContext';

const EMPTY = {
  mode: 'warning', maxDailyLoss: '', maxTradesPerDay: '',
  maxConcurrentPositions: '', maxConsecutiveLosses: '', isEnabled: false,
};

export default function RiskGuardrailSettings() {
  const { theme } = useTheme();
  const isDark = theme === 'bg-skin-black';
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('/market-backtest/risk-settings').then((response) => {
      const settings = response.data?.settings ?? {};
      setForm({
        mode: settings.mode ?? 'warning',
        maxDailyLoss: settings.maxDailyLoss ?? '',
        maxTradesPerDay: settings.maxTradesPerDay ?? '',
        maxConcurrentPositions: settings.maxConcurrentPositions ?? '',
        maxConsecutiveLosses: settings.maxConsecutiveLosses ?? '',
        isEnabled: Boolean(settings.isEnabled),
      });
    }).catch(() => setMessage('Unable to load risk guardrails.'));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const nullableNumber = (value) => value === '' ? null : Number(value);
    try {
      await axios.put('/market-backtest/risk-settings', {
        mode: form.mode,
        max_daily_loss: nullableNumber(form.maxDailyLoss),
        max_trades_per_day: nullableNumber(form.maxTradesPerDay),
        max_concurrent_positions: nullableNumber(form.maxConcurrentPositions),
        max_consecutive_losses: nullableNumber(form.maxConsecutiveLosses),
        is_enabled: form.isEnabled,
      });
      setMessage('Risk guardrails saved.');
    } catch (err) {
      const errors = err.response?.data?.errors;
      setMessage(errors ? Object.values(errors).flat()[0] : (err.response?.data?.message ?? 'Unable to save risk guardrails.'));
    } finally {
      setSaving(false);
    }
  };

  const surface = isDark ? 'border-gray-800 bg-skin-black text-white' : 'border-slate-200 bg-white text-slate-900';
  const field = isDark ? 'border-gray-700 bg-black-table-color text-white' : 'border-slate-300 bg-white text-slate-900';
  const muted = isDark ? 'text-gray-400' : 'text-slate-600';

  return (
    <form onSubmit={save} className={`rounded-lg border p-4 ${surface}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Risk Guardrails</h2>
          <p className={`mt-1 max-w-3xl text-xs ${muted}`}>Limits follow the UTC calendar day of the replay candle, not today’s wall-clock date. Warning mode allows the order; enforced mode blocks new entries.</p>
        </div>
        <label className={`flex items-center gap-2 text-xs font-semibold ${muted}`}>
          <input type="checkbox" checked={form.isEnabled} onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })} /> Enable guardrails
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className={`text-[11px] ${muted}`}>Mode<select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className={`mt-1 h-9 w-full rounded border px-2 text-xs ${field}`}><option value="warning">Warning only</option><option value="enforced">Enforced</option></select></label>
        {[
          ['maxDailyLoss', 'Max daily loss', '0.01'],
          ['maxTradesPerDay', 'Max trades/day', '1'],
          ['maxConcurrentPositions', 'Max concurrent', '1'],
          ['maxConsecutiveLosses', 'Loss streak limit', '1'],
        ].map(([key, label, step]) => (
          <label key={key} className={`text-[11px] ${muted}`}>{label}<input type="number" min={step} step={step} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder="No limit" className={`mt-1 h-9 w-full rounded border px-2 text-xs ${field}`} /></label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save guardrails'}</button>
        {message && <span className={`text-xs ${message.includes('saved') ? 'text-emerald-500' : 'text-red-400'}`}>{message}</span>}
      </div>
    </form>
  );
}
