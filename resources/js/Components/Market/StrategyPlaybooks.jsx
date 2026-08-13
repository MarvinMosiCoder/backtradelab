import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTheme } from '../../Context/ThemeContext';

const EMPTY_FORM = {
  name: '', description: '', entryRules: '', confirmationRules: '', invalidationRules: '',
  stopRules: '', targetRules: '', checklistText: '', isActive: true,
};

export default function StrategyPlaybooks() {
  const { theme } = useTheme();
  const isDark = theme === 'bg-skin-black';
  const [playbooks, setPlaybooks] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/market-backtest/playbooks', { params: { include_archived: 1 } });
      setPlaybooks(response.data?.playbooks ?? []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Unable to load strategy playbooks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => { setForm(EMPTY_FORM); setEditingId(null); setError(''); };
  const edit = (playbook) => {
    setEditingId(playbook.id);
    setForm({
      name: playbook.name ?? '', description: playbook.description ?? '', entryRules: playbook.entryRules ?? '',
      confirmationRules: playbook.confirmationRules ?? '', invalidationRules: playbook.invalidationRules ?? '',
      stopRules: playbook.stopRules ?? '', targetRules: playbook.targetRules ?? '',
      checklistText: (playbook.checklist ?? []).join('\n'), isActive: Boolean(playbook.isActive),
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name,
      description: form.description || null,
      entry_rules: form.entryRules || null,
      confirmation_rules: form.confirmationRules || null,
      invalidation_rules: form.invalidationRules || null,
      stop_rules: form.stopRules || null,
      target_rules: form.targetRules || null,
      checklist: form.checklistText.split('\n').map((item) => item.trim()).filter(Boolean),
      is_active: form.isActive,
    };
    try {
      if (editingId) await axios.put(`/market-backtest/playbooks/${editingId}`, payload);
      else await axios.post('/market-backtest/playbooks', payload);
      reset();
      await load();
    } catch (err) {
      const validation = err.response?.data?.errors;
      setError(validation ? Object.values(validation).flat()[0] : (err.response?.data?.message ?? 'Unable to save playbook.'));
    } finally {
      setSaving(false);
    }
  };

  const archive = async (playbook) => {
    if (!window.confirm(`Archive “${playbook.name}”? Historical trades will keep their saved copy.`)) return;
    await axios.delete(`/market-backtest/playbooks/${playbook.id}`);
    if (editingId === playbook.id) reset();
    await load();
  };

  const surface = isDark ? 'border-gray-800 bg-skin-black text-white' : 'border-slate-200 bg-white text-slate-900';
  const field = isDark ? 'border-gray-700 bg-black-table-color text-white' : 'border-slate-300 bg-white text-slate-900';
  const muted = isDark ? 'text-gray-400' : 'text-slate-600';
  const button = isDark ? 'bg-skin-black-light text-gray-200 hover:bg-gray-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200';

  return (
    <div className={`rounded-lg border p-4 ${surface}`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold">Strategy Playbooks</h2>
        <p className={`mt-1 text-xs ${muted}`}>Define repeatable trade rules. One checklist item per line is required before an attached order can be placed.</p>
      </div>
      {error && <div className="mb-3 rounded border border-red-800 bg-red-950/50 p-2 text-xs text-red-200">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
        <div className="space-y-2">
          {loading ? <p className={`text-xs ${muted}`}>Loading playbooks…</p> : playbooks.length ? playbooks.map((playbook) => (
            <div key={playbook.id} className={`rounded border p-3 ${field} ${!playbook.isActive ? 'opacity-55' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-sm font-semibold">{playbook.name}</div><p className={`mt-1 text-xs ${muted}`}>{playbook.description || 'No description'} · {playbook.checklist.length} checklist items</p></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => edit(playbook)} className={`rounded px-2 py-1 text-xs ${button}`}>Edit</button>
                  {playbook.isActive && <button type="button" onClick={() => archive(playbook)} className="rounded bg-red-700 px-2 py-1 text-xs text-white">Archive</button>}
                </div>
              </div>
            </div>
          )) : <p className={`text-xs ${muted}`}>No playbooks yet. Create your first repeatable setup.</p>}
        </div>
        <form onSubmit={save} className="space-y-2">
          <input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Playbook name" className={`h-9 w-full rounded border px-3 text-sm ${field}`} />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" rows={2} className={`w-full rounded border p-3 text-xs ${field}`} />
          {[
            ['entryRules', 'Entry rules'], ['confirmationRules', 'Confirmation rules'], ['invalidationRules', 'Invalidation rules'],
            ['stopRules', 'Stop rules'], ['targetRules', 'Target rules'],
          ].map(([key, label]) => <textarea key={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={label} rows={2} className={`w-full rounded border p-3 text-xs ${field}`} />)}
          <textarea value={form.checklistText} onChange={(e) => setForm({ ...form, checklistText: e.target.value })} placeholder={'Pre-trade checklist (one item per line)\nTrend agrees with setup\nStop loss is defined'} rows={5} className={`w-full rounded border p-3 text-xs ${field}`} />
          <label className={`flex items-center gap-2 text-xs ${muted}`}><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active and available during order entry</label>
          <div className="flex gap-2">
            <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Update playbook' : 'Create playbook'}</button>
            {editingId && <button type="button" onClick={reset} className={`rounded px-4 py-2 text-xs font-semibold ${button}`}>Cancel</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
