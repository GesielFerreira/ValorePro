// ============================================================
// ValorePro — Redis Client
// ============================================================
// Singleton Redis connection for caching and BullMQ queues
// ============================================================

import { createLogger } from '@/lib/logger';

const log = createLogger('redis');

let redisInstance: any = null;

export function getRedisConnection() {
    if (redisInstance) return redisInstance;

    const Redis = require('ioredis');
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    redisInstance = new Redis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times: number) {
            if (times > 10) {
                log.error('Redis: max retries exceeded, giving up');
                return null;
            }
            const delay = Math.min(times * 200, 5000);
            log.warn(`Redis: retrying connection in ${delay}ms`, { attempt: times });
            return delay;
        },
    });

    redisInstance.on('connect', () => log.info('Redis: connected'));
    redisInstance.on('error', (err: Error) => log.error('Redis: error', { error: err.message }));

    return redisInstance;
}

// ── Cache Utilities ──────────────────────────────────────────

const CACHE_PREFIX = 'vp:';
const DEFAULT_TTL = 30 * 60; // 30 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const redis = getRedisConnection();
        const cached = await redis.get(`${CACHE_PREFIX}${key}`);
        if (!cached) return null;
        return JSON.parse(cached) as T;
    } catch (err) {
        log.warn('Cache read failed', { key, error: String(err) });
        return null;
    }
}

export async function cacheSet(key: string, data: unknown, ttlSeconds = DEFAULT_TTL): Promise<void> {
    try {
        const redis = getRedisConnection();
        await redis.set(
            `${CACHE_PREFIX}${key}`,
            JSON.stringify(data),
            'EX',
            ttlSeconds,
        );
    } catch (err) {
        log.warn('Cache write failed', { key, error: String(err) });
    }
}

export async function cacheDelete(key: string): Promise<void> {
    try {
        const redis = getRedisConnection();
        await redis.del(`${CACHE_PREFIX}${key}`);
    } catch (err) {
        log.warn('Cache delete failed', { key, error: String(err) });
    }
}

export async function cacheGetOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = DEFAULT_TTL,
): Promise<T> {
    const cached = await cacheGet<T>(key);
    if (cached !== null) {
        log.debug('Cache hit', { key });
        return cached;
    }

    log.debug('Cache miss', { key });
    const fresh = await fetcher();
    await cacheSet(key, fresh, ttlSeconds);
    return fresh;
}
