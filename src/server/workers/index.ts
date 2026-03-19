// ============================================================
// ValorePro — BullMQ Workers
// ============================================================
// Job processors for async search, reputation, alerts, prices
// ============================================================

import { createLogger } from '@/lib/logger';
import { QUEUE_NAMES } from '@/lib/queue';
import type {
    SearchJobData,
    ReputationJobData,
    AlertCheckJobData,
    PriceRecordJobData,
} from '@/lib/queue';

const log = createLogger('worker');

export function startWorkers() {
    try {
        const { Worker } = require('bullmq');
        const { getRedisConnection } = require('@/lib/redis');
        const connection = getRedisConnection();

        // ── Search Worker ──────────────────────────────────────
        new Worker(
            QUEUE_NAMES.SEARCH,
            async (job: any) => {
                const data = job.data as SearchJobData;
                log.info('Processing search job', { jobId: job.id, query: data.query });

                const { executeProductSearch } = require('@/server/services/search');
                const { createAdminSupabase } = require('@/lib/supabase/server');

                const result = await executeProductSearch({
                    query: data.query,
                    cep: data.cep,
                    userId: data.userId,
                });

                const admin = createAdminSupabase();

                // Save results
                const resultsToInsert = result.results.slice(0, 30).map((r: any, i: number) => ({
                    search_id: data.searchId,
                    title: r.title,
                    cash_price: r.cashPrice,
                    shipping_cost: r.shippingCost,
                    total_price: r.totalPrice,
                    shipping_days: r.shippingDays ?? null,
                    store_name: r.store.name,
                    store_domain: r.store.domain,
                    product_url: r.url,
                    image_url: r.imageUrl ?? null,
                    source: r.source,
                    available: r.available,
                    trust_score: 0,
                    rank: i + 1,
                    is_best: i === 0,
                }));

                if (resultsToInsert.length > 0) {
                    await admin.from('results').insert(resultsToInsert);
                }

                await admin.from('searches').update({
                    status: result.status,
                    total_results: result.totalResults,
                    best_price: result.bestPrice?.totalPrice ?? null,
                    duration_ms: result.duration,
                    completed_at: new Date().toISOString(),
                }).eq('id', data.searchId);

                log.info('Search job completed', {
                    jobId: job.id,
                    results: result.totalResults,
                    duration: result.duration,
                });

                return { totalResults: result.totalResults };
            },
            { connection, concurrency: 2 },
        );

        // ── Reputation Worker ──────────────────────────────────
        new Worker(
            QUEUE_NAMES.REPUTATION,
            async (job: any) => {
                const data = job.data as ReputationJobData;
                log.info('Processing reputation job', { domain: data.domain });

                const { verifyStoreReputation } = require('@/server/services/reputation');

                const result = await verifyStoreReputation({
                    domain: data.domain,
                    storeName: data.storeName,
                    storeUrl: `https://${data.domain}`,
                    productPrice: data.productPrice,
                    averagePrice: data.averagePrice,
                });

                const { createAdminSupabase } = require('@/lib/supabase/server');
                const admin = createAdminSupabase();

                await admin.from('stores').upsert({
                    domain: data.domain,
                    name: data.storeName,
                    trust_score: result.trustScore,
                    trust_level: result.classification,
                    last_verified_at: new Date().toISOString(),
                }, { onConflict: 'domain' });

                return { trustScore: result.trustScore };
            },
            { connection, concurrency: 3 },
        );

        // ── Price Record Worker ────────────────────────────────
        new Worker(
            QUEUE_NAMES.PRICE_RECORD,
            async (job: any) => {
                const data = job.data as PriceRecordJobData;
                const { createAdminSupabase } = require('@/lib/supabase/server');
                const admin = createAdminSupabase();

                await admin.from('price_history').insert({
                    product_term: data.productTerm,
                    price: data.price,
                    store_domain: data.storeDomain,
                    store_name: data.storeName,
                });
            },
            { connection, concurrency: 5 },
        );

        // ── Alert Check Worker ─────────────────────────────────
        new Worker(
            QUEUE_NAMES.ALERT_CHECK,
            async (job: any) => {
                // Sweep job: enqueue individual checks for all active alerts
                if (job.name === 'sweep-all-alerts') {
                    log.info('Starting alert sweep');

                    const { createAdminSupabase } = require('@/lib/supabase/server');
                    const { enqueueAlertCheck } = require('@/lib/queue');
                    const admin = createAdminSupabase();

                    const { data: alerts } = await admin
                        .from('price_alerts')
                        .select('id, user_id, search_term, target_price')
                        .eq('status', 'active')
                        .lt('expires_at', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());

                    const activeAlerts = alerts || [];
                    log.info(`Found ${activeAlerts.length} active alerts to check`);

                    for (const alert of activeAlerts) {
                        await enqueueAlertCheck({
                            alertId: alert.id,
                            userId: alert.user_id,
                            searchTerm: alert.search_term,
                            targetPrice: alert.target_price,
                        });
                    }

                    return { alertsEnqueued: activeAlerts.length };
                }

                // Individual alert check
                const data = job.data as AlertCheckJobData;
                log.info('Processing alert check', {
                    alertId: data.alertId,
                    searchTerm: data.searchTerm,
                    targetPrice: data.targetPrice,
                });

                const { executeProductSearch } = require('@/server/services/search');
                const { createAdminSupabase } = require('@/lib/supabase/server');
                const admin = createAdminSupabase();

                try {
                    // Run a quick search for the alert term
                    const result = await executeProductSearch({
                        query: data.searchTerm,
                        userId: data.userId,
                    });

                    if (!result.results || result.results.length === 0) {
                        await admin.from('price_alerts').update({
                            last_checked_at: new Date().toISOString(),
                        }).eq('id', data.alertId);

                        log.info('Alert check: no results found', { alertId: data.alertId });
                        return { found: false };
                    }

                    // Find the best (lowest) price
                    const bestResult = result.results.reduce(
                        (best: any, curr: any) => curr.totalPrice < best.totalPrice ? curr : best,
                        result.results[0],
                    );

                    const bestPrice = bestResult.totalPrice;
                    const priceHit = bestPrice <= data.targetPrice;

                    // Update alert with latest price info
                    const updateData: Record<string, any> = {
                        current_price: bestPrice,
                        best_price_found: bestPrice,
                        best_store_name: bestResult.store?.name || 'Desconhecida',
                        best_product_url: bestResult.url,
                        last_checked_at: new Date().toISOString(),
                    };

                    if (priceHit) {
                        updateData.status = 'triggered';
                        updateData.triggered_at = new Date().toISOString();
                        log.info('🔔 Alert triggered!', {
                            alertId: data.alertId,
                            targetPrice: data.targetPrice,
                            foundPrice: bestPrice,
                            store: bestResult.store?.name,
                        });

                        // Send in-app notification
                        try {
                            const { notifyAlertTriggered } = require('@/server/services/notifications');
                            // Fetch the alert to get product name
                            const { data: alertRecord } = await admin
                                .from('price_alerts')
                                .select('product_name')
                                .eq('id', data.alertId)
                                .single();

                            await notifyAlertTriggered(data.userId, {
                                productName: alertRecord?.product_name || data.searchTerm,
                                targetPrice: data.targetPrice,
                                foundPrice: bestPrice,
                                storeName: bestResult.store?.name || 'Loja',
                                productUrl: bestResult.url || '',
                            });
                        } catch (notifErr) {
                            log.warn('Failed to send alert notification', { error: String(notifErr) });
                        }
                    }

                    await admin
                        .from('price_alerts')
                        .update(updateData)
                        .eq('id', data.alertId);

                    // Record this price point in history
                    const { enqueuePriceRecord } = require('@/lib/queue');
                    await enqueuePriceRecord({
                        productTerm: data.searchTerm,
                        price: bestPrice,
                        storeDomain: bestResult.store?.domain || '',
                        storeName: bestResult.store?.name || '',
                    });

                    return {
                        found: true,
                        bestPrice,
                        targetPrice: data.targetPrice,
                        triggered: priceHit,
                    };
                } catch (err) {
                    log.error('Alert check failed', {
                        alertId: data.alertId,
                        error: String(err),
                    });

                    // Still update last_checked_at so we don't retry forever
                    await admin.from('price_alerts').update({
                        last_checked_at: new Date().toISOString(),
                    }).eq('id', data.alertId);

                    throw err;
                }
            },
            { connection, concurrency: 1 },
        );

        log.info('All workers started successfully (search, reputation, price-record, alert-check)');
    } catch (err) {
        log.error('Failed to start workers', { error: String(err) });
    }
}
