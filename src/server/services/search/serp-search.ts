// ============================================================
// ValorePro — SerpAPI Web Search Service
// ============================================================
// Searches Google Shopping + organic results via SerpAPI,
// filters irrelevant domains, and returns raw product URLs.
// ============================================================

import { createLogger } from '@/lib/logger';
import {
    BLOCKED_DOMAINS,
    TRUSTED_ECOMMERCE_DOMAINS,
    type RawProductResult,
    type SerpApiResponse,
    type SerpApiShoppingItem,
    type SerpApiOrganicItem,
} from '@/types/search';

const log = createLogger('serp-search');

const SERPAPI_BASE = 'https://serpapi.com/search.json';

interface SerpSearchOptions {
    query: string;
    maxResults?: number;
    location?: string;
}

function buildSerpApiUrl(query: string, location: string): string {
    const params = new URLSearchParams({
        engine: 'google',
        q: `${query} comprar menor preço`,
        location,
        hl: 'pt-br',
        gl: 'br',
        google_domain: 'google.com.br',
        num: '20',
        api_key: process.env.SERPAPI_KEY || '',
    });

    return `${SERPAPI_BASE}?${params.toString()}`;
}

function buildShoppingUrl(query: string, location: string): string {
    const params = new URLSearchParams({
        engine: 'google_shopping',
        q: query,
        location,
        hl: 'pt-br',
        gl: 'br',
        google_domain: 'google.com.br',
        num: '30',
        api_key: process.env.SERPAPI_KEY || '',
    });

    return `${SERPAPI_BASE}?${params.toString()}`;
}

function getActualUrl(rawUrl: string): string {
    try {
        let fullUrl = rawUrl;
        if (rawUrl.startsWith('/')) {
            fullUrl = `https://www.google.com.br${rawUrl}`;
        }
        const u = new URL(fullUrl);
        if (u.hostname.includes('google.com')) {
            const dest = u.searchParams.get('url') || u.searchParams.get('q');
            if (dest && dest.startsWith('http')) return dest;
        }
        return fullUrl;
    } catch {
        return rawUrl;
    }
}

function extractDomain(url: string): string {
    try {
        const cleanUrl = getActualUrl(url);
        const hostname = new URL(cleanUrl).hostname.replace(/^www\./, '');
        return hostname;
    } catch {
        return '';
    }
}

function isDomainBlocked(url: string): boolean {
    const domain = extractDomain(url);
    return BLOCKED_DOMAINS.some((blocked) => domain.includes(blocked));
}

function parseShoppingItem(item: SerpApiShoppingItem): RawProductResult | null {
    const rawUrl = item.product_link || item.link;
    const productUrl = getActualUrl(rawUrl);

    if (!productUrl || !item.extracted_price) {
        log.warn('Skipping shopping item: missing URL or price', {
            title: item.title?.slice(0, 50),
            hasLink: !!item.link,
            hasProductLink: !!item.product_link,
            hasPrice: !!item.extracted_price,
        });
        return null;
    }
    if (isDomainBlocked(productUrl)) {
        log.warn('Skipping blocked domain', { url: productUrl.slice(0, 80) });
        return null;
    }

    let domain = extractDomain(productUrl);
    const storeName = item.source || domain;

    // If Google Shopping hides the real URL behind google.com/shopping/product
    // try to infer the correct domain from the store source name.
    if (domain.includes('google.com')) {
        const sourceLower = storeName.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Find best match in trusted domains
        const match = BLOCKED_DOMAINS.find(d => sourceLower.includes(d.replace('.com.br', '').replace('.com', '').replace(/[^a-z0-9]/g, ''))) ? null :
            TRUSTED_ECOMMERCE_DOMAINS.find(d => sourceLower.includes(d.replace('.com.br', '').replace('.com', '').replace(/[^a-z0-9]/g, '')));

        if (match) {
            domain = match;
        } else {
            // Fallback generic domain guess if no match
            domain = `${sourceLower}.com.br`;
        }
    }

    return {
        source: 'serpapi',
        title: item.title,
        price: item.extracted_price,
        shippingCost: 0,
        url: productUrl,
        imageUrl: item.thumbnail,
        storeName: storeName,
        storeUrl: `https://${domain}`,
        available: true,
        raw: { delivery: item.delivery },
    };
}

function extractUrlsFromOrganic(items: SerpApiOrganicItem[]): string[] {
    return items
        .map((item) => item.link)
        .filter((url): url is string => !!url && !isDomainBlocked(url));
}

async function fetchWithRetry(url: string, retries = 2): Promise<unknown> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url);

            if (!res.ok) {
                throw new Error(`SerpAPI HTTP ${res.status}: ${res.statusText}`);
            }

            return await res.json();
        } catch (err) {
            const isLast = attempt === retries;
            if (isLast) throw err;

            const delay = 1000 * (attempt + 1);
            log.warn(`SerpAPI attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
                error: String(err),
            });
            await new Promise((r) => setTimeout(r, delay));
        }
    }
}

export async function searchSerpApi(options: SerpSearchOptions): Promise<{
    products: RawProductResult[];
    scrapableUrls: string[];
}> {
    const { query, maxResults = 20, location = 'São Paulo, Brazil' } = options;
    const start = Date.now();

    log.info('Starting SerpAPI search', { query });

    if (!process.env.SERPAPI_KEY) {
        log.error('SERPAPI_KEY not configured');
        return { products: [], scrapableUrls: [] };
    }

    const products: RawProductResult[] = [];
    const scrapableUrls: string[] = [];

    // Run Google Shopping search only (saves 1 credit per search and prevents Playwright delay)
    const [shoppingRes] = await Promise.allSettled([
        fetchWithRetry(buildShoppingUrl(query, location)) as Promise<SerpApiResponse>,
    ]);

    // Parse shopping results → direct product data
    if (shoppingRes.status === 'fulfilled' && shoppingRes.value?.shopping_results) {
        const items = shoppingRes.value.shopping_results;
        log.info(`SerpAPI Shopping returned ${items.length} items`);

        for (const item of items) {
            const parsed = parseShoppingItem(item);
            if (parsed) products.push(parsed);
        }
    } else if (shoppingRes.status === 'rejected') {
        log.warn('SerpAPI Shopping search failed', { error: String(shoppingRes.reason) });
    }

    const trimmedProducts = products.slice(0, maxResults);

    log.timed('SerpAPI search completed', start, {
        products: trimmedProducts.length,
        scrapableUrls: scrapableUrls.length,
    });

    return { products: trimmedProducts, scrapableUrls };
}
