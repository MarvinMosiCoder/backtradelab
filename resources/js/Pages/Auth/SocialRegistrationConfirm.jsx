import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

export default function SocialRegistrationConfirm({ pending, legal }) {
    const { errors = {} } = usePage().props;
    const [accepted, setAccepted] = useState(false);
    const [saving, setSaving] = useState(false);
    const submit = event => {
        event.preventDefault(); setSaving(true);
        router.post('/social-registration/confirm', { accepted }, { onFinish: () => setSaving(false) });
    };
    const cancel = () => router.delete('/social-registration/confirm');

    return <div className="flex min-h-screen items-center justify-center bg-[#0b0e14] p-4 text-white">
        <Head title="Confirm account" />
        <section className="w-full max-w-lg rounded-2xl border border-[#2a2e39] bg-[#131722] p-6 shadow-2xl sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2962ff]/15 text-[#5b8cff]"><ShieldCheck /></div>
            <h1 className="mt-5 text-2xl font-bold">Create your BacktradeLab account?</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">You selected {pending.provider}. Review the account and legal information before continuing.</p>
            <div className="mt-5 rounded-xl border border-[#2a2e39] bg-[#0b0e14] p-4">
                <div className="font-semibold">{pending.name}</div><div className="mt-1 text-sm text-slate-400">{pending.email}</div>
            </div>
            <form onSubmit={submit} className="mt-5">
                <label className="flex items-start gap-3 rounded-xl border border-[#2a2e39] p-4 text-sm leading-6">
                    <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1" />
                    <span>I have read and agree to the <Link className="text-[#5b8cff] underline" href="/terms-of-service" target="_blank">Terms of Service</Link> and <Link className="text-[#5b8cff] underline" href="/privacy-policy" target="_blank">Privacy Policy</Link>, effective {legal.effective_date}.</span>
                </label>
                {errors.accepted && <p className="mt-2 text-sm text-red-400">{errors.accepted}</p>}
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button type="button" onClick={cancel} className="h-11 rounded-lg border border-[#2a2e39] font-semibold">Cancel</button>
                    <button disabled={!accepted || saving} className="h-11 rounded-lg bg-[#2962ff] font-semibold disabled:opacity-40">{saving ? 'Creating…' : 'Create account'}</button>
                </div>
            </form>
        </section>
    </div>;
}
