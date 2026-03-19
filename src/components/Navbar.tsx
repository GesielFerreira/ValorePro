'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, ShoppingBag, Settings, User, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { NotificationsDropdown } from './NotificationsDropdown';

const NAV_ITEMS = [
    { href: '/', icon: Search, label: 'Buscar' },
    { href: '/dashboard', icon: BarChart3, label: 'Painel' },
    { href: '/dashboard/alerts', icon: Bell, label: 'Alertas' },
    { href: '/dashboard/purchases', icon: ShoppingBag, label: 'Compras' },
    { href: '/dashboard/plans', icon: Sparkles, label: 'Planos' },
    { href: '/dashboard/settings', icon: Settings, label: 'Config' },
];

export function Navbar() {
    const pathname = usePathname();

    return (
        <>
            {/* Desktop top bar */}
            <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-surface-200 sticky top-0 z-50">
                <Link href="/" className="flex items-center">
                    <Logo size="md" />
                </Link>

                <nav className="flex items-center gap-1">
                    {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                        const isActive = href === '/'
                            ? pathname === '/'
                            : href === '/dashboard'
                                ? pathname === '/dashboard'
                                : pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                prefetch={true}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-brand-500 text-white'
                                        : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                                )}
                            >
                                <Icon size={18} />
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2">
                    <NotificationsDropdown />
                    
                    <button className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-50 hover:bg-brand-100 transition-colors ml-2 focus:outline-none">
                        <User size={18} className="text-brand-600" />
                    </button>
                </div>
            </header>

            {/* Mobile bottom tab bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-surface-200 px-2 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around">
                    {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                        const isActive = href === '/'
                            ? pathname === '/'
                            : href === '/dashboard'
                                ? pathname === '/dashboard'
                                : pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                prefetch={true}
                                className={cn(
                                    'flex flex-col items-center gap-0.5 py-2 px-3 text-[11px] font-medium transition-all min-w-[56px]',
                                    isActive
                                        ? 'text-brand-500'
                                        : 'text-surface-400'
                                )}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                                <span>{label}</span>
                                {isActive && (
                                    <div className="absolute top-0 w-8 h-0.5 rounded-full bg-brand-500" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
