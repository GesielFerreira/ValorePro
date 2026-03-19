// ============================================================
// ValorePro — Playwright Price Scraper
// ============================================================
// Headless browser scraper for extracting product prices
// from e-commerce pages. Handles anti-bot detection with
// randomized delays, user-agent rotation, and retries.
// ============================================================

import { createLogger } from '@/lib/logger';
import type { RawProductResult, ScrapedPriceData } from '@/types/search';

const log = createLogger('playwright-scraper');

// Lazy-load playwright to avoid bundling it on the client
let chromium: any; // eslint-disable-line

async function getChromium() {
    if (!chromium) {
        // Dynamic require to avoid client-side bundling
        const pw = require('playwright');
        chromium = pw.chromium;
    }
    return chromium;
}

// ── User Agents ──────────────────────────────────────────────

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

function randomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomDelay(min = 800, max = 2500): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min)) + min;
    return new Promise((r) => setTimeout(r, ms));
}

// ── Price Extraction Selectors ───────────────────────────────
// Ordered by specificity — we try the most common patterns first.

const PRICE_SELECTORS = [
    // Generic e-commerce
    '[data-testid="price"]',
    '[data-price]',
    '.product-price',
    '.price-value',
    '.price__value',
    '.sale-price',
    '.best-price',
    '.preco-avista',
    '.preco-por',
    // Brazilian stores
    '.priceSales', // Americanas / Submarino
    '.price-template__text', // KaBuM
    '.product-price__highlight', // Magazine Luiza
    '.a-price .a-offscreen', // Amazon BR
    '.price--xl', // Shopee
    // Fallback
    '[itemprop="price"]',
    '.price',
    '#price',
];

const TITLE_SELECTORS = [
    'h1[data-testid="product-title"]',
    'h1.product-title',
    'h1.product-name',
    '[itemprop="name"]',
    'h1',
];

const IMAGE_SELECTORS = [
    'img[data-testid="product-image"]',
    '.product-image img',
    '[itemprop="image"]',
    '.gallery img',
    '#product-image',
];

// ── Price Parsing ────────────────────────────────────────────

function parseBrazilianPrice(text: string): number | null {
    if (!text) return null;

    // Remove currency symbols, spaces, and "à vista" / "no boleto" etc.
    const cleaned = text
        .replace(/R\$\s*/g, '')
        .replace(/[^\d.,]/g, '')
        .trim();

    if (!cleaned) return null;

    // Brazilian format: 1.299,90 → 1299.90
    // Handle both "1.299,90" and "1299.90"
    let normalized: string;

    if (cleaned.includes(',')) {
        // Brazilian format: "1.299,90"
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
        normalized = cleaned;
    }

    const value = parseFloat(normalized);
    return isNaN(value) || value <= 0 ? null : value;
}

function parseInstallments(text: string): { count: number; value: number; total: number } | null {
    // Patterns: "12x de R$ 99,90", "10x R$149,99 sem juros"
    const match = text.match(/(\d{1,2})x\s*(?:de\s*)?R?\$?\s*([\d.,]+)/i);
    if (!match) return null;

    const count = parseInt(match[1], 10);
    const value = parseBrazilianPrice(match[2]);

    if (!value || count <= 0) return null;

    return { count, value, total: count * value };
}

// ── Core Scraper ─────────────────────────────────────────────

