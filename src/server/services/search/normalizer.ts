// ============================================================
// ValorePro — Search Result Normalizer
// ============================================================
// Consolidates results from all sources (SerpAPI, MeLi, scraper)
// into a unified format. Deduplicates by URL domain + price
// and calculates total price (product + shipping).
// ============================================================

import { randomUUID } from 'crypto';
import { createLogger } from '@/lib/logger';
import type { RawProductResult, NormalizedResult } from '@/types/search';

const log = createLogger('normalizer');

function generateResultId(result: RawProductResult): string {
    return randomUUID();
}

function simpleHash(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        h = ((h << 5) - h) + char;
        h |= 0;
    }
    return Math.abs(h).toString(36);
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
}

function normalizeTitle(title: string): string {
    return title
        .replace(/\s+/g, ' ')
        .replace(/["""'']/g, '')
        .trim()
        .slice(0, 200);
}

function normalizeUrl(url: string): string {
    try {
        const u = new URL(url);
        // Remove tracking parameters
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'tag', 'gclid', 'fbclid'];
        trackingParams.forEach((p) => u.searchParams.delete(p));
        return u.toString();
    } catch {
        return url;
    }
}

// ── Deduplication ────────────────────────────────────────────

interface DedupeKey {
    domain: string;
    priceRange: string; // bucket prices within R$2 of each other
}

function dedupeKey(result: RawProductResult): string {
    const domain = extractDomain(result.url);
    // Bucket prices to catch near-duplicates (e.g., R$199.90 vs R$199.99)
    const bucket = Math.floor(result.price / 2) * 2;
    const titleWords = result.title.toLowerCase().split(/\s+/).slice(0, 5).join(' ');
    return `${domain}|${bucket}|${titleWords}`;
}

function removeDuplicates(results: RawProductResult[]): RawProductResult[] {
    const seen = new Map<string, RawProductResult>();

    for (const result of results) {
        const key = dedupeKey(result);

        if (!seen.has(key)) {
            seen.set(key, result);
        } else {
            // Keep the one with the lower total price
            const existing = seen.get(key)!;
            const existingTotal = existing.price + existing.shippingCost;
            const newTotal = result.price + result.shippingCost;

            if (newTotal < existingTotal) {
                seen.set(key, result);
            }
        }
    }

    return Array.from(seen.values());
}

// ── Normalization ────────────────────────────────────────────

function normalizeOne(raw: RawProductResult): NormalizedResult {
    let domain = 'unknown';

    // Attempt to extract domain from the pre-calculated storeUrl first (from serp-search)
    if (raw.storeUrl) {
        domain = extractDomain(raw.storeUrl);
    }

    // Fallback to extracting from the raw product url
    if (!domain || domain === 'unknown') {
        domain = extractDomain(raw.url);
    }

    const totalPrice = raw.price + raw.shippingCost;

    return {
        id: generateResultId(raw),
        source: raw.source,
        title: normalizeTitle(raw.title),
        cashPrice: Math.round(raw.price * 100) / 100,
        installment: raw.installment,
        shippingCost: Math.round(raw.shippingCost * 100) / 100,
        shippingDays: raw.shippingDays,
        totalPrice: Math.round(totalPrice * 100) / 100,
        url: normalizeUrl(raw.url),
        imageUrl: raw.imageUrl,
        store: {
            name: raw.storeName || domain,
            url: raw.storeUrl || `https://${domain}`,
            domain,
        },
        available: raw.available,
        condition: raw.condition || 'new',
        scrapedAt: new Date(),
    };
}

// ── Public API ───────────────────────────────────────────────

export function normalizeResults(rawResults: RawProductResult[]): NormalizedResult[] {
    const start = Date.now();

    log.info(`Normalizing ${rawResults.length} raw results`);

    // Filter out invalid results
    const valid = rawResults.filter((r) => {
        if (!r.url || !r.title) {
            log.debug('Skipping result: missing url or title');
            return false;
        }
        if (r.price <= 0) {
            log.debug(`Skipping result: invalid price ${r.price}`, { url: r.url });
            return false;
        }
        if (!r.available) {
            log.debug('Skipping unavailable product', { url: r.url });
            return false;
        }
        return true;
    });

    // Deduplicate
    const unique = removeDuplicates(valid);
    const deduped = rawResults.length - unique.length;
    if (deduped > 0) {
        log.info(`Removed ${deduped} duplicate results`);
    }

    // Normalize
    const normalized = unique.map(normalizeOne);

    // Sort by total price (lowest first)
    normalized.sort((a, b) => a.totalPrice - b.totalPrice);

    log.timed('Normalization completed', start, {
        input: rawResults.length,
        valid: valid.length,
        deduplicated: deduped,
        output: normalized.length,
    });

    return normalized;
}

export function findBestPrice(results: NormalizedResult[]): NormalizedResult | undefined {
    if (results.length === 0) return undefined;
    // Already sorted by totalPrice — first is cheapest
    return results[0];
}
