import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, BarChart3, BookOpen, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';

const LoginLoaderOverlay = ({ isDark, applogo }) => {
    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 backdrop-blur-md ${isDark ? 'bg-[#070a10]/90' : 'bg-slate-100/90'}`}
            role="status"
            aria-live="polite"
            aria-label="Signing in. Securely preparing your workspace."
        >
            <div className={`relative w-full max-w-sm overflow-hidden rounded-2xl border p-7 text-center shadow-2xl ${isDark ? 'border-[#2a2e39] bg-[#131722] text-white shadow-blue-950/40' : 'border-slate-200 bg-white text-slate-950 shadow-slate-300/50'}`}>
                <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-[#2962ff]/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -right-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />

                <div className="relative mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-[#5b8cff]/30 bg-[#2962ff]/10 shadow-[0_0_30px_rgba(41,98,255,.18)]">
                    {applogo ? (
                        <img src={applogo} className="h-full w-full object-contain p-2" alt="" />
                    ) : (
                        <span className="font-poppins text-sm font-bold text-[#5b8cff]">BT</span>
                    )}
                </div>

                <div className="relative mt-5 flex items-center justify-center gap-2">
                    <h2 className="font-poppins text-lg font-bold">Signing in</h2>
                    <span className="flex items-end gap-1 pb-1" aria-hidden="true">
                        {[0, 150, 300].map((delay) => (
                            <span
                                key={delay}
                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5b8cff] motion-reduce:animate-none"
                                style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
                            />
                        ))}
                    </span>
                </div>
                <p className={`relative mt-2 text-sm ${isDark ? 'text-[#9598a1]' : 'text-slate-500'}`}>Securely preparing your workspace</p>
                <div className={`relative mt-6 h-1 overflow-hidden rounded-full ${isDark ? 'bg-[#2a2e39]' : 'bg-slate-100'}`} aria-hidden="true">
                    <span className="block h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#2962ff] to-[#5b8cff] motion-reduce:animate-none" />
                </div>
            </div>
        </div>
    );
};

const LoginPage = () => {
    const { errors: initialErrors } = usePage().props;
    const [errors, setErrors] = useState(initialErrors || {});
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [step, setStep] = useState('email');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [applogo, setApplogo] = useState('');
    const [theme, setTheme] = useState('dark');
    const isDark = theme === 'dark';
    const { updateAuth } = useAuth();

    useEffect(() => {
        getAppLogo().then((appLogo) => setApplogo(appLogo));

        try {
            const storedTheme = localStorage.getItem('backtradelab-theme');
            if (storedTheme === 'dark' || storedTheme === 'white') {
                setTheme(storedTheme);
            }
        } catch {}
    }, []);

    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            const timer = setTimeout(() => setErrors({}), 5000);
            return () => clearTimeout(timer);
        }
    }, [errors]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (step === 'email') {
            const normalizedEmail = email.trim().toLowerCase();
            if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
                setErrors({ email: 'Enter a valid email address.' });
                return;
            }
            setCheckingEmail(true);
            setErrors({});
            try {
                const { data } = await axios.post('/login/check-email', { email: normalizedEmail });
                if (!data?.exists) {
                    setErrors({ email: 'No BacktradeLab account was found for this email address.' });
                    return;
                }
                setEmail(normalizedEmail);
                setStep('password');
            } catch (requestError) {
                setErrors({
                    email: requestError.response?.data?.errors?.email?.[0]
                        || requestError.response?.data?.message
                        || 'Unable to check this email right now. Please try again.',
                });
            } finally {
                setCheckingEmail(false);
            }
            return;
        }
        setLoading(true);

        router.post(
            'login-save',
            { email, password },
            {
                onSuccess: (page) => {
                    updateAuth(page.props.auth);
                },
                onError: (newErrors) => {
                    setErrors(newErrors);
                },
                onFinish: () => setLoading(false),
            }
        );
    };

    return (
        <>
            {loading && <LoginLoaderOverlay isDark={isDark} applogo={applogo} />}
            <div className={`min-h-screen px-4 py-6 ${isDark ? 'bg-black-screen-color text-white' : 'bg-slate-50 text-slate-950'}`}>
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <Link href="/" className={`inline-flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}>
                        <ArrowLeft size={16} />
                        Back to home
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-gray-300 bg-white'}`}>
                            {applogo ? (
                                <img src={applogo} className="h-full w-full object-contain p-1" alt="BacktradeLab logo" />
                            ) : (
                                <span className={`text-xs font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>BT</span>
                            )}
                        </div>
                        <span className="font-poppins text-sm font-bold">BacktradeLab</span>
                    </div>
                </div>

                <main className="mx-auto grid min-h-[calc(100vh-84px)] max-w-5xl items-center gap-10 py-8 lg:grid-cols-[1fr_440px]">
                    <aside className="hidden lg:block">
                        <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#2962ff]">Your practice desk</div>
                        <h1 className="mt-4 max-w-lg text-4xl font-bold leading-tight">Return to the chart with a process.</h1>
                        <p className={`mt-4 max-w-md text-sm leading-7 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Replay markets, execute planned risk, and keep every decision connected to your journal.</p>
                        <div className="mt-8 grid max-w-lg gap-3">
                            {[[BarChart3, 'Chart-first workspace', 'Market context stays visible while you practice.'], [ShieldCheck, 'Paper execution', 'Plan margin, leverage, stop, and target before entry.'], [BookOpen, 'Review loop', 'Snapshots and journal notes turn sessions into feedback.']].map(([Icon, title, copy]) => (
                                <div key={title} className={`flex items-center gap-4 rounded-lg border p-4 ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}>
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2962ff]/15 text-[#5b8cff]"><Icon size={18} /></div>
                                    <div><div className="text-sm font-bold">{title}</div><div className="mt-1 text-xs text-slate-500">{copy}</div></div>
                                </div>
                            ))}
                        </div>
                    </aside>
                    <section className={`w-full rounded-xl border p-6 shadow-2xl ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'}`}>
                        <div className="mb-6">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Workspace online</div>
                            <h1 className={`font-poppins text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>Welcome back</h1>
                            <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Access your replay charts, paper trades, snapshots, and reports.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {step === 'email' && <label className="mb-4 block">
                                <span className={`mb-1 block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Email</span>
                                <div className={`flex h-11 items-center rounded-md border ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className={`flex h-full w-11 items-center justify-center border-r ${isDark ? 'border-gray-700 text-gray-400' : 'border-slate-200 text-slate-500'}`}>
                                        <Mail size={17} />
                                    </div>
                                    <input
                                        className={`min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none ring-0 placeholder:text-slate-500 focus:border-0 focus:outline-none focus:ring-0 ${isDark ? 'text-white' : 'text-slate-950'}`}
                                        type="email"
                                        value={email}
                                        placeholder="Enter email"
                                        onChange={(event) => setEmail(event.target.value)}
                                    />
                                </div>
                                {errors.email && (
                                    <span className="mt-1 block text-sm text-red-400">{errors.email}</span>
                                )}
                            </label>}

                            {step === 'password' && <label className="mb-2 block">
                                <span className={`mb-1 block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Password</span>
                                <div className={`flex h-11 items-center rounded-md border ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className={`flex h-full w-11 items-center justify-center border-r ${isDark ? 'border-gray-700 text-gray-400' : 'border-slate-200 text-slate-500'}`}>
                                        <Lock size={17} />
                                    </div>
                                    <input
                                        className={`min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none ring-0 placeholder:text-slate-500 focus:border-0 focus:outline-none focus:ring-0 ${isDark ? 'text-white' : 'text-slate-950'}`}
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        placeholder="Enter password"
                                        onChange={(event) => setPassword(event.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((current) => !current)}
                                        className={`flex h-full w-11 items-center justify-center ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-950'}`}
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className="mt-1 block text-sm text-red-400">{errors.password}</span>
                                )}
                                {errors.message && (
                                    <span className="mt-1 block text-sm text-red-400">{errors.message}</span>
                                )}
                            </label>}

                            <button
                                type="submit"
                                disabled={loading || checkingEmail}
                                className={`mt-5 h-11 w-full rounded-md px-4 font-poppins text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? 'bg-white text-skin-black hover:bg-gray-200' : 'bg-skin-black text-white hover:bg-skin-black-light'}`}
                            >
                                {checkingEmail ? 'Checking email...' : step === 'email' ? 'Continue' : 'Sign in'}
                            </button>
                        </form>

                        {step === 'email' && <><div className="my-5 flex items-center gap-3">
                            <div className={`h-px flex-1 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />
                            <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                                Or
                            </span>
                            <div className={`h-px flex-1 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <a
                                href="/auth/google/redirect"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#dadce0] bg-white px-3 text-sm font-semibold text-[#3c4043] shadow-sm transition hover:bg-[#f8fafd]"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.27-4.74 3.27-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4 20.56 7.74 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.74 1 4 3.44 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                                </svg>
                                Google
                            </a>
                            <a
                                href="/auth/facebook/redirect"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#1877f2] bg-[#1877f2] px-3 text-sm font-semibold text-white shadow-sm transition hover:border-[#166fe5] hover:bg-[#166fe5]"
                            >
                                <span className="font-poppins text-base font-bold">f</span>
                                Facebook
                            </a>
                        </div></>}

                        <p className={`mt-4 text-center text-xs leading-5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            By signing in, you agree to our <Link href="/terms-of-service" className="font-semibold text-[#5b8cff] hover:underline">Terms of Service</Link> and acknowledge our <Link href="/privacy-policy" className="font-semibold text-[#5b8cff] hover:underline">Privacy Policy</Link>.
                        </p>

                        {step === 'password' && <div className={`mt-6 flex justify-center gap-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            <span>Forgot Password?</span>
                            <Link href="reset_password" className={`font-bold ${isDark ? 'text-gray-200 hover:text-white' : 'text-skin-black hover:text-skin-black-light'}`}>
                                Click here
                            </Link>
                        </div>}
                    </section>
                </main>
            </div>
        </>
    );
};

export default LoginPage;
