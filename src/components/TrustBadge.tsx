'use client';

import { cn, getScoreColor, getScoreLabel } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface TrustBadgeProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const icons = { green: ShieldCheck, yellow: ShieldAlert, red: ShieldX };
const colors = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
};
const glows = {
    green: 'trust-glow-green',
    yellow: 'trust-glow-yellow',
    red: 'trust-glow-red',
};
const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
};
const iconSizes = { sm: 12, md: 16, lg: 20 };

export function TrustBadge({ score, size = 'md', showLabel = true, className }: TrustBadgeProps) {
    const color = getScoreColor(score);
    const label = getScoreLabel(score);
    const Icon = icons[color];

    return (
        <div
            className={cn(
                'inline-flex items-center font-semibold rounded-full border transition-all',
                colors[color],
                glows[color],
                sizes[size],
                className,
            )}
        >
            <Icon size={iconSizes[size]} />
            <span>{score}</span>
            {showLabel && <span className="font-normal">· {label}</span>}
        </div>
    );
}
