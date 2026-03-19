// ============================================================
// ValorePro — BullMQ Search Queue
// ============================================================
// Async job processor for product searches and alerts
// ============================================================

import { createLogger } from '@/lib/logger';

const log = createLogger('queue');

// ── Queue Definitions ────────────────────────────────────────

export const QUEUE_NAMES = {
    SEARCH: 'product-search',
    REPUTATION: 'store-reputation',
    ALERT_CHECK: 'alert-check',
    PRICE_RECORD: 'price-record',
} as const;

export interface SearchJobData {
    searchId: string;
    userId: string;
    query: string;
    cep?: string;
}

export interface ReputationJobData {
    domain: string;
    storeName: string;
    productPrice?: number;
    averagePrice?: number;
}

export interface AlertCheckJobData {
    alertId: string;
    userId: string;
    searchTerm: string;
    targetPrice: number;
}

export interface PriceRecordJobData {
    productTerm: string;
    price: number;
    storeDomain: string;
    storeName: string;
}

// ── Queue Factory ────────────────────────────────────────────

let queuesInitialized = false;
const queues: Record<string, any> = {};

export function getQueue(name: string) {
    if (queues[name]) return queues[name];

    try {
        const { Queue } = require('bullmq');
        const { getRedisConnection } = require('@/lib/redis');

        queues[name] = new Queue(name, {
            connection: getRedisConnection(),
            defaultJobOptions: {
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 50 },
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        });

        log.info(`Queue "${name}" initialized`);
        return queues[name];
    } catch (err) {
        log.error(`Failed to create queue "${name}"`, { error: String(err) });
        return null;
    }
}

// ── Job Enqueue Helpers ──────────────────────────────────────

export async function enqueueSearch(data: SearchJobData) {
    const queue = getQueue(QUEUE_NAMES.SEARCH);
    if (!queue) {
        log.warn('Search queue unavailable, skipping enqueue');
        return null;
    }

    const job = await queue.add('search', data, {
        priority: 1,
        jobId: `search-${data.searchId}`,
    });

    log.info('Search job enqueued', { jobId: job.id, query: data.query });
    return job;
}

export async function enqueueReputationCheck(data: ReputationJobData) {
    const queue = getQueue(QUEUE_NAMES.REPUTATION);
    if (!queue) return null;

    return queue.add('check', data, {
        jobId: `rep-${data.domain}-${Date.now()}`,
        priority: 2,
    });
}

export async function enqueueAlertCheck(data: AlertCheckJobData) {
    const queue = getQueue(QUEUE_NAMES.ALERT_CHECK);
    if (!queue) return null;

    return queue.add('check', data, {
        jobId: `alert-${data.alertId}`,
        priority: 3,
    });
}

export async function enqueuePriceRecord(data: PriceRecordJobData) {
    const queue = getQueue(QUEUE_NAMES.PRICE_RECORD);
    if (!queue) return null;

    return queue.add('record', data, {
        priority: 4,
    });
}

// ── Scheduler (recurring jobs) ───────────────────────────────

export async function setupRecurringJobs() {
    try {
        const alertQueue = getQueue(QUEUE_NAMES.ALERT_CHECK);
        if (!alertQueue) return;

        // Check alerts every 6 hours
        await alertQueue.upsertJobScheduler(
            'alert-sweep',
            { every: 6 * 60 * 60 * 1000 },
            { name: 'sweep-all-alerts', data: {} },
        );

        log.info('Recurring jobs configured');
    } catch (err) {
        log.error('Failed to setup recurring jobs', { error: String(err) });
    }
}
