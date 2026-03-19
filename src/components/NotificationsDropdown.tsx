'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, ExternalLink, Tag, ShoppingBag, AlertTriangle, Info } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Notification {
    id: string;
    type: 'alert_triggered' | 'purchase_completed' | 'purchase_failed' | 'price_drop' | 'system';
    title: string;
    message: string;
    data: any;
    read: boolean;
    created_at: string;
}

export function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications?limit=10');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Polling every 2 minutes
        const interval = setInterval(fetchNotifications, 120000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const markAsRead = async (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        
        try {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id })
            });
            
            if (res.ok) {
                setNotifications(prev => 
                    prev.map(n => n.id === id ? { ...n, read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            toast.error('Erro ao marcar como lida');
        }
    };

    const markAllAsRead = async () => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllRead: true })
            });
            
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                setUnreadCount(0);
                toast.success('Todas marcadas como lidas');
            }
        } catch (error) {
            toast.error('Erro ao marcar todas como lidas');
        }
    };

    const formatTimestamp = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `${diffMins}m atrás`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h atrás`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return `${diffDays}d atrás`;
        
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const getIcon = (type: Notification['type'], read: boolean) => {
        const stroke = read ? "text-surface-400" : "text-white";
        const bg = read ? "bg-surface-100" : (
            type === 'alert_triggered' ? 'bg-amber-500' :
            type === 'purchase_completed' ? 'bg-emerald-500' :
            type === 'price_drop' ? 'bg-blue-500' :
            'bg-brand-500'
        );

        let IconBase = Info;
        if (type === 'alert_triggered') IconBase = AlertTriangle;
        if (type === 'purchase_completed') IconBase = ShoppingBag;
        if (type === 'price_drop') IconBase = Tag;

        return (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                <IconBase size={14} className={stroke} />
            </div>
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-surface-600 hover:bg-surface-100 hover:text-surface-900 transition-all focus:outline-none"
            >
                <Bell size={20} strokeWidth={2} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-surface-200 z-50 overflow-hidden transform origin-top-right transition-all">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 bg-surface-50 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-surface-900 text-sm">Notificações</h3>
                            {unreadCount > 0 && (
                                <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {unreadCount} novas
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
                            >
                                <Check size={12} />
                                Ler todas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[360px] overflow-y-auto overscroll-contain">
                        {loading ? (
                            <div className="px-4 py-8 text-center text-surface-400">
                                <span className="animate-pulse inline-block">Carregando...</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="px-4 py-8 flex flex-col items-center justify-center text-surface-400">
                                <Bell className="w-8 h-8 opacity-20 mb-2" />
                                <p className="text-sm">Nenhuma notificação</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map((notif) => (
                                    <div 
                                        key={notif.id}
                                        onClick={() => !notif.read && markAsRead(notif.id)}
                                        className={cn(
                                            "flex gap-3 p-4 border-b border-surface-50 transition-colors last:border-0",
                                            notif.read ? "bg-white hover:bg-surface-50 cursor-pointer" : "bg-brand-50/30 hover:bg-brand-50/50 cursor-pointer active:bg-brand-100/50"
                                        )}
                                    >
                                        {getIcon(notif.type, notif.read)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={cn("text-sm font-semibold truncate pr-2", notif.read ? "text-surface-700" : "text-surface-900")}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-[10px] text-surface-400 whitespace-nowrap shrink-0 mt-0.5">
                                                    {formatTimestamp(notif.created_at)}
                                                </span>
                                            </div>
                                            <p className={cn("text-xs line-clamp-2", notif.read ? "text-surface-500" : "text-surface-600")}>
                                                {notif.message}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
