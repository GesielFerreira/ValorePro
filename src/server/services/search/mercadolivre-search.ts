// ============================================================
// ValorePro — Mercado Livre Official API Search
// ============================================================
// Uses the official MeLi API (api.mercadolibre.com) to search
// for products, extracting price, shipping, seller, and link.
// ============================================================

import { createLogger } from '@/lib/logger';
import type { RawProductResult, MercadoLivreSearchResponse, MercadoLivreItem } from '@/types/search';

const log = createLogger('mercadolivre');

const MELI_API_BASE = 'https://api.mercadolibre.com';

interface MeliSearchOptions {
    query: string;
    maxResults?: number;
    condition?: 'new' | 'used';
    sort?: 'price_asc' | 'price_desc' | 'relevance';
}

function buildSearchUrl(options: MeliSearchOptions): string {
    const { query, maxResults = 20, condition, sort = 'price_asc' } = options;

    const params = new URLSearchParams({
        q: query,
        site_id: 'MLB', // Mercado Livre Brasil
        limit: String(maxResults),
        sort: sort,
    });

    if (condition) {
        params.set('condition', condition);
    }

    return `${MELI_API_BASE}/sites/MLB/search?${params.toString()}`;
}

async function fetchMeliApi<T>(url: string): Promise<T | null> {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
    };

    // Authenticated requests get higher rate limits
    if (process.env.MERCADOLIVRE_ACCESS_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.MERCADOLIVRE_ACCESS_TOKEN}`;
    }

    try {
        const res = await fetch(url, { headers });

        if (res.status === 429) {
            log.warn('MeLi rate limit hit, backing off');
            await new Promise((r) => setTimeout(r, 2000));
            const retry = await fetch(url, { headers });
            if (!retry.ok) return null;
            return retry.json() as Promise<T>;
        }

        if (!res.ok) {
            log.error(`MeLi API error: ${res.status}`, { url });
            throw new Error(`MercadoLivre API HTTP ${res.status}`);
        }

        return res.json() as Promise<T>;
    } catch (err) {
        log.error('MeLi API request failed', { error: String(err), url });
        throw err;
    }
}

async function getItemShippingCost(itemId: string): Promise<number> {
    // Free shipping items are already flagged in the search response.
    // For paid shipping, we'd need the buyer's zip code and a valid token.
    // This is a simplified version — returns 0 for now or uses shipping endpoint.
    try {
        const url = `${MELI_API_BASE}/items/${itemId}/shipping_options?zip_code=${process.env.DEFAULT_CEP || '01001000'}`;
        const data = await fetchMeliApi<{ options?: { cost: number }[] }>(url);

        if (data?.options?.[0]) {
            return data.options[0].cost;
        }
        return 0;
    } catch {
        return 0;
    }
}

function mapMeliItem(item: MercadoLivreItem, shippingCost: number): RawProductResult {
    return {
        source: 'mercadolivre',
        title: item.title,
        price: item.price,
        installment: item.installments
            ? {
                count: item.installments.quantity,
                value: item.installments.amount,
                total: item.installments.quantity * item.installments.amount,
            }
            : undefined,
        shippingCost: item.shipping.free_shipping ? 0 : shippingCost,
        url: item.permalink,
        imageUrl: item.thumbnail?.replace('http://', 'https://'),
        storeName: item.seller.nickname,
        storeUrl: `https://www.mercadolivre.com.br/perfil/${item.seller.nickname}`,
        seller: item.seller.nickname,
        available: item.available_quantity > 0,
        condition: item.condition === 'new' ? 'new' : 'used',
        raw: {
            meliId: item.id,
            soldQuantity: item.sold_quantity,
            availableQuantity: item.available_quantity,
            address: item.address,
        },
    };
}

export async function searchMercadoLivre(options: MeliSearchOptions): Promise<RawProductResult[]> {
    const start = Date.now();

    log.info('Starting Mercado Livre search', { query: options.query });

    const url = buildSearchUrl(options);
    const data = await fetchMeliApi<MercadoLivreSearchResponse>(url);

    if (!data?.results?.length) {
        log.warn('No Mercado Livre results found', { query: options.query });
        return [];
    }

    log.info(`Mercado Livre returned ${data.results.length} items (total: ${data.paging.total})`);

    // Fetch shipping costs in parallel (batched to avoid rate limits)
    const BATCH_SIZE = 5;
    const results: RawProductResult[] = [];

    for (let i = 0; i < data.results.length; i += BATCH_SIZE) {
        const batch = data.results.slice(i, i + BATCH_SIZE);

        const shippingCosts = await Promise.allSettled(
            batch.map((item) =>
                item.shipping.free_shipping
                    ? Promise.resolve(0)
                    : getItemShippingCost(item.id)
            )
        );

        for (let j = 0; j < batch.length; j++) {
            const settledResult = shippingCosts[j];
            const cost =
                settledResult.status === 'fulfilled'
                    ? settledResult.value
                    : 0;

            results.push(mapMeliItem(batch[j], cost));
        }
    }

    log.timed('Mercado Livre search completed', start, { results: results.length });

    return results;
}
