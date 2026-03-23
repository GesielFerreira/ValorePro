'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, ShoppingBag, Bell, ChevronRight, Wallet, Loader2, LogIn, Search, Clock, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DashboardSkeleton } from '@/components/Skeletons';


interface DashboardData {
    user: { name: string; email: string; plan: string; searchesToday: number; searchesLimit: number };
    stats: { totalSavings: number; totalPurchases: number; activeAlerts: number };
    recentPurchases: Array<{
        id: string; product_title: string; store_name: string;
        total_price: number; status: string; savings: number; created_at: string;
    }>;
    alerts: Array<{
        id: string; product_name: string; target_price: number;
        current_price: number; best_price_found: number; best_store_name: string;
        status: string; last_checked_at: string;
    }>;
    recentSearches: Array<{ id: string; query: string; created_at: string }>;
}

const statusColors: Record<string, string> = {
    'completed': 'bg-emerald-50 text-emerald-700',
    'processing': 'bg-blue-50 text-blue-700',
    'pending': 'bg-amber-50 text-amber-700',
    'failed': 'bg-red-50 text-red-700',
};

const statusLabels: Record<string, string> = {
    'completed': 'Entregue',
    'processing': 'Em trânsito',
    'pending': 'Processando',
    'failed': 'Falhou',
};

export default function DashboardPage() {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsLogin, setNeedsLogin] = useState(false);


    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/dashboard');
                if (res.status === 401) {
                    setNeedsLogin(true);
                    return;
                }
                if (res.ok) {
                    const dashboardData = await res.json();
                    setData(dashboardData);

                }
            } catch { /* empty */ } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="max-w-4xl mx-auto px-4 pt-6"><DashboardSkeleton /></div>;

    if (needsLogin) {
        return (
            <div className="max-w-4xl mx-auto px-4 pt-6 pb-8 text-center py-20">
                <LogIn size={32} className="mx-auto text-surface-400 mb-4" />
                <h2 className="text-lg font-bold text-surface-900 mb-2">Faça login para acessar</h2>
                <button onClick={() => router.push('/login')} className="mt-4 px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold">
                    Fazer Login
                </button>
            </div>
        );
    }

    if (!data) return null;

    const STATS = [
        { label: 'Economia Total', value: formatCurrency(data.stats.totalSavings), icon: TrendingDown, color: 'bg-brand-50 text-brand-600' },
        { label: 'Compras', value: String(data.stats.totalPurchases), icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
        { label: 'Alertas Ativos', value: String(data.stats.activeAlerts), icon: Bell, color: 'bg-amber-50 text-amber-600' },
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-8">
            {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between">
            <div>
                <h1 className="text-xl font-bold text-surface-900">Olá, {data.user.name} 👋</h1>
                <p className="text-sm text-surface-500">
                    {data.user.plan === 'free' || !data.user.plan ? (
                        <>Sem plano ativo · <Link href="/dashboard/plans" className="text-brand-500 font-medium hover:underline">Ativar plano</Link></>
                    ) : data.user.searchesLimit === -1 ? (
                        <>Plano {data.user.plan} · Buscas ilimitadas</>
                    ) : (
                        <>Plano {data.user.plan} · {data.user.searchesToday}/{data.user.searchesLimit} buscas hoje</>
                    )}
                </p>
            </div>
            {/* Install App Button */}
            <Link 
                href="/install" 
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-xl text-sm font-semibold transition-colors"
            >
                <Smartphone size={16} />
                Instalar App
            </Link>
        </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {STATS.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-white rounded-2xl border border-surface-200 p-4"
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                            <stat.icon size={18} />
                        </div>
                        <p className="text-lg font-bold text-surface-900">{stat.value}</p>
                        <p className="text-xs text-surface-500">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Savings banner */}
            {data.stats.totalSavings > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl border border-surface-200 p-5 mb-6"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-surface-800">Relatório de Economia</h2>
                            <p className="text-xs text-surface-500">Total economizado com ValorePro</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full">
                            <Wallet size={14} />
                            {formatCurrency(data.stats.totalSavings)} economizados
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Recent purchases */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl border border-surface-200 overflow-hidden"
            >
                <div className="flex items-center justify-between p-4 border-b border-surface-100">
                    <h2 className="text-sm font-semibold text-surface-800">Compras Recentes</h2>
                    <Link href="/dashboard/purchases" className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
                        Ver todas <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="divide-y divide-surface-100">
                    {data.recentPurchases.length === 0 ? (
                        <div className="p-8 text-center text-sm text-surface-400">
                            Nenhuma compra ainda. Busque um produto e compre pelo ValorePro!
                        </div>
                    ) : (
                        data.recentPurchases.map((purchase) => (
                            <div key={purchase.id} className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors cursor-pointer">
                                <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center text-surface-400">
                                    <ShoppingBag size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-surface-800 truncate">{purchase.product_title}</p>
                                    <p className="text-xs text-surface-500">{purchase.store_name} · {formatDate(purchase.created_at)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-surface-900">{formatCurrency(purchase.total_price)}</p>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[purchase.status] || 'bg-surface-100 text-surface-600'}`}>
                                        {statusLabels[purchase.status] || purchase.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>

            {/* Recent searches */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl border border-surface-200 overflow-hidden mt-6"
            >
                <div className="flex items-center justify-between p-4 border-b border-surface-100">
                    <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
                        <Clock size={16} className="text-surface-500" /> Histórico de Buscas
                    </h2>
                </div>

                <div className="divide-y divide-surface-100">
                    {data.recentSearches.length === 0 ? (
                        <div className="p-8 text-center text-sm text-surface-400">
                            Você ainda não realizou nenhuma busca.
                        </div>
                    ) : (
                        data.recentSearches.map((search) => (
                            <Link
                                href={`/results?q=${encodeURIComponent(search.query)}`}
                                key={search.id}
                                className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center text-surface-400">
                                    <Search size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-surface-800 truncate capitalize">{search.query}</p>
                                    <p className="text-xs text-surface-500">{formatDate(search.created_at)}</p>
                                </div>
                                <div>
                                    <ChevronRight size={16} className="text-surface-300" />
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
}
