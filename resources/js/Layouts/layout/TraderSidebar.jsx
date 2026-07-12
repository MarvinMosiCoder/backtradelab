import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { BarChart3, BookOpen, CandlestickChart, ChevronLeft, CircleHelp, CreditCard, KeyRound, LayoutDashboard, MessageSquarePlus, UserRound } from 'lucide-react';
import { useSidebar } from '../../Context/SidebarContext';
import { useTheme } from '../../Context/ThemeContext';

const items = [
    { label: 'Workspace', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Market chart', href: '/market', icon: CandlestickChart },
    { label: 'Trade journal', href: '/trade-report', icon: BookOpen },
    { label: 'Subscription', href: '/subscription', icon: CreditCard },
    { label: 'Feedback', href: '/feedback', icon: MessageSquarePlus },
    { label: 'Profile', href: '/profile', icon: UserRound },
    { label: 'Change password', href: '/change_password', icon: KeyRound },
    { label: 'How to use', href: '/help', icon: CircleHelp },
];

export default function TraderSidebar() {
    const { url } = usePage();
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    const { theme } = useTheme();
    const isDark = theme === 'bg-skin-black';

    return (
        <aside className={`${isSidebarOpen ? 'w-56' : 'w-0 lg:w-16'} fixed bottom-0 left-0 top-14 z-[100] shrink-0 overflow-hidden border-r transition-[width] duration-200 lg:relative lg:top-0 ${isDark ? 'border-[#2a2e39] bg-[#131722] text-[#d1d4dc]' : 'border-slate-200 bg-white text-slate-700'}`}>
            <div className="flex h-full w-56 flex-col p-2 lg:w-auto">
                <div className={`mb-2 flex items-center gap-2 rounded-md border px-3 py-2 ${isDark ? 'border-[#2a2e39] bg-[#0b0e14]' : 'border-slate-200 bg-slate-50'}`}>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.7)]" />
                    <span className={`${!isSidebarOpen ? 'lg:hidden' : ''} text-[10px] font-semibold uppercase tracking-[0.16em] text-[#787b86]`}>Replay ready</span>
                </div>

                <nav className="space-y-1">
                    {items.map(({ label, href, icon: Icon }) => {
                        const active = url === href || (href === '/dashboard' && url.startsWith('/dashboard'));
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => window.innerWidth < 1024 && toggleSidebar(false)}
                                className={`flex h-10 items-center gap-3 rounded-md px-3 text-xs font-semibold transition ${
                                    active
                                        ? 'bg-[#2962ff] text-white shadow-[0_6px_20px_rgba(41,98,255,.22)]'
                                        : isDark ? 'text-[#b2b5be] hover:bg-[#2a2e39] hover:text-white' : 'hover:bg-slate-100'
                                }`}
                                title={label}
                            >
                                <Icon size={17} className="shrink-0" />
                                <span className={!isSidebarOpen ? 'lg:hidden' : ''}>{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={`mt-auto rounded-md border p-3 ${!isSidebarOpen ? 'lg:hidden' : ''} ${isDark ? 'border-[#2a2e39] bg-[#0b0e14]' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-2 text-xs font-semibold"><BarChart3 size={15} className="text-[#2962ff]" /> Practice mode</div>
                    <p className="mt-1 text-[10px] leading-4 text-[#787b86]">Replay, execute, journal, and improve your process.</p>
                </div>

                <button type="button" onClick={() => toggleSidebar()} className="mt-2 hidden h-8 items-center justify-center rounded-md text-[#787b86] hover:bg-white/10 lg:flex" title="Collapse navigation">
                    <ChevronLeft size={16} className={!isSidebarOpen ? 'rotate-180' : ''} />
                </button>
            </div>
        </aside>
    );
}
