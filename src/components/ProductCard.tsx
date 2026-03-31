'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ExternalLink, Truck, Clock, Star, Building2, ChevronDown,
    CheckCircle2, ShieldAlert, Bookmark, Share2, GitCompare,
    Zap,
} from 'lucide-react';
import Image from 'next/image';
import { cn, formatCurrency } from '@/lib/utils';
import { TrustBadge } from './TrustBadge';
import { TimingBadge } from './TimingBadge';
import { CouponBadge } from './CouponBadge';
import { toast } from 'sonner';

interface ProductCardProps {
    rank: number;
    title: string;
    cashPrice: number;
    totalPrice: number;
    shippingCost: number;
    shippingDays?: number;
    storeName: string;
    storeDomain: string;
    imageUrl?: string;
    storeDetails?: any;
    url: string;
    isBest?: boolean;
    onBuyClick?: () => void;
    // New features
    timing?: { timing: 'buy_now' | 'normal' | 'wait'; label: string; trendPercent?: number } | null;
    pixPrice?: number | null;
    pixDiscount?: number;
    cashbackPercent?: number;
    freeShippingMin?: number;
    resultId?: string;
    onAddToWatchlist?: () => void;
    onToggleCompare?: () => void;
    isInCompare?: boolean;
    onShare?: () => void;
}

