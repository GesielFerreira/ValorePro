// ============================================================
// ValorePro — Reclame Aqui Scraper
// ============================================================
// Searches the store on Reclame Aqui via scraping and extracts
// reputation score, resolution rate, and consumer rating.
// ============================================================

import { createLogger } from '@/lib/logger';
import type { ReclameAquiData } from '@/types/store';

const log = createLogger('reclame-aqui');

const RA_BASE = 'https://www.reclameaqui.com.br';

function slugify(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function emptyResult(): ReclameAquiData {
    return {
        found: false,
        companyName: null,
        score: null,
        respondidas: null,
        resolvidas: null,
        notaConsumidor: null,
        reputation: null,
        totalReclamacoes: null,
        url: null,
    };
}

export async function checkReclameAqui(storeName: string): Promise<ReclameAquiData> {
    const start = Date.now();
    log.info('Checking Reclame Aqui via SerpAPI search', { storeName });

    const result = emptyResult();
    try {
        const query = encodeURIComponent(`site:reclameaqui.com.br/empresa "${storeName}"`);
        const endpoint = `https://html.duckduckgo.com/html/?q=${query}`;

        const res = await fetch(endpoint, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Safari/537.36' },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            return result;
        }

        const html = await res.text();

        // Find the first organic result link and snippet
        const linkMatch = html.match(/<a[^>]*class="result__url"[^>]*href="([^"]+)"/i);
        const snippetMatch = html.match(/class="result__snippet[^>]*>([\s\S]*?)<\/a>/i);

        if (!linkMatch && !snippetMatch) {
            log.info('Store not found on Reclame Aqui', { storeName });
            return result;
        }

        result.found = true;
        if (linkMatch) {
            try {
                const rawUrl = linkMatch[1];
                const urlObj = new URL(rawUrl, 'https://html.duckduckgo.com');
                const uddg = urlObj.searchParams.get('uddg');
                result.url = uddg ? decodeURIComponent(uddg) : rawUrl;
            } catch {
                result.url = linkMatch[1];
            }
        }

        const title = storeName;
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const fullText = (title + " " + snippet).toLowerCase();

        // Example: "O consumidor avaliou o atendimento dessa empresa como BOM. A nota média nos últimos 6 meses é 7.8/10."
        const repMatch = fullText.match(/(ótimo|bom|regular|ruim|não recomendada|sem índice)/i);
        const scoreMatch = fullText.match(/nota\s*(\d+[.,]\d+)/i) || fullText.match(/(\d+[.,]\d+)\/10/i);
        const resolvesMatch = fullText.match(/(\d+[.,]?\d*)%\s*das\s*reclamações/i) || fullText.match(/resolveu\s*(\d+[.,]?\d*)%/i);

        if (repMatch) {
            // Capitalize first letter
            result.reputation = repMatch[1].charAt(0).toUpperCase() + repMatch[1].slice(1).toLowerCase();
        }

        if (scoreMatch) {
            result.score = parseFloat(scoreMatch[1].replace(',', '.'));
        }

        if (resolvesMatch) {
            result.resolvidas = parseFloat(resolvesMatch[1].replace(',', '.'));
        }

        log.timed('Reclame Aqui check completed', start, {
            found: result.found,
            score: result.score,
            reputation: result.reputation,
        });

        return result;
    } catch (err) {
        log.error('Reclame Aqui fetching failed', { error: String(err) });
        return result;
    }
}
