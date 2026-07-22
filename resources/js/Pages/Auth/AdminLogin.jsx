import React, { useEffect, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';

export default function AdminLogin() {
    const { errors = {} } = usePage().props;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [logo, setLogo] = useState('');

    useEffect(() => {
        getAppLogo().then(setLogo).catch(() => {});
        const stopStart = router.on('start', () => setProcessing(true));
        const stopFinish = router.on('finish', () => setProcessing(false));
        return () => { stopStart(); stopFinish(); };
    }, []);

    const submit = (event) => {
        event.preventDefault();
        router.post('/admin/login', { email: email.trim(), password }, {
            preserveScroll: true,
            onFinish: () => setPassword(''),
        });
    };

    return (
        <main className="min-h-screen bg-[#070a10] px-4 py-10 text-white">
            <Head title="Administrator sign in" />
            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
                <section className="w-full rounded-2xl border border-slate-800 bg-[#131722] p-7 shadow-2xl shadow-black/40 sm:p-9">
                    <div className="mb-7 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-blue-400/30 bg-blue-500/10">
                            {logo ? <img src={logo} alt="" className="h-full w-full object-contain p-2" /> : <ShieldCheck className="h-7 w-7 text-blue-400" />}
                        </div>
                        <h1 className="mt-4 text-2xl font-bold">Administrator sign in</h1>
                        <p className="mt-2 text-sm text-slate-400">Authorized BacktradeLab staff accounts only</p>
                    </div>

                    {errors.message && <div role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errors.message}</div>}

                    <form onSubmit={submit} className="space-y-5">
                        <label className="block text-sm font-medium text-slate-200">
                            Email address
                            <span className="mt-2 flex items-center rounded-lg border border-slate-700 bg-[#0d111a] focus-within:border-blue-500">
                                <Mail className="ml-3 h-4 w-4 text-slate-500" />
                                <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border-0 bg-transparent px-3 py-3 text-white outline-none ring-0" />
                            </span>
                            {errors.email && <span className="mt-1 block text-xs text-red-300">{errors.email}</span>}
                        </label>

                        <label className="block text-sm font-medium text-slate-200">
                            Password
                            <span className="mt-2 flex items-center rounded-lg border border-slate-700 bg-[#0d111a] focus-within:border-blue-500">
                                <LockKeyhole className="ml-3 h-4 w-4 text-slate-500" />
                                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-0 bg-transparent px-3 py-3 text-white outline-none ring-0" />
                                <button type="button" onClick={() => setShowPassword((value) => !value)} className="mr-3 text-slate-400 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </span>
                            {errors.password && <span className="mt-1 block text-xs text-red-300">{errors.password}</span>}
                        </label>

                        <div className="flex justify-end"><Link href="/reset_password" className="text-sm text-blue-400 hover:text-blue-300">Forgot password?</Link></div>
                        <button type="submit" disabled={processing} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
                            {processing ? 'Signing in…' : 'Sign in to administration'}
                        </button>
                    </form>

                </section>
            </div>
        </main>
    );
}
