import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Head } from '@inertiajs/react';

export default function AdminIndex() {
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true);
  const load=()=>axios.get('/admin/subscriptions/items').then(r=>setItems(r.data?.data??[])).finally(()=>setLoading(false));
  useEffect(() => {
    let cancelled = false;

    axios.get('/admin/subscriptions/items')
      .then((response) => {
        if (!cancelled) setItems(response.data?.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const review=async(id,status)=>{ await axios.put(`/admin/subscriptions/${id}`,{status}); load(); };
  return <><Head title="Subscription requests"/><div><h1 className="text-xl font-bold">Subscription requests</h1><div className="mt-4 overflow-x-auto rounded-lg border border-[#2a2e39]"><table className="min-w-full bg-[#131722] text-sm text-white"><thead><tr className="text-left text-[#787b86]"><th className="p-3">User</th><th className="p-3">Plan</th><th className="p-3">Reference</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{items.map(item=><tr key={item.id} className="border-t border-[#2a2e39]"><td className="p-3">{item.user?.name}<div className="text-xs text-[#787b86]">{item.user?.email}</div></td><td className="p-3">{item.plan}</td><td className="p-3">{item.payment_reference}</td><td className="p-3">{item.amount??'—'}</td><td className="p-3">{item.status}</td><td className="p-3 space-x-2">{item.status==='pending'&&<><button onClick={()=>review(item.id,'approved')} className="rounded bg-emerald-600 px-3 py-1">Approve</button><button onClick={()=>review(item.id,'rejected')} className="rounded bg-red-600 px-3 py-1">Reject</button></>}</td></tr>)}</tbody></table>{!loading&&!items.length&&<div className="p-6 text-center text-[#787b86]">No requests.</div>}</div></div></>;
}
