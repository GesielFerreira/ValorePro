'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Trash2, Plus, Clock, Loader2, LogIn } from 'lucide-react';
import { DashboardSkeleton } from '@/components/Skeletons';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface Alert {
    id: string;
    product_name: string;
    search_term: string;
    target_price: number;
    current_price: number | null;
    best_price_found: number | null;
    best_store_name: string | null;
    status: string;
    last_checked_at: string | null;
    created_at: string;
}

export default function AlertsPage() {
    const router = useRouter();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [needsLogin, setNeedsLogin] = useState(false);

    // New Alert State
    const [isAdding, setIsAdding] = useState(false);
    const [newAlert, setNewAlert] = useState({ productName: '', searchTerm: '', targetPrice: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/alerts');
                if (res.status === 401) { setNeedsLogin(true); createClient().auth.signOut().catch(() => {}); return; }
                if (res.ok) {
                    const data = await res.json();
                    setAlerts(data.alerts || []);
                }
            } catch { /* empty */ } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function toggleAlert(id: string, currentStatus: string) {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            const res = await fetch(`/api/alerts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a));
                toast.success(newStatus === 'active' ? 'Alerta ativado' : 'Alerta pausado');
            }
        } catch {
            toast.error('Erro ao atualizar alerta');
        }
    }

    async function removeAlert(id: string) {
        try {
            const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setAlerts((prev) => prev.filter((a) => a.id !== id));
                toast.success('Alerta removido');
            }
        } catch {
            toast.error('Erro ao remover alerta');
        }
    }

    async function handleAddAlert(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productName: newAlert.productName,
                    searchTerm: newAlert.searchTerm,
                    targetPrice: parseFloat(newAlert.targetPrice)
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setAlerts([data.alert, ...alerts]);
                setIsAdding(false);
                setNewAlert({ productName: '', searchTerm: '', targetPrice: '' });
                toast.success('Alerta criado com sucesso');
            } else {
                toast.error(data.error || 'Erro ao criar alerta');
            }
        } catch {
            toast.error('Erro ao conectar com servidor');
        } finally {
            setIsSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 pt-6 flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
        );
    }

    if (needsLogin) {
        return (
            <div className="max-w-2xl mx-auto px-4 pt-6 text-center py-20">
                <LogIn size={32} className="mx-auto text-surface-400 mb-4" />
                <h2 className="text-lg font-bold text-surface-900 mb-2">Faça login para ver seus alertas</h2>
                <button onClick={() => router.push('/login')} className="mt-4 px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold">
                    Fazer Login
                </button>
            </div>
        );
    }

    const activeCount = alerts.filter((a) => a.status === 'active').length;

    return (
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-surface-900">Alertas de Preço</h1>
                    <p className="text-sm text-surface-500">{activeCount} alertas ativos</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all"
                >
                    <Plus size={16} /> Novo Alerta
                </button>
            </div>

            {/* Modal de Novo Alerta */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl border border-surface-200 shadow-xl w-full max-w-md overflow-hidden"
                    >
                        <div className="p-5 border-b border-surface-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-surface-900">Novo Alerta de Preço</h2>
                            <button onClick={() => setIsAdding(false)} className="text-surface-400 hover:text-surface-600">
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddAlert} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-surface-700 mb-1.5">Nome de Exibição</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: iPhone 15 Pro Max"
                                    value={newAlert.productName}
                                    onChange={(e) => setNewAlert({ ...newAlert, productName: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-surface-700 mb-1.5">Termo de Busca Exato</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: smartphone apple iphone 15 pro max 256gb"
                                    value={newAlert.searchTerm}
                                    onChange={(e) => setNewAlert({ ...newAlert, searchTerm: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                                />
                                <p className="text-xs text-surface-500 mt-1.5">Este é o termo exato que o robô vai procurar todos os dias.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-surface-700 mb-1.5">Preço Alvo (R$)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    placeholder="Ex: 5000.00"
                                    value={newAlert.targetPrice}
                                    onChange={(e) => setNewAlert({ ...newAlert, targetPrice: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                                />
                                <p className="text-xs text-surface-500 mt-1.5">Avisaremos quando o preço for igual ou menor a este valor.</p>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 text-surface-700 text-sm font-semibold hover:bg-surface-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-all disabled:opacity-70"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Criar Alerta'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {alerts.length === 0 ? (
                <div className="text-center py-16">
                    <Bell size={32} className="mx-auto text-surface-300 mb-4" />
                    <p className="text-sm text-surface-500">Nenhum alerta criado ainda.</p>
                    <p className="text-xs text-surface-400 mt-1">Crie alertas para acompanhar queda de preços.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {alerts.map((alert, i) => {
                        const isActive = alert.status === 'active';
                        const currentPrice = alert.current_price || alert.best_price_found || 0;
                        const diff = currentPrice ? ((currentPrice - alert.target_price) / currentPrice * 100).toFixed(0) : '0';
                        return (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className={`bg-white rounded-2xl border p-4 transition-all ${isActive ? 'border-surface-200' : 'border-surface-100 opacity-60'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-amber-50 text-amber-600' : 'bg-surface-100 text-surface-400'}`}>
                                        <Bell size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-surface-800 truncate">{alert.product_name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-surface-500">
                                                Alvo: <span className="font-semibold text-brand-600">{formatCurrency(alert.target_price)}</span>
                                            </span>
                                            {currentPrice > 0 && (
                                                <span className="text-xs text-surface-500">
                                                    Atual: {formatCurrency(currentPrice)}
                                                </span>
                                            )}
                                        </div>
                                        {currentPrice > 0 && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-amber-400 rounded-full transition-all"
                                                        style={{ width: `${Math.min(100, (alert.target_price / currentPrice) * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-medium text-surface-500">-{diff}%</span>
                                            </div>
                                        )}
                                        {alert.last_checked_at && (
                                            <p className="text-[10px] text-surface-400 mt-1.5 flex items-center gap-1">
                                                <Clock size={10} /> Verificado {formatDate(alert.last_checked_at)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => toggleAlert(alert.id, alert.status)}
                                            className={`p-2 rounded-lg transition-all ${isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-surface-400 hover:bg-surface-100'}`}
                                            title={isActive ? 'Pausar' : 'Ativar'}
                                        >
                                            {isActive ? <Bell size={16} /> : <BellOff size={16} />}
                                        </button>
                                        <button
                                            onClick={() => removeAlert(alert.id)}
                                            className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                            title="Remover"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
