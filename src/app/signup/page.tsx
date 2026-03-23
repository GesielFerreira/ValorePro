'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';

export default function SignUpPage() {
    const router = useRouter();
    const { signUp, signInWithGoogle } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const passwordChecks = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
    };
    const passwordValid = Object.values(passwordChecks).every(Boolean) && password === confirmPassword && password.length > 0;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name || !email || !passwordValid) return;

        setLoading(true);
        try {
            await signUp(email, password, name);
            setSuccess(true);
        } catch (err: any) {
            const msg = err?.message?.includes('already registered')
                ? 'Este email já está cadastrado'
                : 'Erro ao criar conta. Tente novamente.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-brand-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-surface-100 p-8 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} className="text-brand-500" />
                    </div>
                    <h2 className="text-xl font-bold text-surface-900 mb-2">Conta criada!</h2>
                    <p className="text-surface-500 text-sm mb-6">
                        Enviamos um email de confirmação para <strong>{email}</strong>.
                        Clique no link para ativar sua conta.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-all"
                    >
                        Ir para o Login
                    </Link>
                </motion.div>
            </div>
        );
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
                        Crie sua conta e comece a economizar
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-surface-100 p-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-6">Criar conta</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5">
                                Nome
                            </label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Seu nome completo"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </div>

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
                                    placeholder="Mínimo 8 caracteres"
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

                            {/* Password strength */}
                            {password.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {[
                                        { key: 'length', label: '8+ caracteres' },
                                        { key: 'upper', label: '1 letra maiúscula' },
                                        { key: 'number', label: '1 número' },
                                    ].map(({ key, label }) => (
                                        <div
                                            key={key}
                                            className={`flex items-center gap-1.5 text-xs ${passwordChecks[key as keyof typeof passwordChecks]
                                                    ? 'text-brand-500'
                                                    : 'text-surface-400'
                                                }`}
                                        >
                                            <CheckCircle2 size={12} />
                                            {label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5">
                                Confirmar Senha
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repita sua senha"
                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {confirmPassword.length > 0 && password !== confirmPassword && (
                                <p className="text-xs text-red-500 mt-1.5 font-medium">As senhas não coincidem</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !passwordValid}
                            className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Criando conta...
                                </>
                            ) : (
                                'Criar conta'
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
                        onClick={() => signInWithGoogle()}
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

                    {/* Login */}
                    <p className="text-center text-sm text-surface-500 mt-6">
                        Já tem conta?{' '}
                        <Link href="/login" className="text-brand-500 font-semibold hover:text-brand-600">
                            Fazer login
                        </Link>
                    </p>
                </div>

                {/* Terms */}
                <p className="text-center text-xs text-surface-400 mt-4 px-4">
                    Ao criar uma conta, você concorda com nossos{' '}
                    <a href="#" className="underline">Termos de Uso</a> e{' '}
                    <a href="#" className="underline">Política de Privacidade</a>.
                </p>
            </motion.div>
        </div>
    );
}
