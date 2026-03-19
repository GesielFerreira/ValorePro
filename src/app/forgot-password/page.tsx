'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            await resetPassword(email);
            setSent(true);
        } catch {
            toast.error('Erro ao enviar email. Verifique o endereço.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-brand-50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="flex justify-center mb-8">
                    <Logo size="lg" />
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-surface-100 p-8">
                    {sent ? (
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} className="text-brand-500" />
                            </div>
                            <h2 className="text-xl font-bold text-surface-900 mb-2">Email enviado!</h2>
                            <p className="text-surface-500 text-sm mb-6">
                                Enviamos instruções de redefinição de senha para <strong>{email}</strong>.
                            </p>
                            <Link
                                href="/login"
                                className="inline-block w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-all"
                            >
                                Voltar ao Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 mb-4"
                            >
                                <ArrowLeft size={16} />
                                Voltar
                            </Link>

                            <h2 className="text-xl font-bold text-surface-900 mb-2">Esqueceu a senha?</h2>
                            <p className="text-surface-500 text-sm mb-6">
                                Digite seu email e enviaremos um link para redefinir sua senha.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
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
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        'Enviar link de redefinição'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
