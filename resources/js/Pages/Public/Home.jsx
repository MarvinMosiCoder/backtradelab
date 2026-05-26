import React, { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowRight, BarChart3, ChevronDown, LogIn, Moon, Search, UserCircle } from 'lucide-react';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';
import LoginDetails from '../../Components/SystemSettings/LoginDetails';

const navItems = ['Products', 'Community', 'Market', 'More'];

export default function Home() {
    const [applogo, setApplogo] = useState('');
    const [heroImage, setHeroImage] = useState('');
    const [isLoginMenuOpen, setIsLoginMenuOpen] = useState(false);
    const [theme, setTheme] = useState('dark');
    const isDark = theme === 'dark';

    useEffect(() => {
        getAppLogo().then((appLogo) => setApplogo(appLogo));
        LoginDetails().then((detail) => setHeroImage(detail.login_bg_image));

        try {
            const storedTheme = localStorage.getItem('backtradelab-theme');
            if (storedTheme === 'dark' || storedTheme === 'white') {
                setTheme(storedTheme);
            }
        } catch {}
    }, []);

    const toggleTheme = () => {
        setTheme((currentTheme) => {
            const nextTheme = currentTheme === 'dark' ? 'white' : 'dark';

            try {
                localStorage.setItem('backtradelab-theme', nextTheme);
            } catch {}

            return nextTheme;
        });
    };

    return (
        <div className={`min-h-screen ${isDark ? 'bg-black-screen-color text-white' : 'bg-slate-50 text-slate-950'}`}>
            <nav className={`sticky top-0 z-50 border-b px-4 py-3 backdrop-blur ${isDark ? 'border-gray-800 bg-skin-black/95' : 'border-slate-200 bg-white/95'}`}>
                <div className="mx-auto flex max-w-7xl items-center gap-3">
                    <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-gray-300 bg-white'}`}>
                            {applogo ? (
                                <img src={applogo} className="h-full w-full object-contain p-1" alt="BacktradeLab logo" />
                            ) : (
                                <span className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>BT</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className={`truncate font-poppins text-lg font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                                BacktradeLab
                            </div>
                            <div className="hidden text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:block">
                                Trading replay lab
                            </div>
                        </div>
                    </Link>

                    <div className="hidden flex-[1.7] items-center justify-center gap-2 lg:flex">
                        <div className={`flex h-10 w-[min(320px,30vw)] items-center gap-2 rounded-md border px-3 ${isDark ? 'border-gray-700 bg-black-table-color text-gray-400' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                            <Search size={16} className="shrink-0" />
                            <input
                                type="search"
                                placeholder="Search"
                                className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500 ${isDark ? 'text-white' : 'text-slate-950'}`}
                            />
                        </div>
                        {navItems.map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={`h-10 rounded-md px-3 text-sm font-semibold transition ${isDark ? 'text-gray-300 hover:bg-skin-black-light hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex flex-1 justify-end">
                        <button
                            type="button"
                            onClick={() => setIsLoginMenuOpen((current) => !current)}
                            className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${isDark ? 'border-gray-700 bg-black-table-color text-white hover:bg-skin-black-light' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100'}`}
                            aria-haspopup="menu"
                            aria-expanded={isLoginMenuOpen}
                        >
                            <UserCircle size={18} />
                            <span className="hidden sm:inline">Login</span>
                            <ChevronDown size={14} />
                        </button>

                        {isLoginMenuOpen && (
                            <div className={`absolute right-0 top-12 w-56 rounded-md border p-2 shadow-2xl ${isDark ? 'border-gray-700 bg-skin-black' : 'border-slate-200 bg-white'}`}>
                                <Link
                                    href="/login"
                                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold ${isDark ? 'text-white hover:bg-skin-black-light' : 'text-slate-900 hover:bg-slate-100'}`}
                                >
                                    <LogIn size={16} />
                                    Sign in
                                </Link>
                                <button
                                    type="button"
                                    onClick={toggleTheme}
                                    className={`mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${isDark ? 'text-gray-300 hover:bg-skin-black-light' : 'text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <Moon size={16} />
                                    {isDark ? 'White theme' : 'Dark theme'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <main>
                <section className="mx-auto grid min-h-[calc(100vh-65px)] max-w-7xl grid-cols-1 gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center">
                    <div className="max-w-2xl">
                        <div className={`mb-5 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${isDark ? 'border-gray-700 bg-black-table-color text-gray-200' : 'border-gray-300 bg-white text-slate-700'}`}>
                            <BarChart3 size={15} />
                            Replay. Journal. Improve.
                        </div>
                        <h1 className={`font-poppins text-4xl font-bold leading-tight sm:text-6xl ${isDark ? 'text-white' : 'text-slate-950'}`}>
                            Backtest your trades with a focused replay workspace.
                        </h1>
                        <p className={`mt-5 max-w-xl text-base leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            BacktradeLab gives traders a dark, practical space for chart replay, drawing tools, paper positions, snapshots, and trade reviews.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/login"
                                className={`inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-bold transition ${isDark ? 'bg-white text-skin-black hover:bg-gray-200' : 'bg-skin-black text-white hover:bg-skin-black-light'}`}
                            >
                                Sign in
                                <ArrowRight size={16} />
                            </Link>
                            <a
                                href="#features"
                                className={`inline-flex h-11 items-center rounded-md border px-4 text-sm font-semibold transition ${isDark ? 'border-gray-700 bg-black-table-color text-gray-200 hover:bg-skin-black-light hover:text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950'}`}
                            >
                                Explore features
                            </a>
                        </div>
                    </div>

                    <div className={`overflow-hidden rounded-md border shadow-2xl ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-slate-200 bg-white'}`}>
                        {heroImage ? (
                            <img
                                src={heroImage}
                                className="h-[360px] w-full object-cover sm:h-[480px]"
                                alt="BacktradeLab workspace"
                            />
                        ) : (
                            <div className={`flex h-[360px] items-center justify-center sm:h-[480px] ${isDark ? 'bg-black-table-color' : 'bg-slate-100'}`}>
                                <div className={`h-28 w-28 animate-pulse rounded-md ${isDark ? 'bg-skin-black-light' : 'bg-slate-200'}`} />
                            </div>
                        )}
                    </div>
                </section>

                <section id="features" className={`border-t px-4 py-10 ${isDark ? 'border-gray-800 bg-skin-black' : 'border-slate-200 bg-white'}`}>
                    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-3">
                        {[
                            ['Replay Chart', 'Step through candles, pick prices, and practice entries without leaving the chart.'],
                            ['Drawing Tools', 'Mark structure with lines, boxes, Fibonacci, text notes, and duplicated setups.'],
                            ['Trade Review', 'Capture entry and exit snapshots, then review closed trades in reports.'],
                        ].map(([title, description]) => (
                            <div key={title} className={`rounded-md border p-5 ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-slate-200 bg-slate-50'}`}>
                                <h2 className={`font-poppins text-lg font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
                                <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
