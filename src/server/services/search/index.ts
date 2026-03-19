// ============================================================
// ValorePro — Product Search Orchestrator
// ============================================================
// Main entry point for the search module. Coordinates all
// three sources (SerpAPI, Mercado Livre, Playwright) in
// parallel using Promise.allSettled, then normalizes and
// ranks results by total price.
// ============================================================

import { createLogger } from '@/lib/logger';
import { createAdminSupabase } from '@/lib/supabase/server';
import { searchSerpApi } from './serp-search';
import { searchMercadoLivre } from './mercadolivre-search';
import { scrapeProductPages } from './playwright-scraper';
import { normalizeResults, findBestPrice } from './normalizer';
import type {
    SearchInput,
    SearchResult,
    RawProductResult,
    SearchStatus,
    NormalizedResult,
} from '@/types/search';

const log = createLogger('search-orchestrator');

export { normalizeResults, findBestPrice } from './normalizer';
export { searchSerpApi } from './serp-search';
export { searchMercadoLivre } from './mercadolivre-search';
export { scrapeProductPages } from './playwright-scraper';

// ── Configuration ────────────────────────────────────────────

const DEFAULT_MAX_RESULTS = 30;
const MAX_SCRAPE_URLS = 10;
const CACHE_TTL_HOURS = 12;

// In-memory lock to prevent concurrent identical searches (e.g., from React strict mode double-firing)
const ongoingSearches = new Map<string, Promise<SearchResult>>();

// ── Orchestrator ─────────────────────────────────────────────

export async function executeProductSearch(input: SearchInput): Promise<SearchResult> {
    const cleanQuery = input.query.trim().toLowerCase();

    // Request coalescing: if this exact query is currently running, wait for it instead of starting a new one.
    if (ongoingSearches.has(cleanQuery)) {
        log.info('Coalescing concurrent search request', { query: cleanQuery });
        return ongoingSearches.get(cleanQuery)!;
    }

    const searchPromise = executeProductSearchInternal(input, cleanQuery);
    ongoingSearches.set(cleanQuery, searchPromise);

    try {
        const result = await searchPromise;
        return result;
    } finally {
        ongoingSearches.delete(cleanQuery);
    }
}

