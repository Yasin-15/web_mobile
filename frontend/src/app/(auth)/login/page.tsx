"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../utils/api';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data } = await api.post('/auth/login', { email, password });

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            if (data.user.role === 'super-admin') {
                router.push('/super-admin/dashboard');
            } else {
                router.push('/dashboard'); // Default for other roles
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>
            {/* Background blobs */}
            <div className="absolute top-0 -left-48 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
            <div className="absolute bottom-0 -right-48 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none"></div>

            <div className="z-10 w-full max-w-md p-8">
                <div className="glass-dark p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
                            <span className="text-white text-3xl font-serif italic font-bold">S</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome Back</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Sign in to your SchoolOS account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl animate-shake">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semi-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                                placeholder="yasin@schoolos.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semi-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex items-center justify-between text-xs px-1">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
                                <input type="checkbox" className="rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-0" />
                                <span>Remember me</span>
                            </label>
                            <Link href="/forgot-password" title="Coming soon!" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center text-slate-500 mt-8 text-sm">
                        Don't have an institution registered? <br />
                        <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap">Contact Sales</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
