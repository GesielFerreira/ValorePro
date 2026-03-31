'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Star, Truck, Clock, DollarSign } from 'lucide-react';
import Image from 'next/image';
import { cn, formatCurrency } from '@/lib/utils';

interface CompareItem {
    id: string;
    title: string;
    cashPrice: number;
    totalPrice: number;
    shippingCost: number;
    shippingDays?: number;
    storeName: string;
    storeDomain: string;
    imageUrl?: string;
    trustScore?: number;
    pixPrice?: number;
}

interface ComparisonTableProps {
    items: CompareItem[];
    onRemove: (id: string) => void;
    onClose: () => void;
}

export function ComparisonTable({ items, onRemove, onClose }: ComparisonTableProps) {
    if (items.length === 0) return null;

    const cheapest = items.reduce((a, b) => a.totalPrice < b.totalPrice ? a : b);
    const fastestDelivery = items.filter(i => i.shippingDays != null).reduce<CompareItem | null>(
        (a, b) => !a || (b.shippingDays! < a.shippingDays!) ? b : a,
        null,
    );

    const specs = [
        {
            label: 'Preço à Vista',
            icon: DollarSign,
            getValue: (item: CompareItem) => formatCurrency(item.cashPrice),
            isBest: (item: CompareItem) => item.id === cheapest.id,
        },
        {
            label: 'Preço Pix',
            icon: DollarSign,
            getValue: (item: CompareItem) => item.pixPrice ? formatCurrency(item.pixPrice) : '—',
            isBest: (item: CompareItem) => {
                const pixItems = items.filter(i => i.pixPrice);
                if (pixItems.length === 0) return false;
                const cheapestPix = pixItems.reduce((a, b) => (a.pixPrice! < b.pixPrice!) ? a : b);
                return item.id === cheapestPix.id && item.pixPrice != null;
            },
        },
        {
            label: 'Frete',
            icon: Truck,
            getValue: (item: CompareItem) => item.shippingCost === 0 ? 'Grátis' : formatCurrency(item.shippingCost),
            isBest: (item: CompareItem) => item.shippingCost === 0,
        },
        {
            label: 'Entrega',
            icon: Clock,
            getValue: (item: CompareItem) => item.shippingDays ? `${item.shippingDays} dias` : '—',
            isBest: (item: CompareItem) => fastestDelivery ? item.id === fastestDelivery.id : false,
        },
        {
            label: 'Total',
            icon: Star,
            getValue: (item: CompareItem) => formatCurrency(item.totalPrice),
            isBest: (item: CompareItem) => item.id === cheapest.id,
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-surface-200 shadow-2xl rounded-t-3xl max-h-[70vh] overflow-y-auto"
        >
            <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-2 border-b border-surface-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-surface-900">
                    Comparando {items.length} produtos
                </h3>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-100 text-surface-500">
                    <X size={18} />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[400px]">
                    {/* Product headers */}
                    <thead>
                        <tr>
                            <th className="w-24 p-3" />
                            {items.map((item) => (
                                <th key={item.id} className="p-3 text-center min-w-[140px]">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-14 h-14 rounded-xl bg-surface-100 overflow-hidden relative flex-shrink-0">
                                            {item.imageUrl ? (
                                                <Image src={item.imageUrl} alt="" fill className="object-contain p-1" unoptimized sizes="56px" />
                                            ) : (
                                                <span className="text-xs text-surface-300 flex items-center justify-center h-full">📦</span>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-medium text-surface-700 line-clamp-2 text-center leading-tight">
                                            {item.title.slice(0, 50)}
                                        </p>
                                        <p className="text-[10px] text-surface-400">{item.storeName}</p>
                                        <button
                                            onClick={() => onRemove(item.id)}
                                            className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* Spec rows */}
                    <tbody>
                        {specs.map((spec) => (
                            <tr key={spec.label} className="border-t border-surface-100">
                                <td className="p-3 text-xs font-medium text-surface-500 flex items-center gap-1.5">
                                    <spec.icon size={12} />
                                    {spec.label}
                                </td>
                                {items.map((item) => {
                                    const best = spec.isBest(item);
                                    return (
                                        <td key={item.id} className="p-3 text-center">
                                            <span className={cn(
                                                'text-xs font-semibold',
                                                best ? 'text-brand-600' : 'text-surface-700',
                                            )}>
                                                {spec.getValue(item)}
                                                {best && <span className="ml-1">✓</span>}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}
