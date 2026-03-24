'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, RefreshCw, ChevronDown, Loader2, LogIn, PackageOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TrustBadge } from '@/components/TrustBadge';
import { DashboardSkeleton } from '@/components/Skeletons';

interface Purchase {
    id: string;
    product_title: string;
    store_name: string;
    total_price: number;
    status: string;
    savings: number;
    created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    'completed': { label: 'Entregue', color: 'bg-emerald-50 text-emerald-700' },
    'processing': { label: 'Em Trânsito', color: 'bg-blue-50 text-blue-700' },
    'pending': { label: 'Processando', color: 'bg-amber-50 text-amber-700' },
    'failed': { label: 'Falhou', color: 'bg-red-50 text-red-700' },
};

export default function PurchasesPage() {
    const router = useRouter();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [needsLogin, setNeedsLogin] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/dashboard');
                if (res.status === 401) { setNeedsLogin(true); createClient().auth.signOut().catch(() => {}); return; }
                if (res.ok) {
                    const data = await res.json();
                    setPurchases(data.recentPurchases || []);
                }
            } catch { /* empty */ } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

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
                <h2 className="text-lg font-bold text-surface-900 mb-2">Faça login para ver suas compras</h2>
                <button onClick={() => router.push('/login')} className="mt-4 px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold">
                    Fazer Login
                </button>
            </div>
        );
    }

    const totalSaved = purchases.reduce((sum, p) => sum + (p.savings || 0), 0);

    return (
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
            <div className="mb-6">
                <h1 className="text-xl font-bold text-surface-900">Histórico de Compras</h1>
                <p className="text-sm text-surface-500">
                    {purchases.length} compras{totalSaved > 0 && <> · Economia total: <span className="font-semibold text-brand-600">{formatCurrency(totalSaved)}</span></>}
                </p>
            </div>

            {purchases.length === 0 ? (
                <div className="text-center py-16">
                    <PackageOpen size={32} className="mx-auto text-surface-300 mb-4" />
                    <p className="text-sm text-surface-500">Nenhuma compra registrada ainda.</p>
                    <p className="text-xs text-surface-400 mt-1">Busque um produto e compre pelo ValorePro!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {purchases.map((purchase, i) => {
                        const expanded = expandedId === purchase.id;
                        const status = statusConfig[purchase.status] || statusConfig['pending'];

                        return (
                            <motion.div
                                key={purchase.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="bg-white rounded-2xl border border-surface-200 overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedId(expanded ? null : purchase.id)}
                                    className="w-full flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center text-surface-400 flex-shrink-0">
                                        <ShoppingBag size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-surface-800 truncate">{purchase.product_title}</p>
                                        <p className="text-xs text-surface-500">{purchase.store_name} · {formatDate(purchase.created_at)}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-semibold text-surface-900">{formatCurrency(purchase.total_price)}</p>
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <ChevronDown size={16} className={`text-surface-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                </button>

                                {expanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="px-4 pb-4 pt-0 border-t border-surface-100"
                                    >
                                        <div className="grid grid-cols-2 gap-3 pt-3 text-sm">
                                            <div>
                                                <span className="text-surface-500 text-xs">Loja</span>
                                                <p className="text-surface-800">{purchase.store_name}</p>
                                            </div>
                                            <div>
                                                <span className="text-surface-500 text-xs">Economia</span>
                                                <p className="font-semibold text-brand-600">
                                                    {purchase.savings > 0 ? `- ${formatCurrency(purchase.savings)}` : '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-surface-500 text-xs">Comprado em</span>
                                                <p className="text-surface-800">{formatDate(purchase.created_at)}</p>
                                            </div>
                                            <div>
                                                <span className="text-surface-500 text-xs">Status</span>
                                                <p className="text-surface-800">{status.label}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
