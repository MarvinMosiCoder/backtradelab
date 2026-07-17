import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, Crown, ExternalLink, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useTheme } from '../../../Context/ThemeContext';

const FEATURES = ['Unlimited market replay', 'Paper trading sessions', 'Drawing tools and indicators', 'Trade journal and reports', 'Snapshots and saved progress'];
const token = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16); globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};

export default function SubscriptionModal({ onClose, onTrialActivated }) {
  const { theme } = useTheme();
  const dark = theme === 'bg-skin-black';
  const [plans, setPlans] = useState([]), [selectedCode, setSelectedCode] = useState('');
  const [checkout, setCheckout] = useState({}), [trialAvailable, setTrialAvailable] = useState(false);
  const [activeAccess, setActiveAccess] = useState(null), [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false), [status, setStatus] = useState('');
  const [submissionToken] = useState(token);
  const selected = plans.find(plan => plan.code === selectedCode) ?? plans[0];
  const readOnly = Boolean(activeAccess);

  useEffect(() => {
    let cancelled = false;
    Promise.all([axios.get('/subscription-plans'), axios.get('/replay-access')]).then(([p, a]) => {
      if (cancelled) return;
      const items = p.data?.plans ?? [];
      setPlans(items); setCheckout(p.data?.checkout ?? a.data?.checkout ?? {});
      setTrialAvailable(a.data?.trialAvailable === true); setActiveAccess(a.data?.activeAccess ?? null);
      setSelectedCode((items.find(item => item.is_featured) ?? items[0])?.code ?? '');
    }).catch(() => setStatus('Unable to load subscription information.')).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const activateTrial = async () => {
    setSaving(true); setStatus('');
    try {
      const response = await axios.post('/replay-trial/activate');
      setStatus(response.data?.message); onTrialActivated?.(response.data);
    } catch (error) { setStatus(error.response?.data?.message ?? 'Unable to activate your trial.'); }
    finally { setSaving(false); }
  };
  const startCheckout = async () => {
    if (!selected || readOnly) return;
    setSaving(true); setStatus('');
    try {
      const response = await axios.post('/subscription-checkouts', { plan: selected.code, submission_token: submissionToken });
      if (!response.data?.checkout_url) throw new Error('Checkout URL missing');
      window.location.assign(response.data.checkout_url);
    } catch (error) { setStatus(error.response?.data?.message ?? 'Unable to start secure PayMongo checkout.'); setSaving(false); }
  };
  const shell = dark ? 'border-[#2a2e39] bg-[#0b0e14] text-white' : 'border-slate-200 bg-white text-slate-900';
  const surface = dark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-slate-50';

  return <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm">
    <section className={`my-auto w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl ${shell}`}>
      <header className={`flex items-start justify-between border-b px-5 py-4 sm:px-7 ${surface}`}>
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#5b8cff]"><Sparkles size={14}/>Replay access</div><h2 className="mt-1 text-2xl font-bold">Build your trading practice</h2><p className="mt-1 text-sm text-[#787b86]">Activate your free week or purchase one-time access through PayMongo.</p></div>
        <button type="button" onClick={onClose} aria-label="Close"><X size={19}/></button>
      </header>
      {(trialAvailable || activeAccess?.kind === 'trial') && <div className="mx-5 mt-5 flex flex-col justify-between gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 sm:mx-7 sm:flex-row sm:items-center">
        <div><div className="text-xs font-bold uppercase text-emerald-500">{activeAccess ? 'Active free trial' : 'Free trial'}</div><h3 className="mt-1 text-xl font-bold">7 days free</h3><p className="mt-1 text-sm text-[#787b86]">{activeAccess ? `Active until ${new Date(activeAccess.endsAt).toLocaleString()}. Plans are read-only while access is active.` : 'Your countdown starts only after activation and can be used once.'}</p></div>
        {!readOnly && <button disabled={saving} onClick={activateTrial} className="h-11 rounded-lg bg-emerald-500 px-5 text-sm font-bold text-white disabled:opacity-50">Activate free week</button>}
      </div>}
      <div className="p-5 sm:p-7">
        {loading ? <div className="py-16 text-center text-[#787b86]">Loading plans…</div> : <div className="grid gap-3 md:grid-cols-3">{plans.map(plan => {
          const configured = plan.price !== null && Number(plan.price) > 0;
          const chosen = activeAccess?.kind === 'paid' ? activeAccess.plan === plan.code : selectedCode === plan.code;
          const Icon = plan.is_featured ? Crown : Sparkles;
          return <button key={plan.id} type="button" disabled={!configured || readOnly} onClick={() => setSelectedCode(plan.code)} className={`relative rounded-xl border p-5 text-left disabled:opacity-70 ${chosen ? 'border-[#2962ff] bg-[#2962ff]/10 shadow-[0_0_0_1px_#2962ff]' : surface}`}>
            {chosen && readOnly && <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-bold text-white">ACTIVE</span>}
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2962ff]/10 text-[#5b8cff]"><Icon size={18}/></span><h3 className="mt-4 text-lg font-bold">{plan.name}</h3><p className="mt-1 text-2xl font-bold">{configured ? `${plan.currency} ${Number(plan.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Price pending'}</p><p className="mt-1 text-xs text-[#787b86]">{plan.duration_days} days · one-time payment</p><p className="mt-1 text-xs text-[#787b86]">{plan.description}</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#5b8cff]"><Check size={14}/>{chosen ? (readOnly ? 'Active plan' : 'Selected') : 'Select plan'}</div>
          </button>;
        })}</div>}
        <div className={`mt-5 grid gap-2 rounded-xl border p-4 sm:grid-cols-2 ${surface}`}>{FEATURES.map(feature => <div key={feature} className="flex items-center gap-2 text-sm"><Check size={13} className="text-emerald-500"/>{feature}</div>)}</div>
        {readOnly && <div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-500">Your {activeAccess.kind} access is active until {new Date(activeAccess.endsAt).toLocaleString()}. You can choose another plan after it expires.</div>}
        {status && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{status}</div>}
        {!readOnly && <div className="mt-5 rounded-xl border p-4 text-sm text-[#787b86]">
          <div className="flex items-center gap-2 font-bold text-current"><ShieldCheck size={17}/>Secure PayMongo checkout</div><p className="mt-2">Available methods: <span className="capitalize">{checkout.payment_methods?.join(' · ') || 'None'}</span></p>
          <button disabled={!selected?.price || !checkout.enabled || saving} onClick={startCheckout} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2962ff] font-bold text-white disabled:opacity-50">{saving ? 'Opening checkout…' : `Continue with ${selected?.name ?? 'plan'}`}<ExternalLink size={15}/></button>
        </div>}
      </div>
    </section>
  </div>;
}