async function executeProductSearchInternal(input: SearchInput, cleanQuery: string): Promise<SearchResult> {
    const start = Date.now();
    const searchId = `search_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    log.info('=== Starting product search ===', {
        searchId,
        query: cleanQuery,
        userId: input.userId,
    });

    const admin = createAdminSupabase();

    // ── Pre-flight: Check search history cache ────────────────
    try {
        const { data: cached } = await admin
            .from('searches')
            .select('*, results(*)')
            .eq('query', cleanQuery)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (cached && cached.results && cached.results.length > 0) {
            const ageHours = (Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60);

            if (ageHours < CACHE_TTL_HOURS) {
                log.info('🚀 Cache Hit! Returning recent results', { query: cleanQuery, ageHours: ageHours.toFixed(1) });

                const results: NormalizedResult[] = cached.results.map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    store: {
                        name: r.store_name,
                        domain: r.store_domain,
                        url: r.store_domain ? `https://${r.store_domain}` : '',
                    },
                    cashPrice: r.cash_price,
                    installment: r.installment_price ? { count: 1, value: r.installment_price, total: r.installment_price } : undefined,
                    shippingCost: r.shipping_cost,
                    shippingDays: r.shipping_days || undefined,
                    totalPrice: r.total_price,
                    url: r.product_url,
                    imageUrl: r.image_url || undefined,
                    available: r.available,
                    condition: 'new',
                    source: r.source,
                    scrapedAt: r.created_at ? new Date(r.created_at) : new Date(),
                }));

                const bestPrice = findBestPrice(results);
                const duration = Date.now() - start;



                return {
                    searchId,
                    query: input.query,
                    status: 'completed',
                    results,
                    sources: {
                        serpapi: { count: 0, errors: [] },
                        mercadolivre: { count: 0, errors: [] },
                        scraped: { count: 0, errors: [] }
                    },
                    totalResults: results.length,
                    bestPrice,
                    duration,
                    createdAt: new Date(),
                    isCached: true,
                };
            } else {
                log.info('Cache expired', { query: cleanQuery, ageHours: ageHours.toFixed(1) });
            }
        }
    } catch (err) {
        log.warn('Cache check failed, proceeding to fresh search', { error: String(err) });
    }

    const maxResults = input.maxResults || DEFAULT_MAX_RESULTS;

    const sources: SearchResult['sources'] = {
        serpapi: { count: 0, errors: [] },
        mercadolivre: { count: 0, errors: [] },
        scraped: { count: 0, errors: [] },
    };

    let status: SearchStatus = 'processing';
    const allRawResults: RawProductResult[] = [];

    // ── Phase 1: SerpAPI + Mercado Livre in parallel ─────────

    log.info('Phase 1: Searching SerpAPI + Mercado Livre in parallel');

    const [serpResult, meliResult] = await Promise.allSettled([
        searchSerpApi({ query: input.query, maxResults }),
        searchMercadoLivre({ query: input.query, maxResults }),
    ]);

    let scrapableUrls: string[] = [];

    // Process SerpAPI results
    if (serpResult.status === 'fulfilled') {
        const { products, scrapableUrls: urls } = serpResult.value;
        allRawResults.push(...products);
        scrapableUrls = urls;
        sources.serpapi.count = products.length;
        log.info(`SerpAPI: ${products.length} products, ${urls.length} URLs for scraping`);
    } else {
        const errMsg = String(serpResult.reason);
        sources.serpapi.errors.push(errMsg);
        log.error('SerpAPI search failed', { error: errMsg });
    }

    // Process Mercado Livre results
    if (meliResult.status === 'fulfilled') {
        allRawResults.push(...meliResult.value);
        sources.mercadolivre.count = meliResult.value.length;
        log.info(`Mercado Livre: ${meliResult.value.length} products`);
    } else {
        const errMsg = String(meliResult.reason);
        sources.mercadolivre.errors.push(errMsg);
        log.error('Mercado Livre search failed', { error: errMsg });
    }

    // ── Phase 2: Playwright scraping for SerpAPI URLs ────────

    if (scrapableUrls.length > 0) {
        const urlsToScrape = scrapableUrls.slice(0, MAX_SCRAPE_URLS);

        log.info(`Phase 2: Scraping ${urlsToScrape.length} pages with Playwright`);

        try {
            const scraped = await scrapeProductPages({
                urls: urlsToScrape,
                maxConcurrent: 3,
                maxRetries: 1,
            });

            allRawResults.push(...scraped);
            sources.scraped.count = scraped.length;
            log.info(`Playwright: ${scraped.length} products scraped`);
        } catch (err) {
            const errMsg = String(err);
            sources.scraped.errors.push(errMsg);
            log.error('Playwright scraping failed', { error: errMsg });
        }
    } else {
        log.info('Phase 2: Skipped (no URLs for scraping)');
    }

    // ── Phase 3: Normalize + Deduplicate + Rank ──────────────

    log.info('Phase 3: Normalizing and ranking results');

    const results = normalizeResults(allRawResults);
    const bestPrice = findBestPrice(results);
    const duration = Date.now() - start;

    // Determine final status
    const totalErrors = [
        ...sources.serpapi.errors,
        ...sources.mercadolivre.errors,
        ...sources.scraped.errors,
    ].length;

    if (results.length === 0 && totalErrors > 0) {
        status = 'failed';
    } else {
        status = 'completed';
    }

    const searchResult: SearchResult = {
        searchId,
        query: input.query,
        status,
        results,
        sources,
        totalResults: results.length,
        bestPrice,
        duration,
        createdAt: new Date(),
    };

    log.info('=== Search completed ===', {
        searchId,
        status,
        totalResults: results.length,
        bestPrice: bestPrice
            ? `R$ ${bestPrice.totalPrice.toFixed(2)} @ ${bestPrice.store.name}`
            : 'none',
        duration: `${duration}ms`,
        sources: {
            serpapi: sources.serpapi.count,
            mercadolivre: sources.mercadolivre.count,
            scraped: sources.scraped.count,
        },
    });



    return searchResult;
}
