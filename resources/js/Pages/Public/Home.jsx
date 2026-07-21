import React, { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Activity, ArrowRight, BarChart3, BookOpen, ChevronDown, CircleDollarSign, LogIn, Moon, Search, ShieldCheck, TrendingUp, UserCircle } from 'lucide-react';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';
import LoginDetails from '../../Components/SystemSettings/LoginDetails';

const navItems = [
    ['Workspace', '#workspace'],
    ['Coins', '#coins'],
    ['Replay', '#features'],
    ['Journal', '#features'],
    ['Process', '#process'],
];

const coinDescriptions = {
    BTC: 'Bitcoin is the largest crypto asset by market value and is often used as the market benchmark.',
    ETH: 'Ether powers Ethereum, a network for smart contracts, applications, and tokenized assets.',
    SOL: 'Solana is a high-throughput smart-contract network designed for fast, low-cost transactions.',
};

const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const formatPrice = (value) => {
    const parsed = number(value);
    if (parsed === null) return 'Unavailable';
    const digits = parsed >= 1000 ? 2 : parsed >= 1 ? 2 : 6;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(parsed);
};

const formatCompact = (value) => {
    const parsed = number(value);
    return parsed === null ? '—' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(parsed);
};

export default function Home() {
    const [applogo, setApplogo] = useState('');
    const [heroImage, setHeroImage] = useState('');
    const [isLoginMenuOpen, setIsLoginMenuOpen] = useState(false);
    const [theme, setTheme] = useState('dark');
    const [featuredCoins, setFeaturedCoins] = useState([]);
    const [coinStatus, setCoinStatus] = useState('loading');
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

    useEffect(() => {
        const controller = new AbortController();
        setCoinStatus('loading');

        fetch('/api/featured-coins', { headers: { Accept: 'application/json' }, signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) throw new Error('Unable to load featured coins.');
                return response.json();
            })
            .then((payload) => {
                setFeaturedCoins(Array.isArray(payload?.items) ? payload.items : []);
                setCoinStatus(Array.isArray(payload?.items) && payload.items.length ? 'ready' : 'empty');
            })
            .catch((error) => {
                if (error.name !== 'AbortError') setCoinStatus('error');
            });

        return () => controller.abort();
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
                        {navItems.map(([item, href]) => (
                            <a
                                key={item}
                                href={href}
                                className={`h-10 rounded-md px-3 text-sm font-semibold transition ${isDark ? 'text-gray-300 hover:bg-skin-black-light hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                            >
                                {item}
                            </a>
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
                <section id="workspace" className="relative mx-auto grid min-h-[calc(100vh-65px)] max-w-7xl grid-cols-1 gap-10 overflow-hidden px-4 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] lg:items-center">
                    <div className="max-w-2xl">
                        <div className={`mb-5 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${isDark ? 'border-gray-700 bg-black-table-color text-gray-200' : 'border-gray-300 bg-white text-slate-700'}`}>
                            <BarChart3 size={15} />
                            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" />
                            Built for deliberate practice
                        </div>
                        <h1 className={`font-poppins text-4xl font-bold leading-tight sm:text-6xl ${isDark ? 'text-white' : 'text-slate-950'}`}>
                            Train your trading process, not just your entries.
                        </h1>
                        <p className={`mt-5 max-w-xl text-base leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            A chart-first replay terminal for practicing execution, documenting decisions, and turning every simulated trade into useful feedback.
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
                        <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 border-t border-slate-700/40 pt-5">
                            {[
                                ['Replay', 'Candle by candle'],
                                ['Execute', 'Risk planned'],
                                ['Review', 'Journal backed'],
                            ].map(([value, label]) => (
                                <div key={value}>
                                    <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</div>
                                    <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`overflow-hidden rounded-xl border shadow-2xl shadow-blue-950/20 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}>
                        <div className={`flex h-12 items-center border-b px-4 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-2 text-xs font-bold"><span className="flex h-7 w-7 items-center justify-center rounded bg-[#2962ff] text-white"><TrendingUp size={14} /></span> BTCUSDT</div>
                            <div className="ml-3 text-[10px] text-slate-500">Perpetual · 15m</div>
                            <div className="ml-auto flex items-center gap-2 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Replay ready</div>
                        </div>
                        <div className="relative h-[330px] overflow-hidden bg-[linear-gradient(rgba(120,123,134,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(120,123,134,.08)_1px,transparent_1px)] bg-[size:48px_48px] sm:h-[420px]">
                            {heroImage && <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.07]" />}
                            <svg viewBox="0 0 700 380" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-label="Trading replay preview">
                                <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2962ff" stopOpacity=".22"/><stop offset="1" stopColor="#2962ff" stopOpacity="0"/></linearGradient></defs>
                                <path d="M0 300 C70 270 95 290 140 240 S220 260 260 205 S335 235 385 165 S465 195 510 120 S610 150 700 72 L700 380 L0 380Z" fill="url(#area)" />
                                <path d="M0 300 C70 270 95 290 140 240 S220 260 260 205 S335 235 385 165 S465 195 510 120 S610 150 700 72" fill="none" stroke="#2962ff" strokeWidth="3" />
                                <line x1="510" y1="0" x2="510" y2="380" stroke="#5b8cff" strokeDasharray="7 6" strokeWidth="2" />
                                <rect x="512" y="0" width="188" height="380" fill="#070a10" opacity=".67" />
                            </svg>
                            <div className="absolute left-[64%] top-4 rounded bg-[#2962ff] px-2 py-1 text-[10px] font-bold text-white">Replay start</div>
                            <div className={`absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2 rounded-lg border p-2 backdrop-blur ${isDark ? 'border-[#2a2e39] bg-[#0b0e14]/90' : 'border-slate-200 bg-white/90'}`}>
                                {[[Activity, 'Replay', 'Step through price'], [ShieldCheck, 'Risk', 'Plan before entry'], [BookOpen, 'Journal', 'Review the process']].map(([Icon, title, copy]) => (
                                    <div key={title} className="flex items-center gap-2 p-2"><Icon size={16} className="shrink-0 text-[#2962ff]" /><div><div className="text-[11px] font-bold">{title}</div><div className="hidden text-[9px] text-slate-500 sm:block">{copy}</div></div></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="coins" className={`border-t px-4 py-14 ${isDark ? 'border-gray-800 bg-skin-black' : 'border-slate-200 bg-white'}`}>
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div className="max-w-2xl">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#2962ff]"><CircleDollarSign size={16} />Featured markets</div>
                                <h2 className="mt-2 text-3xl font-bold">Know the assets before you practice.</h2>
                                <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>A quick view of three widely followed crypto assets, using Bybit spot-market data and available fundamentals.</p>
                            </div>
                            <div className="text-xs text-slate-500">Informational data may be delayed. Not investment advice.</div>
                        </div>

                        {coinStatus === 'loading' && (
                            <div className="mt-7 grid gap-4 md:grid-cols-3" aria-label="Loading featured coin information">
                                {[0, 1, 2].map((item) => <div key={item} className={`h-72 animate-pulse rounded-xl border ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-slate-50'}`} />)}
                            </div>
                        )}

                        {(coinStatus === 'error' || coinStatus === 'empty') && (
                            <div className={`mt-7 rounded-xl border p-6 text-sm ${isDark ? 'border-[#2a2e39] bg-[#131722] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`} role="status">
                                Live market details are temporarily unavailable. You can still sign in and use the replay workspace.
                            </div>
                        )}

                        {coinStatus === 'ready' && (
                            <div className="mt-7 grid gap-4 md:grid-cols-3">
                                {featuredCoins.map((coin) => {
                                    const base = coin.market?.base_coin || coin.market?.symbol?.replace(/USDT$/, '') || 'Coin';
                                    const change = number(coin.stats?.change_24h_percent);
                                    const unavailable = number(coin.stats?.last_price) === null;
                                    return (
                                        <article key={coin.market?.symbol || base} className={`rounded-xl border p-5 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-slate-50'}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    {coin.fundamentals?.logo_url ? <img src={coin.fundamentals.logo_url} alt="" className="h-10 w-10 rounded-full object-contain" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2962ff]/15 text-xs font-bold text-[#5b8cff]">{base}</span>}
                                                    <div className="min-w-0"><h3 className="truncate text-base font-bold">{coin.fundamentals?.name || base}</h3><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{base}/USDT · Bybit spot</div></div>
                                                </div>
                                                {coin.fundamentals?.market_cap_rank && <span className="rounded bg-[#2962ff]/10 px-2 py-1 text-[10px] font-bold text-[#5b8cff]">Rank #{coin.fundamentals.market_cap_rank}</span>}
                                            </div>
                                            <div className="mt-5 flex items-end justify-between gap-3"><div><div className="text-[10px] uppercase tracking-wider text-slate-500">Current price</div><div className="mt-1 text-2xl font-bold tabular-nums">{formatPrice(coin.stats?.last_price)}</div></div>{change !== null && <div className={`text-sm font-bold tabular-nums ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</div>}</div>
                                            <dl className={`mt-5 grid grid-cols-2 gap-3 border-y py-3 ${isDark ? 'border-[#2a2e39]' : 'border-slate-200'}`}>
                                                {[['24h high', formatPrice(coin.stats?.high_24h)], ['24h low', formatPrice(coin.stats?.low_24h)], ['24h volume', formatCompact(coin.stats?.volume_24h)], ['Market cap', formatCompact(coin.fundamentals?.market_cap)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[9px] uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 truncate text-xs font-semibold tabular-nums">{value}</dd></div>)}
                                            </dl>
                                            <p className={`mt-4 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{coinDescriptions[base] || 'Review the market structure and risk before starting a simulated trade.'}</p>
                                            {(unavailable || coin.warnings?.length > 0) && <p className="mt-3 text-[10px] text-amber-500">{unavailable ? 'Live exchange statistics are currently unavailable.' : 'Some fundamentals are currently unavailable.'}</p>}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                <section id="features" className={`border-t px-4 py-10 ${isDark ? 'border-gray-800 bg-skin-black' : 'border-slate-200 bg-white'}`}>
                    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[
                            ['Try your strategy', 'Turn an idea into a repeatable paper-trading session before risking real capital.'],
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

                <section id="process" className={`border-t px-4 py-14 ${isDark ? 'border-gray-800 bg-black-screen-color' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="mx-auto max-w-7xl">
                        <div className="mb-8 max-w-xl"><div className="text-xs font-bold uppercase tracking-[0.2em] text-[#2962ff]">One repeatable loop</div><h2 className="mt-2 text-3xl font-bold">A workspace designed around improvement.</h2></div>
                        <div className="grid gap-3 md:grid-cols-4">
                            {['Choose a market', 'Replay the setup', 'Execute the plan', 'Journal the result'].map((item, index) => (
                                <div key={item} className={`rounded-lg border p-5 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}><div className="mb-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#2962ff]/15 text-xs font-bold text-[#5b8cff]">0{index + 1}</div><div className="text-sm font-bold">{item}</div></div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer className={`border-t px-4 py-6 ${isDark ? 'border-gray-800 bg-skin-black text-slate-500' : 'border-slate-200 bg-white text-slate-500'}`}>
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs sm:flex-row">
                    <span>&copy; {new Date().getFullYear()} BacktradeLab. Educational simulation only.</span>
                    <div className="flex gap-5">
                        <Link href="/privacy-policy" className="hover:text-[#5b8cff]">Privacy Policy</Link>
                        <Link href="/terms-of-service" className="hover:text-[#5b8cff]">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
