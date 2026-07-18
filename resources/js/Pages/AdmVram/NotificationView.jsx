import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useTheme } from '../../Context/ThemeContext';

export default function NotificationView({ page_title, notification }) {
    const { theme } = useTheme();
    const isDark = theme === 'bg-skin-black';

    return <>
        <Head title={page_title} />
        <div className={`mx-auto max-w-3xl space-y-4 ${isDark ? 'text-[#d1d4dc]' : 'text-slate-900'}`}>
            <Link href="/notifications/view-all-notifications" className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${isDark ? 'text-[#9598a1] hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}><ArrowLeft size={15}/>Back to notifications</Link>
            <article className={`overflow-hidden rounded-xl border ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}>
                <header className={`flex items-center gap-3 border-b px-5 py-4 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-400"><Bell size={18}/></span>
                    <div><div className="text-[10px] font-bold uppercase tracking-wider text-[#787b86]">{notification.type}</div><h1 className={`mt-0.5 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{page_title}</h1></div>
                </header>
                <div className={`p-5 text-sm leading-7 ${isDark ? 'text-[#d1d4dc]' : 'text-slate-700'}`}>{notification.content}</div>
            </article>
        </div>
    </>;
}
