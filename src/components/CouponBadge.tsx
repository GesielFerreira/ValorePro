'use client';

import { cn, formatCurrency } from '@/lib/utils';
import { Percent, Zap, Truck, Sparkles } from 'lucide-react';

interface CouponBadgeProps {
    pixDiscount?: number;
    pixPrice?: number;
    cashbackPercent?: number;
    freeShippingMin?: number;
    currentPrice?: number;
    compact?: boolean;
}

export function CouponBadge({
    pixDiscount,
    pixPrice,
    cashbackPercent,
    freeShippingMin,
    currentPrice,
    compact = false,
}: CouponBadgeProps) {
    const badges: { icon: typeof Percent; text: string; color: string }[] = [];

    if (pixDiscount && pixDiscount > 0 && pixPrice) {
        badges.push({
            icon: Zap,
            text: compact ? `Pix -${pixDiscount}%` : `Pix: ${formatCurrency(pixPrice)} (-${pixDiscount}%)`,
            color: 'bg-teal-50 text-teal-700 border-teal-200',
        });
    }

    if (cashbackPercent && cashbackPercent > 0) {
        badges.push({
            icon: Sparkles,
            text: `${cashbackPercent}% cashback`,
            color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        });
    }

    if (freeShippingMin != null && currentPrice && currentPrice >= freeShippingMin) {
        badges.push({
            icon: Truck,
            text: 'Frete grátis elegível',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        });
    }

    if (badges.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5">
            {badges.map((badge, i) => (
                <span
                    key={i}
                    className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold',
                        badge.color,
                    )}
                >
                    <badge.icon size={10} />
                    {badge.text}
                </span>
            ))}
        </div>
    );
}
