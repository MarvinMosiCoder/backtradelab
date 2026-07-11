import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Check, Crown, Sparkles, X } from 'lucide-react';

const FEATURES = ['Unlimited market replay', 'Paper trading sessions', 'Drawing tools and indicators', 'Trade journal and reports', 'Snapshots and saved progress'];

export default function SubscriptionModal({ onClose }) {
  const [step, setStep] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [form, setForm] = useState({ plan: '', payment_method: 'gcash_manual', payment_reference: '' });
  const [proof, setProof] = useState(null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedPlan = plans.find((plan) => plan.code === form.plan) ?? plans[0];

  useEffect(() => {
    let cancelled = false;
    axios.get('/subscription-plans').then((response) => {
      if (cancelled) return;
      const items = response.data?.plans ?? [];
      setPlans(items);
      const preferred = items.find((item) => item.is_featured) ?? items[0];
      setForm((current) => ({ ...current, plan: preferred?.code ?? '' }));
    }).catch(() => setStatus('Unable to load subscription plans.')).finally(() => !cancelled && setLoadingPlans(false));
    return () => { cancelled = true; };
  }, []);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setStatus('');
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (proof) data.append('payment_proof', proof);
    try {
      await axios.post('/subscription-requests', data);
      setStatus('Payment request submitted. An admin will review it and notify you.');
    } catch (error) {
      const errors = error.response?.data?.errors;
      setStatus(errors ? Object.values(errors).flat()[0] : (error.response?.data?.message ?? 'Unable to submit request.'));
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
    <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[#2a2e39] bg-[#0b0e14] text-white shadow-[0_30px_100px_rgba(0,0,0,.65)]">
      <header className="flex items-start justify-between border-b border-[#2a2e39] bg-gradient-to-r from-[#131722] to-[#101827] px-5 py-4 sm:px-7">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#5b8cff]"><Sparkles size={14}/>Replay membership</div><h2 className="mt-1 text-xl font-bold sm:text-2xl">Build your trading practice</h2><p className="mt-1 text-sm text-[#787b86]">Choose a plan and submit your manual payment for approval.</p></div>
        <button type="button" onClick={onClose} className="ml-3 rounded-lg p-2 text-[#787b86] hover:bg-white/10 hover:text-white" aria-label="Close subscription"><X size={19}/></button>
      </header>

      {step === 'plans' ? <div className="p-5 sm:p-7">
        {loadingPlans?<div className="py-16 text-center text-[#787b86]">Loading plans…</div>:<div className="grid gap-3 md:grid-cols-3">{plans.map((plan) => { const Icon = plan.is_featured ? Crown : Sparkles; const selected = form.plan === plan.code; const configured = plan.price !== null; return <button key={plan.id} disabled={!configured} type="button" onClick={() => setForm((current) => ({...current, plan: plan.code}))} className={`relative rounded-xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${selected?'border-[#2962ff] bg-[#2962ff]/10 shadow-[0_0_0_1px_#2962ff]':'border-[#2a2e39] bg-[#131722] hover:border-[#434955]'}`}>{plan.is_featured&&<span className="absolute right-3 top-3 rounded-full bg-[#2962ff] px-2 py-1 text-[9px] font-bold uppercase">Popular</span>}<span className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected?'bg-[#2962ff]':'bg-white/5 text-[#787b86]'}`}><Icon size={18}/></span><h3 className="mt-4 text-lg font-bold">{plan.name}</h3><p className="mt-1 text-2xl font-bold">{configured?`${plan.currency} ${Number(plan.price).toLocaleString(undefined,{minimumFractionDigits:2})}`:'Price pending'}</p><p className="mt-1 text-xs text-[#b2b5be]">{plan.duration_days} days</p><p className="mt-1 text-xs text-[#787b86]">{plan.description}</p><div className={`mt-5 flex items-center gap-2 text-xs font-semibold ${selected?'text-[#7da2ff]':'text-[#787b86]'}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected?'border-[#2962ff] bg-[#2962ff]':'border-[#434955]'}`}>{selected&&<Check size={12}/>}</span>{configured?(selected?'Selected':'Select plan'):'Contact admin'}</div></button>; })}</div>}
        <div className="mt-5 grid gap-2 rounded-xl border border-[#2a2e39] bg-[#131722] p-4 sm:grid-cols-2">{FEATURES.map((feature)=><div key={feature} className="flex items-center gap-2 text-sm text-[#b2b5be]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"><Check size={12}/></span>{feature}</div>)}</div>
        <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row"><p className="text-xs text-[#787b86]">Prices are managed by the administrator and verified again when submitted.</p><button disabled={!selectedPlan?.price} type="button" onClick={() => setStep('payment')} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2962ff] px-5 text-sm font-bold hover:bg-blue-600 disabled:opacity-50 sm:w-auto">Continue with {selectedPlan?.name??'plan'}<ArrowRight size={16}/></button></div>
      </div> : <form onSubmit={submit} className="grid md:grid-cols-[.8fr_1.2fr]">
        <aside className="border-b border-[#2a2e39] bg-[#131722] p-5 sm:p-7 md:border-b-0 md:border-r"><button type="button" onClick={() => setStep('plans')} className="flex items-center gap-2 text-xs font-semibold text-[#787b86] hover:text-white"><ArrowLeft size={14}/>Change plan</button><div className="mt-6 text-xs font-bold uppercase tracking-wider text-[#5b8cff]">Selected plan</div><h3 className="mt-2 text-2xl font-bold">{selectedPlan?.name}</h3><p className="mt-1 text-2xl font-bold">{selectedPlan?.currency} {Number(selectedPlan?.price??0).toLocaleString(undefined,{minimumFractionDigits:2})}</p><p className="mt-1 text-sm text-[#b2b5be]">{selectedPlan?.duration_days} days replay access</p><div className="mt-5 space-y-3">{FEATURES.map((feature)=><div key={feature} className="flex items-center gap-2 text-xs text-[#b2b5be]"><Check size={13} className="text-emerald-400"/>{feature}</div>)}</div></aside>
        <div className="p-5 sm:p-7"><h3 className="text-lg font-bold">Submit payment details</h3><p className="mt-1 text-sm text-[#787b86]">Pay exactly <b className="text-white">{selectedPlan?.currency} {Number(selectedPlan?.price??0).toLocaleString(undefined,{minimumFractionDigits:2})}</b> through the administrator’s GCash account.</p><div className="mt-5 grid gap-4"><Field label="GCash reference number"><input required placeholder="Example: 1234 567 89012" value={form.payment_reference} onChange={(e)=>setForm({...form,payment_reference:e.target.value})}/></Field><Field label="Payment screenshot"><span className="rounded-lg border border-dashed border-[#434955] bg-[#131722] p-4 text-center font-normal text-[#787b86] hover:border-[#2962ff]"><input className="block w-full text-xs" type="file" accept="image/*" onChange={(e)=>setProof(e.target.files?.[0]??null)}/>{proof&&<span className="mt-2 block truncate text-emerald-400">{proof.name}</span>}</span></Field></div>{status&&<div className={`mt-4 rounded-lg border p-3 text-sm ${status.startsWith('Payment request')?'border-emerald-500/30 bg-emerald-500/10 text-emerald-300':'border-red-500/30 bg-red-500/10 text-red-300'}`}>{status}</div>}<button disabled={saving} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2962ff] font-bold hover:bg-blue-600 disabled:opacity-50">{saving?'Submitting…':'Submit for admin review'}{!saving&&<ArrowRight size={16}/>}</button><p className="mt-3 text-center text-[10px] text-[#787b86]">Access activates after the administrator verifies and approves payment.</p></div>
      </form>}
    </div>
  </div>;
}

function Field({ label, children }) {
  const content = children.type === 'input'
    ? React.cloneElement(children, { className: 'h-11 rounded-lg border border-[#2a2e39] bg-[#131722] px-3 text-sm text-white outline-none focus:border-[#2962ff]' })
    : children;
  return <label className="grid gap-1.5 text-xs font-semibold text-[#b2b5be]">{label}{content}</label>;
}