export function ProductCard({
    rank, title, cashPrice, totalPrice, shippingCost, shippingDays,
    storeName, storeDomain, imageUrl, storeDetails, url, isBest, onBuyClick,
    timing, pixPrice, pixDiscount, cashbackPercent, freeShippingMin,
    resultId, onAddToWatchlist, onToggleCompare, isInCompare, onShare,
}: ProductCardProps) {
    const [showStoreDetails, setShowStoreDetails] = useState(false);
    const [savingToWatchlist, setSavingToWatchlist] = useState(false);
    const trustScore = storeDetails?.trust_score ?? 0;

    const handleWatchlist = async () => {
        if (savingToWatchlist) return;
        setSavingToWatchlist(true);
        try {
            const res = await fetch('/api/watchlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productTitle: title,
                    productUrl: url,
                    imageUrl,
                    storeName,
                    storeDomain,
                    price: cashPrice,
                    shippingCost,
                }),
            });
            if (res.status === 409) {
                toast.info('Produto já está na sua watchlist.');
            } else if (res.ok) {
                toast.success('Salvo na Watchlist! 📌');
                onAddToWatchlist?.();
            } else {
                toast.error('Erro ao salvar.');
            }
        } catch {
            toast.error('Erro de conexão.');
        } finally {
            setSavingToWatchlist(false);
        }
    };

    const handleShare = async () => {
        const shareText = `🔥 ${title}\n💰 ${formatCurrency(cashPrice)} na ${storeName}\n🔗 ${url}\n\nEncontrado pelo ValorePro`;

        if (navigator.share) {
            try {
                await navigator.share({ title: `${title} - ${formatCurrency(cashPrice)}`, text: shareText, url });
            } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(shareText);
            toast.success('Link copiado! 📋');
        }
        onShare?.();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rank * 0.06, duration: 0.35 }}
            className={cn(
                'relative rounded-2xl border bg-white p-4 transition-all hover:shadow-lg',
                isBest
                    ? 'border-brand-300 ring-2 ring-brand-100 shadow-md'
                    : isInCompare
                        ? 'border-blue-300 ring-2 ring-blue-100'
                        : 'border-surface-200 hover:border-surface-300',
            )}
        >
            {isBest && (
                <div className="absolute -top-3 left-4 px-3 py-0.5 bg-brand-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Star size={12} fill="currentColor" /> Melhor Preço
                </div>
            )}

            <div className="flex gap-4">
                {/* Image */}
                <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-xl bg-surface-100 overflow-hidden flex items-center justify-center relative">
                    {imageUrl ? (
                        <Image src={imageUrl} alt={title} fill className="object-contain p-1" sizes="(max-width: 768px) 80px, 96px" unoptimized />
                    ) : (
                        <div className="text-surface-300 text-xs text-center">Sem imagem</div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-surface-800 line-clamp-2 leading-snug">{title}</h3>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-surface-500">{storeName}</span>
                        <TrustBadge score={trustScore} size="sm" showLabel={false} />
                        {timing && (
                            <TimingBadge timing={timing.timing} label={timing.label} size="sm" />
                        )}
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                        <span className={cn(
                            'font-bold text-lg',
                            isBest ? 'text-brand-600' : 'text-surface-900',
                        )}>
                            {formatCurrency(cashPrice)}
                        </span>
                        {shippingCost === 0 ? (
                            <span className="text-xs font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                                Frete Grátis
                            </span>
                        ) : (
                            <span className="text-xs text-surface-500">
                                + {formatCurrency(shippingCost)} frete
                            </span>
                        )}
                    </div>

                    {/* Pix price */}
                    {pixPrice && pixDiscount && (
                        <div className="flex items-center gap-1.5 mt-1">
                            <Zap size={12} className="text-teal-600" />
                            <span className="text-xs font-semibold text-teal-700">
                                Pix: {formatCurrency(pixPrice)}
                            </span>
                            <span className="text-[10px] text-teal-500 bg-teal-50 px-1.5 py-0.5 rounded-full">
                                -{pixDiscount}%
                            </span>
                        </div>
                    )}

                    {shippingDays && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-surface-500">
                            <Clock size={12} />
                            <span>{shippingDays} dias úteis</span>
                        </div>
                    )}

                    {/* Coupon badges */}
                    <div className="mt-1.5">
                        <CouponBadge
                            cashbackPercent={cashbackPercent}
                            freeShippingMin={freeShippingMin}
                            currentPrice={cashPrice}
                            compact
                        />
                    </div>
                </div>
            </div>

            {/* Store Details Toggle */}
            {storeDetails && (
                <div className="mt-3 pt-2 border-t border-surface-100">
                    <button
                        onClick={() => setShowStoreDetails(!showStoreDetails)}
                        className="flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-brand-600 transition-colors"
                    >
                        <Building2 size={14} />
                        Dados de Segurança da Loja
                        <ChevronDown size={14} className={cn('transition-transform duration-200', showStoreDetails && 'rotate-180')} />
                    </button>

                    <AnimatePresence>
                        {showStoreDetails && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-surface-50 rounded-xl p-3 border border-surface-100">
                                    <div className="space-y-2 text-surface-600">
                                        <div className="flex items-start gap-1.5">
                                            {storeDetails.cnpj_status === 'ATIVA' || storeDetails.trust_score >= 80 ? (
                                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <ShieldAlert size={13} className="text-amber-500 shrink-0 mt-0.5" />
                                            )}
                                            <span>
                                                <span className="font-semibold text-surface-700">CNPJ: </span>
                                                {storeDetails.cnpj || (storeDetails.trust_score >= 80 ? 'Parceiro Verificado' : 'Não identificado')}<br />
                                                <span className="text-[10px] uppercase">{storeDetails.cnpj_status || (storeDetails.trust_score >= 80 ? 'ATIVA' : 'Aviso: Status desconhecido')}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-surface-600">
                                        <div className="flex items-start gap-1.5">
                                            {storeDetails.reclame_aqui_score >= 7 || storeDetails.trust_score >= 80 ? (
                                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <ShieldAlert size={13} className="text-amber-500 shrink-0 mt-0.5" />
                                            )}
                                            <span>
                                                <span className="font-semibold text-surface-700">Reclame Aqui: </span>
                                                {storeDetails.reclame_aqui_score ? `${storeDetails.reclame_aqui_score}/10` : (storeDetails.trust_score >= 80 ? 'Ótimo (Parceiro)' : 'Sem índice')}<br />
                                                {storeDetails.reclame_aqui_resolved && (
                                                    <span className="text-[10px]">{storeDetails.reclame_aqui_resolved}% índices resolvidos</span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    {(storeDetails.domain_age_years != null || storeDetails.trust_score >= 80) && (
                                        <div className="col-span-2 text-surface-500 italic mt-1 text-[11px] flex gap-1 items-center">
                                            <span>🌍 Tempo de domínio na web: <strong>{storeDetails.domain_age_years != null ? storeDetails.domain_age_years : (storeDetails.trust_score >= 80 ? '10+' : '0')} anos</strong>.</span>
                                            {(storeDetails.ssl_valid !== false) && <span className="text-emerald-600">SSL Válido.</span>}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-100">
                {isBest ? (
                    <button
                        onClick={onBuyClick}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
                    >
                        Ir para a Loja
                    </button>
                ) : (
                    <button
                        onClick={onBuyClick}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-medium rounded-xl transition-all"
                    >
                        Ir para a Loja
                    </button>
                )}

                {/* Quick actions */}
                <button
                    onClick={handleWatchlist}
                    disabled={savingToWatchlist}
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-surface-200 hover:bg-amber-50 hover:border-amber-200 text-surface-500 hover:text-amber-600 transition-all"
                    title="Salvar na Watchlist"
                >
                    <Bookmark size={16} />
                </button>
                <button
                    onClick={() => onToggleCompare?.()}
                    className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-xl border transition-all',
                        isInCompare
                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                            : 'border-surface-200 hover:bg-blue-50 hover:border-blue-200 text-surface-500 hover:text-blue-600',
                    )}
                    title="Comparar"
                >
                    <GitCompare size={16} />
                </button>
                <button
                    onClick={handleShare}
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-surface-200 hover:bg-surface-50 text-surface-500 transition-all"
                    title="Compartilhar"
                >
                    <Share2 size={16} />
                </button>
            </div>
        </motion.div>
    );
}
