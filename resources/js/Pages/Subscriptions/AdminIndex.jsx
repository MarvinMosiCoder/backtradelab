import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Head } from '@inertiajs/react';
import { FileImage, MessageCircle, RefreshCw } from 'lucide-react';
import PaymentChat from '../../Components/Subscriptions/PaymentChat';
import { useTheme } from '../../Context/ThemeContext';

const formatDate = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export default function AdminIndex() {
  const { theme } = useTheme();
  const dark = theme === 'bg-skin-black';
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [checking, setChecking] = useState(null);
  const [chatRequest, setChatRequest] = useState(null), [notice, setNotice] = useState({ type: '', text: '' });
  const [filters, setFilters] = useState({ provider: '', status: '', mode: '' });
  const surface = dark ? 'border-[#2a2e39] bg-[#131722] text-white' : 'border-slate-200 bg-white text-slate-900';
  const muted = dark ? 'text-[#787b86]' : 'text-slate-500';
  const control = dark ? 'border-[#2a2e39] bg-[#0b0e14] text-white' : 'border-slate-300 bg-white text-slate-900';

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await axios.get('/admin/subscriptions/items', { params: filters }); setItems(response.data?.data || []); }
    catch { setNotice({ type: 'error', text: 'Unable to load provider transactions.' }); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const reconcile = async item => {
    setChecking(item.id); setNotice({ type: '', text: '' });
    try { const response = await axios.post(`/admin/subscriptions/${item.id}/reconcile`); setNotice({ type: 'success', text: `Transaction is ${response.data?.payment?.status || 'updated'}.` }); await load(); }
    catch (error) { setNotice({ type: 'error', text: error.response?.data?.message || 'Unable to recheck this transaction.' }); }
    finally { setChecking(null); }
  };

  return <><Head title="Payment transactions"/>{chatRequest && <PaymentChat request={chatRequest} onClose={() => setChatRequest(null)}/>}<div className={dark ? 'text-white' : 'text-slate-900'}>
    <div><h1 className="text-xl font-bold">Payment transactions</h1><p className={`mt-1 text-sm ${muted}`}>Monitor PayMongo sessions and view archived manual records. Payment access is activated only by verified provider state.</p></div>
    {notice.text && <div role="status" className={`mt-4 rounded-lg border p-3 text-sm ${notice.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-red-500/30 bg-red-500/10 text-red-500'}`}>{notice.text}</div>}
    <div className={`mt-4 grid gap-3 rounded-xl border p-4 sm:grid-cols-3 ${surface}`}><Filter label="Provider" value={filters.provider} set={value => setFilters(current => ({ ...current, provider: value }))} options={['paymongo', 'manual']} control={control}/><Filter label="Status" value={filters.status} set={value => setFilters(current => ({ ...current, status: value }))} options={['creating', 'pending', 'paid', 'failed', 'expired', 'archived', 'approved', 'rejected']} control={control}/><Filter label="Mode" value={filters.mode} set={value => setFilters(current => ({ ...current, mode: value }))} options={['test', 'live']} control={control}/></div>
    <div className={`mt-4 overflow-x-auto rounded-xl border ${surface}`}><table className="min-w-full text-sm"><thead><tr className={`text-left ${muted}`}><th className="p-3">User</th><th className="p-3">Plan</th><th className="p-3">Provider / mode</th><th className="p-3">Reference</th><th className="p-3">Amount</th><th className="p-3">Status / dates</th><th className="p-3">Action</th></tr></thead><tbody>{items.map(item => <tr key={item.id} className={`border-t ${dark ? 'border-[#2a2e39]' : 'border-slate-200'}`}><td className="p-3">{item.user?.name || 'Unknown'}<div className={`text-xs ${muted}`}>{item.user?.email}</div></td><td className="p-3 capitalize">{item.plan}<div className={`text-xs ${muted}`}>{item.duration_days ? `${item.duration_days} days` : 'legacy snapshot'}</div></td><td className="p-3 capitalize">{item.provider}<div className={`text-xs ${muted}`}>{item.legacy ? 'archived manual' : `${item.mode} · ${(item.payment_method || '').replaceAll('_', ' ')}`}</div></td><td className="max-w-[220px] break-all p-3 text-xs">{item.payment_reference || item.provider_checkout_id || '—'}</td><td className="p-3">{item.amount ? `${item.currency || 'PHP'} ${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td><td className="p-3 capitalize">{item.status}<div className={`mt-1 text-xs normal-case ${muted}`}>{item.paid_at ? `Paid ${formatDate(item.paid_at)}` : `Created ${formatDate(item.created_at)}`}</div></td><td className="p-3"><div className="flex flex-wrap gap-2">{item.payment_proof_url && <a href={item.payment_proof_url} target="_blank" rel="noreferrer" className={`rounded border p-1.5 ${dark ? 'border-[#434955]' : 'border-slate-300'}`} title="View archived proof"><FileImage size={15}/></a>}{item.legacy && item.messages_count > 0 && <button onClick={() => setChatRequest(item)} className={`flex items-center gap-1 rounded border px-2 py-1 ${dark ? 'border-[#434955]' : 'border-slate-300'}`}><MessageCircle size={14}/>Archive</button>}{item.provider === 'paymongo' && ['creating', 'pending'].includes(item.status) && <button disabled={checking === item.id} onClick={() => reconcile(item)} className="flex items-center gap-1 rounded bg-[#2962ff] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><RefreshCw size={14} className={checking === item.id ? 'animate-spin' : ''}/>Recheck</button>}</div></td></tr>)}</tbody></table>{loading && <div className={`p-8 text-center ${muted}`}>Loading transactions…</div>}{!loading && !items.length && <div className={`p-8 text-center ${muted}`}>No matching transactions.</div>}</div>
  </div></>;
}

function Filter({ label, value, set, options, control }) {
  return <label className="grid gap-1 text-xs font-semibold">{label}<select value={value} onChange={event => set(event.target.value)} className={`h-10 rounded-lg border px-3 text-sm ${control}`}><option value="">All</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
}
