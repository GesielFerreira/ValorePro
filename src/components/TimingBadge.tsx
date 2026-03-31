'use client';

import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus, Clock } from 'lucide-react';

type TimingType = 'buy_now' | 'normal' | 'wait';

interface TimingBadgeProps {
    timing: TimingType;
    label: string;
    trendPercent?: number;
    size?: 'sm' | 'md';
    showTrend?: boolean;
}

const config: Record<TimingType, {
    bg: string;
    text: string;
    border: string;
    icon: typeof TrendingDown;
    emoji: string;
}> = {
    buy_now: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: TrendingDown,
        emoji: '🟢',
    },
    normal: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: Minus,
        emoji: '🟡',
    },
    wait: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: TrendingUp,
        emoji: '🔴',
    },
};

export function TimingBadge({ timing, label, trendPercent, size = 'sm', showTrend = false }: TimingBadgeProps) {
    const c = config[timing];
    const Icon = c.icon;

    if (size === 'sm') {
        return (
            <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                c.bg, c.text, c.border,
            )}>
                <span>{c.emoji}</span>
                {label}
            </span>
        );
    }

    return (
        <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl border',
            c.bg, c.text, c.border,
        )}>
            <Icon size={14} />
            <span className="text-xs font-semibold">{label}</span>
            {showTrend && trendPercent != null && trendPercent !== 0 && (
                <span className="text-[10px] opacity-70">
                    ({trendPercent > 0 ? '+' : ''}{trendPercent}%)
                </span>
            )}
        </div>
    );
}
