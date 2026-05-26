import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../Context/AuthContext';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';

const LoginLoaderOverlay = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black-screen-color">
            <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-gray-200 dot-1" />
                <span className="h-3 w-3 rounded-full bg-gray-500 dot-2" />
                <span className="h-3 w-3 rounded-full bg-gray-200 dot-3" />
            </div>
        </div>
    );
};

const LoginPage = () => {
    const { errors: initialErrors } = usePage().props;
    const [errors, setErrors] = useState(initialErrors || {});
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
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

    const handleSubmit = (event) => {
        event.preventDefault();
        setLoading(true);

        router.post(
            'login-save',
            { email, password },
            {
                onSuccess: (page) => {
                    updateAuth(page.props.auth);
                },
                onError: (newErrors) => {
                    if (newErrors.email) setEmail('');
                    if (newErrors.password) setPassword('');
                    setErrors(newErrors);
                },
                onFinish: () => setLoading(false),
            }
        );
    };

    return (
        <>
            {loading && <LoginLoaderOverlay />}
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

                <main className="mx-auto flex min-h-[calc(100vh-84px)] max-w-md items-center">
                    <section className={`w-full rounded-md border p-5 shadow-2xl ${isDark ? 'border-gray-700 bg-skin-black' : 'border-slate-200 bg-white'}`}>
                        <div className="mb-6">
                            <h1 className={`font-poppins text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>Sign in</h1>
                            <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Access your replay charts, paper trades, snapshots, and reports.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <label className="mb-4 block">
                                <span className={`mb-1 block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Email</span>
                                <div className={`flex h-11 items-center rounded-md border focus-within:border-gray-500 ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className={`flex h-full w-11 items-center justify-center border-r ${isDark ? 'border-gray-700 text-gray-400' : 'border-slate-200 text-slate-500'}`}>
                                        <Mail size={17} />
                                    </div>
                                    <input
                                        className={`min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-500 ${isDark ? 'text-white' : 'text-slate-950'}`}
                                        type="email"
                                        value={email}
                                        placeholder="Enter email"
                                        onChange={(event) => setEmail(event.target.value)}
                                    />
                                </div>
                                {errors.email && (
                                    <span className="mt-1 block text-sm text-red-400">{errors.email}</span>
                                )}
                            </label>

                            <label className="mb-2 block">
                                <span className={`mb-1 block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Password</span>
                                <div className={`flex h-11 items-center rounded-md border focus-within:border-gray-500 ${isDark ? 'border-gray-700 bg-black-table-color' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className={`flex h-full w-11 items-center justify-center border-r ${isDark ? 'border-gray-700 text-gray-400' : 'border-slate-200 text-slate-500'}`}>
                                        <Lock size={17} />
                                    </div>
                                    <input
                                        className={`min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-500 ${isDark ? 'text-white' : 'text-slate-950'}`}
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
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`mt-5 h-11 w-full rounded-md px-4 font-poppins text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? 'bg-white text-skin-black hover:bg-gray-200' : 'bg-skin-black text-white hover:bg-skin-black-light'}`}
                            >
                                {loading ? 'Logging in, please wait...' : 'Sign in'}
                            </button>
                        </form>

                        <div className="my-5 flex items-center gap-3">
                            <div className={`h-px flex-1 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />
                            <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                                Or
                            </span>
                            <div className={`h-px flex-1 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <a
                                href="/auth/google/redirect"
                                className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${isDark ? 'border-gray-700 bg-black-table-color text-gray-200 hover:bg-skin-black-light hover:text-white' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100'}`}
                            >
                                <span className="font-poppins text-base font-bold">G</span>
                                Google
                            </a>
                            <a
                                href="/auth/facebook/redirect"
                                className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${isDark ? 'border-gray-700 bg-black-table-color text-gray-200 hover:bg-skin-black-light hover:text-white' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100'}`}
                            >
                                <span className="font-poppins text-base font-bold">f</span>
                                Facebook
                            </a>
                        </div>

                        <div className={`mt-6 flex justify-center gap-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            <span>Forgot Password?</span>
                            <Link href="reset_password" className={`font-bold ${isDark ? 'text-gray-200 hover:text-white' : 'text-skin-black hover:text-skin-black-light'}`}>
                                Click here
                            </Link>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
};

export default LoginPage;
