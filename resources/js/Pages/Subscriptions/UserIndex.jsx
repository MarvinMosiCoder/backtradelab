import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { CalendarClock, Clock3, CreditCard, FileImage, MessageCircle, ShieldCheck } from 'lucide-react';
import SubscriptionModal from '../../Components/Market/TradingViewChart/SubscriptionModal';
import PaymentChat from '../../Components/Subscriptions/PaymentChat';

const STATUS_STYLES = {
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  trial: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  expired: 'border-red-500/30 bg-red-500/10 text-red-300',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  rejected: 'border-red-500/30 bg-red-500/10 text-red-300',
};

function formatDate(value) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function UserIndex({ subscription }) {
  const [showPlans, setShowPlans] = useState(false);
  const [chatRequest, setChatRequest] = useState(null);
  const statusLabel = subscription.status === 'active' ? 'Active membership' : subscription.status === 'trial' ? 'Free trial' : 'Replay expired';
  return <><Head title="Subscription"/>{showPlans&&<SubscriptionModal onClose={()=>setShowPlans(false)}/>} {chatRequest&&<PaymentChat request={chatRequest} onClose={()=>setChatRequest(null)}/>}<div className="mx-auto max-w-5xl space-y-5">
    <section className="overflow-hidden rounded-2xl border border-[#2a2e39] bg-[#131722] text-white"><div className="bg-gradient-to-r from-[#172554] via-[#131722] to-[#0b0e14] p-5 sm:p-7"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[subscription.status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{statusLabel}</div><h1 className="mt-4 text-2xl font-bold">Your replay subscription</h1><p className="mt-2 max-w-xl text-sm text-[#b2b5be]">Track your trial, paid access, and manual payment approval from one place.</p></div><button onClick={()=>setShowPlans(true)} className="h-11 rounded-lg bg-[#2962ff] px-5 text-sm font-bold hover:bg-blue-600">{subscription.allowed?'View plans':'Renew replay access'}</button></div></div>
      <div className="grid border-t border-[#2a2e39] sm:grid-cols-3"><Metric icon={CalendarClock} label="Trial ends" value={formatDate(subscription.trialEndsAt)}/><Metric icon={ShieldCheck} label="Paid access ends" value={formatDate(subscription.accessEndsAt)}/><Metric icon={Clock3} label="Time remaining" value={subscription.allowed?`${subscription.daysRemaining} day${subscription.daysRemaining===1?'':'s'}`:'No active access'}/></div>
    </section>

    <section><div className="mb-3"><h2 className="text-lg font-bold">Payment request history</h2><p className="text-sm text-[#787b86]">Manual submissions and their current administrator review status.</p></div><div className="overflow-hidden rounded-xl border border-[#2a2e39] bg-[#131722] text-white">
      {subscription.requests.length ? <div className="divide-y divide-[#2a2e39]">{subscription.requests.map((item)=><article key={item.id} className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"><div><div className="flex flex-wrap items-center gap-2"><span className="font-bold capitalize">{item.plan} plan</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[item.status]??STATUS_STYLES.pending}`}>{item.status}</span></div><div className="mt-2 grid gap-1 text-xs text-[#787b86] sm:grid-cols-2"><span>Reference: <b className="text-[#b2b5be]">{item.payment_reference}</b></span><span>Amount: <b className="text-[#b2b5be]">{item.amount?`PHP ${Number(item.amount).toLocaleString()}`:'Not provided'}</b></span><span>Submitted: {formatDate(item.created_at)}</span><span>Reviewed: {formatDate(item.reviewed_at)}</span></div>{item.admin_notes&&<div className="mt-3 rounded-lg border border-[#2a2e39] bg-[#0b0e14] p-3 text-xs text-[#b2b5be]">Admin note: {item.admin_notes}</div>}</div><div className="flex flex-wrap gap-2">{item.payment_proof_url&&<a href={item.payment_proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-[#2a2e39] px-3 py-2 text-xs font-semibold text-[#b2b5be]"><FileImage size={15}/>View proof</a>}<button onClick={()=>setChatRequest(item)} className="flex items-center gap-2 rounded-lg bg-[#2962ff] px-3 py-2 text-xs font-semibold"><MessageCircle size={15}/>Chat {item.messages_count?`(${item.messages_count})`:''}</button></div></article>)}</div>:<div className="p-10 text-center"><CreditCard className="mx-auto text-[#434955]"/><h3 className="mt-3 font-semibold">No payment requests yet</h3><p className="mt-1 text-sm text-[#787b86]">Your submissions will appear here.</p></div>}
    </div></section>
  </div></>;
}

function Metric({ icon: Icon, label, value }) {
  return <div className="flex items-center gap-3 border-b border-[#2a2e39] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2962ff]/10 text-[#5b8cff]"><Icon size={18}/></span><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-wider text-[#787b86]">{label}</div><div className="mt-1 truncate text-sm font-semibold">{value}</div></div></div>;
}
