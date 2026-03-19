// ============================================================
// ValorePro — CNPJ Verification Service
// ============================================================
// 1. Extracts CNPJ from the store's footer via Playwright
// 2. Validates CNPJ via ReceitaWS public API
// ============================================================

import { createLogger } from '@/lib/logger';
import type { CnpjData } from '@/types/store';

const log = createLogger('cnpj-verifier');

const RECEITAWS_BASE = 'https://www.receitaws.com.br/v1/cnpj';

// ── CNPJ Extraction via Playwright ──────────────────────────

const CNPJ_REGEX = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

function cleanCnpj(raw: string): string {
    return raw.replace(/[.\-\/]/g, '');
}

function isValidCnpj(cnpj: string): boolean {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return false;
    if (/^(\d)\1+$/.test(digits)) return false;

    // Validate check digits
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(digits[12]) !== digit1) return false;

    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(digits[13]) !== digit2) return false;

    return true;
}

export async function extractCnpjFromSite(url: string): Promise<string | null> {
    const start = Date.now();
    log.info('Extracting CNPJ directly from site HTML', { url });

    try {
        // Fetch the raw HTML of the store's homepage
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html',
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            log.warn(`Failed to fetch site HTML: HTTP ${res.status}`, { url });
            return null;
        }

        const html = await res.text();
        
        // Match all potential CNPJs in the HTML body
        const matches = html.match(CNPJ_REGEX);

        if (matches) {
            for (const raw of matches) {
                const clean = cleanCnpj(raw);
                if (isValidCnpj(clean)) {
                    log.timed('CNPJ extracted directly from site HTML', start, { cnpj: clean });
                    return clean;
                }
            }
        }

        log.info('No valid CNPJ found directly on the site', { url });
        return null;
    } catch (err) {
        log.warn('Direct CNPJ extraction failed', { url, error: String(err) });
        return null;
    }
}

// ── ReceitaWS API Lookup ────────────────────────────────────

interface ReceitaWsResponse {
    status: string;
    cnpj: string;
    nome: string;
    fantasia: string;
    situacao: string;
    abertura: string;
    atividade_principal: { code: string; text: string }[];
    uf: string;
    municipio: string;
    message?: string;
}

async function queryReceitaWs(cnpj: string): Promise<CnpjData | null> {
    const clean = cnpj.replace(/\D/g, '');

    try {
        const res = await fetch(`${RECEITAWS_BASE}/${clean}`, {
            headers: { 'Accept': 'application/json' },
        });

        if (res.status === 429) {
            log.warn('ReceitaWS rate limit — backing off 3s');
            await new Promise((r) => setTimeout(r, 3000));
            const retry = await fetch(`${RECEITAWS_BASE}/${clean}`, {
                headers: { 'Accept': 'application/json' },
            });
            if (!retry.ok) return null;
            const data = await retry.json() as ReceitaWsResponse;
            return mapReceitaWsResponse(data);
        }

        if (!res.ok) {
            log.error(`ReceitaWS returned ${res.status}`, { cnpj: clean });
            return null;
        }

        const data = await res.json() as ReceitaWsResponse;

        if (data.status === 'ERROR' || data.message) {
            log.warn('ReceitaWS error response', { message: data.message });
            return null;
        }

        return mapReceitaWsResponse(data);
    } catch (err) {
        log.error('ReceitaWS request failed', { error: String(err) });
        return null;
    }
}

function mapReceitaWsResponse(data: ReceitaWsResponse): CnpjData {
    return {
        cnpj: data.cnpj,
        razaoSocial: data.nome,
        nomeFantasia: data.fantasia || data.nome,
        status: data.situacao,
        dataAbertura: data.abertura,
        atividadePrincipal: data.atividade_principal?.[0]?.text || 'Não informada',
        uf: data.uf,
        municipio: data.municipio,
        found: true,
    };
}

// ── Public API ───────────────────────────────────────────────

export async function verifyCnpj(storeUrl: string): Promise<CnpjData | null> {
    const start = Date.now();
    log.info('Starting CNPJ verification', { storeUrl });

    // Step 1: Extract CNPJ from site
    const cnpj = await extractCnpjFromSite(storeUrl);

    if (!cnpj) {
        log.info('No CNPJ found — cannot verify', { storeUrl });
        return null;
    }

    // Step 2: Query Receita Federal
    const result = await queryReceitaWs(cnpj);

    log.timed('CNPJ verification completed', start, {
        cnpj,
        status: result?.status || 'not_found',
    });

    return result;
}
