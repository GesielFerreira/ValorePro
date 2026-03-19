'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email || !password) return;

        setLoading(true);
        try {
            await signIn(email, password);
            toast.success('Login realizado com sucesso!');
            router.push('/');
        } catch (err: any) {
            const msg = err?.message?.includes('Invalid login')
                ? 'Email ou senha incorretos'
                : 'Erro ao fazer login. Tente novamente.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleLogin() {
        try {
            await signInWithGoogle();
        } catch {
            toast.error('Erro ao conectar com Google');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-brand-50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Logo size="lg" />
                    </div>
                    <p className="text-surface-400 text-sm">
                        Busca inteligente de preços com IA
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-surface-100 p-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-6">Entrar</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5">
                                Email
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5">
                                Senha
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Forgot */}
                        <div className="text-right">
                            <Link
                                href="/forgot-password"
                                className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                            >
                                Esqueceu a senha?
                            </Link>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-surface-200" />
                        <span className="text-xs text-surface-400">ou</span>
                        <div className="flex-1 h-px bg-surface-200" />
                    </div>

                    {/* Google */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full py-2.5 rounded-xl border border-surface-200 bg-white text-sm font-medium text-surface-700 hover:bg-surface-50 transition-all flex items-center justify-center gap-2"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continuar com Google
                    </button>

                    {/* Register */}
                    <p className="text-center text-sm text-surface-500 mt-6">
                        Não tem conta?{' '}
                        <Link href="/signup" className="text-brand-500 font-semibold hover:text-brand-600">
                            Criar conta grátis
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
