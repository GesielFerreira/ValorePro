// ============================================================
// ValorePro — Notification Service
// ============================================================
// Creates in-app notifications for alerts, purchases, etc.
// ============================================================

import { createAdminSupabase } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('notifications');

export type NotificationType =
    | 'alert_triggered'
    | 'purchase_completed'
    | 'purchase_failed'
    | 'price_drop'
    | 'system';

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
    try {
        const admin = createAdminSupabase();

        const { data, error } = await admin
            .from('notifications')
            .insert({
                user_id: params.userId,
                type: params.type,
                title: params.title,
                message: params.message,
                data: params.data || {},
            })
            .select('id')
            .single();

        if (error) {
            log.error('Failed to create notification', { error: error.message, type: params.type });
            return null;
        }

        log.info('Notification created', { id: data.id, type: params.type, userId: params.userId });
        return data;
    } catch (err) {
        log.error('Notification service error', { error: String(err) });
        return null;
    }
}

// ── Convenience helpers ──────────────────────────────────────

export async function notifyAlertTriggered(
    userId: string,
    alertData: { productName: string; targetPrice: number; foundPrice: number; storeName: string; productUrl: string },
) {
    return createNotification({
        userId,
        type: 'alert_triggered',
        title: '🔔 Alerta de Preço Atingido!',
        message: `${alertData.productName} está por ${formatPrice(alertData.foundPrice)} na ${alertData.storeName} — abaixo do seu alvo de ${formatPrice(alertData.targetPrice)}!`,
        data: alertData,
    });
}

export async function notifyPurchaseCompleted(
    userId: string,
    purchaseData: { productTitle: string; storeName: string; totalPrice: number; orderId: string },
) {
    return createNotification({
        userId,
        type: 'purchase_completed',
        title: '✅ Compra Registrada',
        message: `Sua compra de "${purchaseData.productTitle}" na ${purchaseData.storeName} por ${formatPrice(purchaseData.totalPrice)} foi registrada.`,
        data: purchaseData,
    });
}

export async function notifyPriceDrop(
    userId: string,
    dropData: { productName: string; oldPrice: number; newPrice: number; storeName: string },
) {
    const pct = Math.round(((dropData.oldPrice - dropData.newPrice) / dropData.oldPrice) * 100);
    return createNotification({
        userId,
        type: 'price_drop',
        title: `📉 Queda de ${pct}% em preço`,
        message: `${dropData.productName} caiu de ${formatPrice(dropData.oldPrice)} para ${formatPrice(dropData.newPrice)} na ${dropData.storeName}.`,
        data: dropData,
    });
}

function formatPrice(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
