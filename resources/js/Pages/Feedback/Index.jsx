import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Bug, CheckCircle2, Gauge, Lightbulb, MessageSquarePlus, Send, Sparkles, WandSparkles } from 'lucide-react';
import { useTheme } from '../../Context/ThemeContext';

const categories = [
    ['enhancement', 'Enhancement', WandSparkles, 'Improve an existing workflow'],
    ['feature', 'Additional feature', Sparkles, 'Suggest a new capability'],
    ['bug', 'Bug report', Bug, 'Something is not working'],
    ['usability', 'Usability', Lightbulb, 'Make the interface easier'],
    ['performance', 'Performance', Gauge, 'Report slowness or delay'],
    ['other', 'Other', MessageSquarePlus, 'Share another observation'],
];

const statusStyles = {
    submitted: 'bg-slate-500/15 text-slate-400', reviewing: 'bg-blue-500/15 text-blue-400', planned: 'bg-violet-500/15 text-violet-400',
    in_progress: 'bg-amber-500/15 text-amber-400', completed: 'bg-emerald-500/15 text-emerald-400', declined: 'bg-red-500/15 text-red-400',
};

export default function FeedbackIndex() {
    const { theme } = useTheme();
    const isDark = theme === 'bg-skin-black';
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({ category: 'enhancement', title: '', description: '' });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const loadItems = () => axios.get('/feedback/items').then(({ data }) => setItems(data.feedback ?? [])).catch(() => setError('Unable to load your feedback history.')).finally(() => setLoading(false));
    useEffect(() => { loadItems(); }, []);

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true); setError(''); setMessage('');
        try {
            const { data } = await axios.post('/feedback/items', { ...form, page_url: window.location.href });
            setItems((current) => [data.feedback, ...current]);
            setForm({ category: form.category, title: '', description: '' });
            setMessage(data.message);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to submit feedback.');
        } finally { setSubmitting(false); }
    };

    const panel = isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white';
    const field = isDark ? 'border-[#2a2e39] bg-[#0b0e14] text-white' : 'border-slate-200 bg-slate-50 text-slate-900';

    return <><Head title="Feedback" /><div className={`mx-auto max-w-6xl space-y-4 py-2 ${isDark ? 'text-[#d1d4dc]' : 'text-slate-900'}`}>
        <div><div className="text-xs font-bold uppercase tracking-[.18em] text-[#2962ff]">Help shape BacktradeLab</div><h1 className={`mt-1 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Product feedback</h1><p className="mt-1 text-sm text-[#787b86]">Suggest improvements, request additions, or report anything slowing down your process.</p></div>
        <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
            <form onSubmit={submit} className={`rounded-xl border p-5 ${panel}`}>
                <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>What would you like us to know?</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">{categories.map(([value, label, Icon, copy]) => <button key={value} type="button" onClick={() => setForm((current) => ({ ...current, category: value }))} className={`flex items-center gap-3 rounded-lg border p-3 text-left ${form.category === value ? 'border-[#2962ff] bg-[#2962ff]/10' : isDark ? 'border-[#2a2e39] hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}><Icon size={17} className="shrink-0 text-[#5b8cff]"/><span><span className="block text-xs font-bold">{label}</span><span className="mt-0.5 block text-[10px] text-[#787b86]">{copy}</span></span></button>)}</div>
                <label className="mt-4 block text-xs font-semibold">Title<input value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} maxLength="160" required className={`mt-1.5 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:border-[#2962ff] ${field}`} placeholder="Briefly describe your idea or issue"/></label>
                <label className="mt-4 block text-xs font-semibold">Details<textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} minLength="10" maxLength="5000" required rows="6" className={`mt-1.5 w-full resize-y rounded-lg border p-3 text-sm outline-none focus:border-[#2962ff] ${field}`} placeholder="What happened, what did you expect, and how would this help?"/></label>
                {message && <div className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400"><CheckCircle2 size={14} className="mr-2 inline"/>{message}</div>}{error && <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}
                <button disabled={submitting} className="mt-4 flex h-10 items-center gap-2 rounded-lg bg-[#2962ff] px-4 text-xs font-bold text-white hover:bg-[#1e53e5] disabled:opacity-50"><Send size={14}/>{submitting ? 'Submitting…' : 'Submit feedback'}</button>
            </form>
            <section className={`rounded-xl border p-5 ${panel}`}><div className="flex items-center justify-between"><h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Your submissions</h2><span className="text-[10px] text-[#787b86]">{items.length} total</span></div><div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">{loading ? <p className="text-xs text-[#787b86]">Loading feedback…</p> : !items.length ? <div className="py-16 text-center text-xs text-[#787b86]">Your submitted feedback will appear here.</div> : items.map((item) => <article key={item.id} className={`rounded-lg border p-4 ${isDark ? 'border-[#2a2e39] bg-[#0b0e14]' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><div className={`truncate text-xs font-bold ${isDark ? 'text-[#d1d4dc]' : 'text-slate-900'}`}>{item.title}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-[#787b86]">{item.category.replace('_',' ')} · {new Date(item.createdAt).toLocaleDateString()}</div></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusStyles[item.status]}`}>{item.status.replace('_',' ')}</span></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-[#9598a1]">{item.description}</p>{item.adminResponse && <div className="mt-3 rounded-md border border-[#2962ff]/25 bg-[#2962ff]/5 p-3"><div className="text-[9px] font-bold uppercase tracking-wider text-[#5b8cff]">Team response</div><p className={`mt-1 text-xs leading-5 ${isDark ? 'text-[#d1d4dc]' : 'text-slate-700'}`}>{item.adminResponse}</p></div>}</article>)}</div></section>
        </div>
    </div></>;
}