async function scrapePage(url: string): Promise<ScrapedPriceData> {
    const browser = await (await getChromium()).launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
        userAgent: randomUserAgent(),
        viewport: { width: 1366, height: 768 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
    });

    // Block heavy resources to speed up scraping
    await context.route('**/*', (route: any) => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
            return route.abort();
        }
        return route.continue();
    });

    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await randomDelay(500, 1500);

        // Extract price
        let cashPrice: number | undefined;
        for (const selector of PRICE_SELECTORS) {
            try {
                const el = await page.$(selector);
                if (!el) continue;

                const text = await el.textContent();
                const price = parseBrazilianPrice(text || '');
                if (price) {
                    cashPrice = price;
                    break;
                }
            } catch {
                continue;
            }
        }

        // Try data-price attribute as fallback
        if (!cashPrice) {
            const dpEl = await page.$('[data-price]');
            if (dpEl) {
                const dp = await dpEl.getAttribute('data-price');
                const price = parseBrazilianPrice(dp || '');
                if (price) cashPrice = price;
            }
        }

        // Try meta tag as last resort
        if (!cashPrice) {
            const metaPrice = await page.$('meta[property="product:price:amount"]');
            if (metaPrice) {
                const content = await metaPrice.getAttribute('content');
                const price = parseBrazilianPrice(content || '');
                if (price) cashPrice = price;
            }
        }

        // Extract installment info from full page text
        let installmentPrice: ScrapedPriceData['installmentPrice'];
        const bodyText = await page.textContent('body');
        if (bodyText) {
            installmentPrice = parseInstallments(bodyText) || undefined;
        }

        // Extract title
        let title: string | undefined;
        for (const selector of TITLE_SELECTORS) {
            try {
                const el = await page.$(selector);
                if (el) {
                    title = (await el.textContent())?.trim();
                    if (title) break;
                }
            } catch {
                continue;
            }
        }

        // Extract image
        let imageUrl: string | undefined;
        for (const selector of IMAGE_SELECTORS) {
            try {
                const el = await page.$(selector);
                if (el) {
                    imageUrl = await el.getAttribute('src');
                    if (imageUrl) break;
                }
            } catch {
                continue;
            }
        }

        // Check product availability
        const outOfStockTexts = ['indisponível', 'esgotado', 'out of stock', 'produto indisponível'];
        const pageText = (bodyText || '').toLowerCase();
        const available = !outOfStockTexts.some((t) => pageText.includes(t));

        return {
            cashPrice,
            installmentPrice,
            title,
            imageUrl: imageUrl || undefined,
            available,
        };
    } finally {
        await browser.close();
    }
}

// ── Public API ───────────────────────────────────────────────

interface ScrapeOptions {
    urls: string[];
    maxConcurrent?: number;
    maxRetries?: number;
}

export async function scrapeProductPages(options: ScrapeOptions): Promise<RawProductResult[]> {
    const { urls, maxConcurrent = 3, maxRetries = 2 } = options;
    const start = Date.now();

    log.info(`Starting Playwright scraper for ${urls.length} URLs`, { maxConcurrent });

    const results: RawProductResult[] = [];

    // Process in batches to limit concurrent browser instances
    for (let i = 0; i < urls.length; i += maxConcurrent) {
        const batch = urls.slice(i, i + maxConcurrent);
        const batchNum = Math.floor(i / maxConcurrent) + 1;

        log.debug(`Processing batch ${batchNum} (${batch.length} URLs)`);

        const batchResults = await Promise.allSettled(
            batch.map((url) => scrapeWithRetry(url, maxRetries))
        );

        for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j];
            const url = batch[j];

            if (result.status === 'fulfilled' && result.value) {
                results.push(result.value);
            } else if (result.status === 'rejected') {
                log.warn(`Failed to scrape: ${url}`, { error: String(result.reason) });
            }
        }

        // Delay between batches to avoid detection
        if (i + maxConcurrent < urls.length) {
            await randomDelay(1500, 3000);
        }
    }

    log.timed('Playwright scraping completed', start, {
        attempted: urls.length,
        succeeded: results.length,
    });

    return results;
}

async function scrapeWithRetry(url: string, maxRetries: number): Promise<RawProductResult | null> {
    const domain = new URL(url).hostname.replace(/^www\./, '');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const data = await scrapePage(url);

            if (!data.cashPrice) {
                log.debug(`No price found on ${domain}, attempt ${attempt + 1}`);
                if (attempt < maxRetries) {
                    await randomDelay(2000, 5000); // Longer delay for retries
                    continue;
                }
                return null;
            }

            return {
                source: 'scraped',
                title: data.title || `Produto em ${domain}`,
                price: data.cashPrice,
                installment: data.installmentPrice,
                shippingCost: data.shippingCost || 0,
                shippingDays: data.shippingDays,
                url,
                imageUrl: data.imageUrl,
                storeName: domain,
                storeUrl: `https://${domain}`,
                available: data.available,
            };
        } catch (err) {
            const isLast = attempt === maxRetries;

            if (!isLast) {
                const backoff = (attempt + 1) * 2000 + Math.random() * 2000;
                log.warn(`Scrape attempt ${attempt + 1} failed for ${domain}, retrying in ${Math.round(backoff)}ms`, {
                    error: String(err),
                });
                await new Promise((r) => setTimeout(r, backoff));
            } else {
                log.error(`All ${maxRetries + 1} scrape attempts failed for ${domain}`, {
                    error: String(err),
                });
            }
        }
    }

    return null;
}
