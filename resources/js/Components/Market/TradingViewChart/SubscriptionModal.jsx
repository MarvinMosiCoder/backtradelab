import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Check, CreditCard, Crown, ExternalLink, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useTheme } from '../../../Context/ThemeContext';

const FEATURES = ['Unlimited market replay', 'Paper trading sessions', 'Drawing tools and indicators', 'Trade journal and reports', 'Snapshots and saved progress'];

function createSubmissionToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function SubscriptionModal({ onClose, onTrialActivated }) {
  const { theme } = useTheme();
  const dark = theme === 'bg-skin-black';
  const [step, setStep] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [checkout, setCheckout] = useState({ enabled: false, mode: 'test', payment_methods: [], message: '' });
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [status, setStatus] = useState('');
  const [submissionToken] = useState(createSubmissionToken);
  const selected = plans.find(plan => plan.code === selectedCode) ?? plans[0];

  useEffect(() => {
    let cancelled = false;
    Promise.all([axios.get('/subscription-plans'), axios.get('/replay-access')]).then(([planResponse, accessResponse]) => {
      if (cancelled) return;
      const items = planResponse.data?.plans ?? [];
      setPlans(items);
      setCheckout(planResponse.data?.checkout ?? accessResponse.data?.checkout ?? {});
      setTrialAvailable(accessResponse.data?.trialAvailable === true);
      setSelectedCode((items.find(item => item.is_featured) ?? items[0])?.code ?? '');
    }).catch(() => setStatus('Unable to load subscription information.')).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const activateTrial = async () => {
    setActivatingTrial(true); setStatus('');
    try {
      const response = await axios.post('/replay-trial/activate');
      setTrialAvailable(false); setStatus(response.data?.message ?? 'Your free seven-day trial is active.');
      onTrialActivated?.(response.data);
    } catch (error) {
      setTrialAvailable(error.response?.data?.trialAvailable === true);
      setStatus(error.response?.data?.message ?? 'Unable to activate your free trial.');
    } finally { setActivatingTrial(false); }
  };

  const startCheckout = async () => {
    setSaving(true); setStatus('');
    try {
      const response = await axios.post('/subscription-checkouts', { plan: selected.code, submission_token: submissionToken });
      if (!response.data?.checkout_url) throw new Error('Checkout URL missing');
      window.location.assign(response.data.checkout_url);
    } catch (error) {
      setStatus(error.response?.data?.message ?? 'Unable to start secure PayMongo checkout.');
      setSaving(false);
    }
  };

  const shell = dark ? 'border-[#2a2e39] bg-[#0b0e14] text-white' : 'border-slate-200 bg-white text-slate-900';
  const surface = dark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-slate-50';
  return <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm"><section className={`my-auto w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl ${shell}`} aria-label="Replay subscription checkout">
    <header className={`flex items-start justify-between border-b px-5 py-4 sm:px-7 ${surface}`}><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#5b8cff]"><Sparkles size={14}/>Replay access</div><h2 className="mt-1 text-xl font-bold sm:text-2xl">Build your trading practice</h2><p className="mt-1 text-sm text-[#787b86]">Activate your free week or purchase one-time access through PayMongo.</p></div><button type="button" onClick={onClose} className="p-2 text-[#787b86]" aria-label="Close"><X size={19}/></button></header>
    {step === 'plans' && trialAvailable && <div className="mx-5 mt-5 flex flex-col justify-between gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 sm:mx-7 sm:flex-row sm:items-center"><div><div className="text-xs font-bold uppercase tracking-[.16em] text-emerald-500">Free trial</div><h3 className="mt-1 text-xl font-bold">7 days free</h3><p className="mt-1 text-sm text-[#787b86]">Your countdown starts only after activation and can be used once.</p></div><button type="button" disabled={activatingTrial} onClick={activateTrial} className="h-11 shrink-0 rounded-lg bg-emerald-500 px-5 text-sm font-bold text-white disabled:opacity-50">{activatingTrial ? 'Activating…' : 'Activate free week'}</button></div>}
    {step === 'plans' ? <div className="p-5 sm:p-7">{loading ? <div className="py-16 text-center text-[#787b86]">Loading plans…</div> : <div className="grid gap-3 md:grid-cols-3">{plans.map(plan => { const chosen = selectedCode === plan.code, configured = plan.price !== null && Number(plan.price) > 0, Icon = plan.is_featured ? Crown : Sparkles; return <button type="button" key={plan.id} disabled={!configured} onClick={() => setSelectedCode(plan.code)} className={`relative rounded-xl border p-5 text-left transition disabled:opacity-50 ${chosen ? 'border-[#2962ff] bg-[#2962ff]/10 shadow-[0_0_0_1px_#2962ff]' : surface}`}>{plan.is_featured && <span className="absolute right-3 top-3 rounded-full bg-[#2962ff] px-2 py-1 text-[9px] font-bold text-white">POPULAR</span>}<span className={`flex h-10 w-10 items-center justify-center rounded-lg ${chosen ? 'bg-[#2962ff] text-white' : 'bg-black/5 text-[#787b86]'}`}><Icon size={18}/></span><h3 className="mt-4 text-lg font-bold">{plan.name}</h3><p className="mt-1 text-2xl font-bold">{configured ? `${plan.currency} ${Number(plan.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Price pending'}</p><p className="mt-1 text-xs text-[#787b86]">{plan.duration_days} days · one-time payment</p><p className="mt-1 text-xs text-[#787b86]">{plan.description}</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#5b8cff]"><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${chosen ? 'border-[#2962ff] bg-[#2962ff] text-white' : 'border-[#434955]'}`}>{chosen && <Check size={12}/>}</span>{chosen ? 'Selected' : 'Select plan'}</div></button>; })}</div>}
      <div className={`mt-5 grid gap-2 rounded-xl border p-4 sm:grid-cols-2 ${surface}`}>{FEATURES.map(feature => <div key={feature} className="flex items-center gap-2 text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"><Check size={12}/></span>{feature}</div>)}</div>
      {status && <div className="mt-4 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-500">{status}</div>}
      <div className="mt-5 flex justify-end"><button type="button" disabled={!selected?.price} onClick={() => setStep('payment')} className="flex h-11 items-center gap-2 rounded-lg bg-[#2962ff] px-5 font-bold text-white disabled:opacity-50">Continue with {selected?.name}<ArrowRight size={16}/></button></div>
    </div> : <div className="grid md:grid-cols-[.8fr_1.2fr]"><aside className={`border-b p-5 sm:p-7 md:border-b-0 md:border-r ${surface}`}><button type="button" onClick={() => { setStep('plans'); setStatus(''); }} className="flex items-center gap-2 text-xs text-[#787b86]"><ArrowLeft size={14}/>Change plan</button><div className="mt-6 text-xs font-bold uppercase text-[#5b8cff]">Selected plan</div><h3 className="mt-2 text-2xl font-bold">{selected?.name}</h3><p className="mt-1 text-2xl font-bold">{selected?.currency} {Number(selected?.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p><p className="text-sm text-[#787b86]">{selected?.duration_days} days replay access</p><div className="mt-5 space-y-3">{FEATURES.map(feature => <div key={feature} className="flex items-center gap-2 text-xs"><Check size={13} className="text-emerald-500"/>{feature}</div>)}</div></aside>
      <div className="p-5 sm:p-7"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2962ff]/10 text-[#5b8cff]"><ShieldCheck size={24}/></div><h3 className="mt-4 text-xl font-bold">Secure PayMongo checkout</h3><p className="mt-2 text-sm leading-6 text-[#787b86]">You will continue to PayMongo to choose Card or GCash and authorize a one-time payment. Replay access activates only after BacktradeLab verifies the payment with PayMongo.</p>
        <div className={`mt-4 rounded-xl border p-4 ${surface}`}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-bold"><CreditCard size={17}/>Available methods</div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${checkout.mode === 'test' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'}`}>{checkout.mode} mode</span></div><p className="mt-2 text-sm capitalize text-[#787b86]">{checkout.payment_methods?.length ? checkout.payment_methods.join(' · ') : 'No methods currently available'}</p></div>
        {checkout.enabled && checkout.mode === 'test' && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-5 text-amber-600"><b>Sandbox payment:</b> no real money moves. For a successful card test, PayMongo documents card <code>4343 4343 4343 4345</code>, any future expiry, and any three-digit CVC. GCash test checkout supplies simulated success/failure actions. <a href="https://developers.paymongo.com/docs/testing" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold underline">Testing guide<ExternalLink size={11}/></a></div>}
        {!checkout.enabled && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{checkout.message || 'PayMongo checkout is unavailable.'}</div>}
        {status && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{status}</div>}
        <button type="button" disabled={!checkout.enabled || saving} onClick={startCheckout} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2962ff] font-bold text-white disabled:opacity-50">{saving ? 'Opening secure checkout…' : 'Continue to PayMongo'}<ExternalLink size={16}/></button><p className="mt-3 text-center text-[11px] text-[#787b86]">One-time purchase. No automatic renewal.</p></div>
    </div>}
  </section></div>;
}
