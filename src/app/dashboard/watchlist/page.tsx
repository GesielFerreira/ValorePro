'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Loader2, Eye, Trash2, ExternalLink,
    TrendingDown, TrendingUp, Minus, Clock, AlertCircle,
    Bookmark,
} from 'lucide-react';
import Image from 'next/image';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface WatchlistItem {
    id: string;
    product_title: string;
    product_url: string;
    image_url: string | null;
    store_name: string;
    store_domain: string;
    initial_price: number;
    current_price: number | null;
    lowest_price: number | null;
    lowest_price_at: string | null;
    highest_price: number | null;
    shipping_cost: number;
    price_trend: 'rising' | 'falling' | 'stable';
    target_price: number | null;
    status: string;
    created_at: string;
    updated_at: string;
}

const TrendIcon = ({ trend }: { trend: string }) => {
    switch (trend) {
        case 'falling': return <TrendingDown size={14} className="text-emerald-500" />;
        case 'rising': return <TrendingUp size={14} className="text-red-500" />;
        default: return <Minus size={14} className="text-surface-400" />;
    }
};

const TrendLabel = ({ trend }: { trend: string }) => {
    switch (trend) {
        case 'falling': return <span className="text-[10px] font-medium text-emerald-600">Em queda</span>;
        case 'rising': return <span className="text-[10px] font-medium text-red-600">Subindo</span>;
        default: return <span className="text-[10px] font-medium text-surface-400">Estável</span>;
    }
};

export default function WatchlistPage() {
    const router = useRouter();
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<string | null>(null);

    const fetchItems = async () => {
        try {
            const res = await fetch('/api/watchlist');
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } catch {
            toast.error('Erro ao carregar watchlist.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchItems(); }, []);

    const handleRemove = async (id: string) => {
        setRemoving(id);
        try {
            const res = await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setItems(prev => prev.filter(i => i.id !== id));
                toast.success('Removido da watchlist.');
            }
        } catch {
            toast.error('Erro ao remover.');
        } finally {
            setRemoving(null);
        }
    };

    const getPriceChange = (item: WatchlistItem): { percent: number; direction: string } => {
        if (!item.current_price || item.current_price === item.initial_price) {
            return { percent: 0, direction: 'stable' };
        }
        const pct = ((item.current_price - item.initial_price) / item.initial_price) * 100;
        return { percent: Math.round(pct * 10) / 10, direction: pct < 0 ? 'down' : 'up' };
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 pt-8">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.push('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-surface-100 text-surface-500">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold text-surface-900">Watchlist</h1>
                </div>
                <div className="flex justify-center py-16">
                    <Loader2 size={28} className="text-brand-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => router.push('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-surface-100 text-surface-500">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-surface-900">Minha Watchlist</h1>
                    <p className="text-xs text-surface-500">{items.length} produto{items.length !== 1 ? 's' : ''} monitorado{items.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-4">
                        <Bookmark size={28} className="text-surface-300" />
                    </div>
                    <h2 className="text-base font-semibold text-surface-700 mb-2">Watchlist vazia</h2>
                    <p className="text-sm text-surface-500 mb-6">
                        Salve produtos dos resultados de busca para acompanhar preços.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all"
                    >
                        Buscar Produtos
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {items.map((item, i) => {
                            const change = getPriceChange(item);
                            const isAtTarget = item.target_price && item.current_price && item.current_price <= item.target_price;

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ delay: i * 0.04, duration: 0.3 }}
                                    className={cn(
                                        'bg-white rounded-2xl border p-4 transition-all',
                                        isAtTarget
                                            ? 'border-emerald-300 ring-2 ring-emerald-100 shadow-md'
                                            : 'border-surface-200',
                                    )}
                                >
                                    {isAtTarget && (
                                        <div className="absolute -top-3 left-4 px-3 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                                            🎯 Preço-alvo atingido!
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <div className="w-16 h-16 rounded-xl bg-surface-100 overflow-hidden relative flex-shrink-0">
                                            {item.image_url ? (
                                                <Image src={item.image_url} alt="" fill className="object-contain p-1" unoptimized sizes="64px" />
                                            ) : (
                                                <span className="flex items-center justify-center h-full text-lg">📦</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-medium text-surface-800 line-clamp-2 leading-snug">{item.product_title}</h3>
                                            <p className="text-[11px] text-surface-400 mt-0.5">{item.store_name}</p>
                                        </div>
                                    </div>

                                    {/* Price info */}
                                    <div className="mt-3 grid grid-cols-3 gap-3 bg-surface-50 rounded-xl p-3 border border-surface-100">
                                        <div>
                                            <p className="text-[10px] text-surface-400 uppercase">Inicial</p>
                                            <p className="text-xs font-semibold text-surface-600">{formatCurrency(item.initial_price)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-surface-400 uppercase">Atual</p>
                                            <p className={cn('text-xs font-bold', change.direction === 'down' ? 'text-emerald-600' : change.direction === 'up' ? 'text-red-600' : 'text-surface-700')}>
                                                {formatCurrency(item.current_price || item.initial_price)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-surface-400 uppercase">Menor</p>
                                            <p className="text-xs font-bold text-brand-600">{formatCurrency(item.lowest_price || item.initial_price)}</p>
                                        </div>
                                    </div>

                                    {/* Trend + actions */}
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center gap-2">
                                            <TrendIcon trend={item.price_trend} />
                                            <TrendLabel trend={item.price_trend} />
                                            {change.percent !== 0 && (
                                                <span className={cn(
                                                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                                                    change.direction === 'down' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
                                                )}>
                                                    {change.percent > 0 ? '+' : ''}{change.percent}%
                                                </span>
                                            )}
                                            <span className="text-[10px] text-surface-400 flex items-center gap-0.5">
                                                <Clock size={10} />
                                                {formatDate(item.created_at)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <a
                                                href={item.product_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-lg hover:bg-brand-50 text-surface-500 hover:text-brand-600 transition-all"
                                                title="Visitar loja"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                            <button
                                                onClick={() => handleRemove(item.id)}
                                                disabled={removing === item.id}
                                                className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500 transition-all"
                                                title="Remover"
                                            >
                                                {removing === item.id
                                                    ? <Loader2 size={14} className="animate-spin" />
                                                    : <Trash2 size={14} />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
