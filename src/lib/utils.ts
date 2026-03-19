import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(date));
}

export function shortenUrl(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export function getScoreColor(score: number): 'green' | 'yellow' | 'red' {
    if (score >= 60) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
}

export function getScoreLabel(score: number): string {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Confiável';
    if (score >= 40) return 'Regular';
    if (score >= 20) return 'Duvidosa';
    return 'Perigosa';
}
