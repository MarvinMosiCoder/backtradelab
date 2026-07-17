import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Bell, Megaphone, Trash2, Volume2, VolumeX } from 'lucide-react';

const playPreview = () => {
    try { const ctx = new AudioContext(); const oscillator = ctx.createOscillator(); oscillator.connect(ctx.destination); oscillator.frequency.value = 880; oscillator.start(); oscillator.stop(ctx.currentTime + .18); } catch {}
};

export default function NotificationsViewAll({ notifications: initial = [], activeAlerts: initialAlerts = [], alertSoundEnabled = true }) {
    const [items, setItems] = useState(initial), [alerts, setAlerts] = useState(initialAlerts);
    const [filter, setFilter] = useState('all'), [sound, setSound] = useState(alertSoundEnabled);
    const visible = useMemo(() => items.filter(item => filter === 'all' || (filter === 'alerts' ? item.type === 'price alert' : item.type === 'announcement')), [filter, items]);
    const markRead = async item => {
        if (item.is_read) return;
        await axios.post('/notifications/read', { notification_id: item.id, source_type: item.source_type });
        setItems(current => current.map(value => value.key === item.key ? { ...value, is_read: true } : value));
    };
    const markAll = async () => { await axios.post('/notifications/read-all'); setItems(current => current.map(item => ({ ...item, is_read: true }))); };
    const toggleSound = async () => { const next = !sound; setSound(next); await axios.patch('/notification-preferences', { alert_sound_enabled: next }); if (next) playPreview(); };
    const removeAlert = async id => { await axios.delete(`/market-price-alerts/${id}`); setAlerts(current => current.filter(item => item.id !== id)); };

    return <div className="mx-auto max-w-5xl space-y-5">
        <Head title="Notifications" />
        <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Notifications</h1><p className="text-sm text-[#787b86]">Price-alert history and BacktradeLab announcements.</p></div><div className="flex gap-2"><button onClick={toggleSound} className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold">{sound ? <Volume2 size={16}/> : <VolumeX size={16}/>} Alert sound {sound ? 'on' : 'off'}</button><button onClick={markAll} className="h-10 rounded-lg bg-[#2962ff] px-4 text-sm font-semibold text-white">Mark all read</button></div></header>
        {alerts.length > 0 && <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><h2 className="font-bold">Active live-market alerts</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{alerts.map(alert => <div key={alert.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span><b>{alert.symbol}</b> {alert.direction} {Number(alert.target_price).toLocaleString()}</span><button onClick={() => removeAlert(alert.id)} className="text-red-400" aria-label="Cancel alert"><Trash2 size={15}/></button></div>)}</div></section>}
        <div className="flex gap-2">{[['all','All'],['alerts','Alerts'],['announcements','Announcements']].map(([key,label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-4 py-2 text-xs font-bold ${filter === key ? 'bg-[#2962ff] text-white' : 'border'}`}>{label}</button>)}</div>
        <section className="overflow-hidden rounded-xl border">{visible.length ? visible.map(item => <button key={item.key} onClick={() => markRead(item)} className={`flex w-full gap-3 border-b p-4 text-left last:border-0 ${item.is_read ? 'opacity-70' : 'bg-[#2962ff]/5'}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.type === 'announcement' ? 'bg-violet-500/15 text-violet-400' : 'bg-amber-500/15 text-amber-400'}`}>{item.type === 'announcement' ? <Megaphone size={18}/> : <Bell size={18}/>}</span><span><span className="block text-xs font-bold uppercase text-[#787b86]">{item.type}</span><span className="mt-1 block text-sm">{item.content}</span><span className="mt-1 block text-xs text-[#787b86]">{new Date(item.created_at).toLocaleString()}</span></span></button>) : <div className="p-12 text-center text-sm text-[#787b86]">No notifications in this category.</div>}</section>
    </div>;
}
