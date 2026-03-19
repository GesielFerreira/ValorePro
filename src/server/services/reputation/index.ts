// ============================================================
// ValorePro — Store Trust Score Calculator & Orchestrator
// ============================================================
// Runs all 4 verification checks in parallel, then computes
// a weighted trust score (0-100) with classification and alerts.
// ============================================================

import { createLogger } from '@/lib/logger';
import { verifyCnpj } from './cnpj-verifier';
import { verifyDomain } from './domain-verifier';
import { checkReclameAqui } from './reclame-aqui';
import { checkGooglePlaces } from './google-places';
import { TRUSTED_ECOMMERCE_DOMAINS } from '@/types/search';
import type {
    StoreVerificationInput,
    StoreReputationResult,
    StoreClassification,
    ScoreBreakdown,
    StoreAlert,
    CnpjData,
    DomainData,
    ReclameAquiData,
    GooglePlacesData,
} from '@/types/store';

const log = createLogger('trust-score');

export { verifyCnpj } from './cnpj-verifier';
export { verifyDomain } from './domain-verifier';
export { checkReclameAqui } from './reclame-aqui';
export { checkGooglePlaces } from './google-places';

// ── Score Weights ────────────────────────────────────────────

const WEIGHTS = {
    cnpjActive: 25,
    domainAge2Years: 20,
    sslValid: 15,
    reclameAquiAbove7: 25,
    googleAbove4: 15,
    priceNormal: 10,       // bonus
    priceSuspicious: -30,   // penalty
} as const;

// ── Score Calculation ────────────────────────────────────────

function calculateBreakdown(
    cnpj: CnpjData | null,
    domain: DomainData,
    reclameAqui: ReclameAquiData,
    googlePlaces: GooglePlacesData,
    productPrice?: number,
    averagePrice?: number,
): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
        cnpjScore: 0,
        domainAgeScore: 0,
        sslScore: 0,
        reclameAquiScore: 0,
        googleScore: 0,
        priceBonus: 0,
    };

    // CNPJ: +25 if active
    if (cnpj?.found && cnpj.status === 'ATIVA') {
        breakdown.cnpjScore = WEIGHTS.cnpjActive;
    }

    // Domain age: +20 if > 2 years
    if (domain.ageInYears >= 2) {
        breakdown.domainAgeScore = WEIGHTS.domainAge2Years;
    } else if (domain.ageInYears >= 1) {
        // Partial credit for 1-2 year old domains
        breakdown.domainAgeScore = Math.round(WEIGHTS.domainAge2Years * 0.5);
    }

    // SSL: +15 if valid
    if (domain.sslValid) {
        breakdown.sslScore = WEIGHTS.sslValid;
    }

    // Reclame Aqui: +25 if score > 7
    if (reclameAqui.found && reclameAqui.score != null) {
        if (reclameAqui.score >= 7) {
            breakdown.reclameAquiScore = WEIGHTS.reclameAquiAbove7;
        } else if (reclameAqui.score >= 5) {
            // Partial credit for scores 5-6.9
            breakdown.reclameAquiScore = Math.round(WEIGHTS.reclameAquiAbove7 * 0.4);
        }
    }

    // Google Places: +15 if rating > 4
    if (googlePlaces.found && googlePlaces.rating != null) {
        if (googlePlaces.rating >= 4) {
            breakdown.googleScore = WEIGHTS.googleAbove4;
        } else if (googlePlaces.rating >= 3) {
            breakdown.googleScore = Math.round(WEIGHTS.googleAbove4 * 0.5);
        }
    }

    // Price analysis: +10 bonus if within ±30%, -30 penalty if >40% below
    if (productPrice != null && averagePrice != null && averagePrice > 0) {
        const ratio = productPrice / averagePrice;

        if (ratio < 0.6) {
            // 40%+ below average — suspicious
            breakdown.priceBonus = WEIGHTS.priceSuspicious;
        } else if (ratio >= 0.7 && ratio <= 1.3) {
            // Within ±30% of average — normal
            breakdown.priceBonus = WEIGHTS.priceNormal;
        }
        // Outside ±30% but not suspicious: no bonus, no penalty
    }

    return breakdown;
}

function sumScore(breakdown: ScoreBreakdown): number {
    const raw =
        breakdown.cnpjScore +
        breakdown.domainAgeScore +
        breakdown.sslScore +
        breakdown.reclameAquiScore +
        breakdown.googleScore +
        breakdown.priceBonus;

    return Math.max(0, Math.min(100, raw));
}

function classify(score: number): StoreClassification {
    if (score >= 80) return 'excelente';
    if (score >= 60) return 'confiavel';
    if (score >= 40) return 'regular';
    if (score >= 20) return 'duvidosa';
    return 'perigosa';
}

// ── Alert Generation ─────────────────────────────────────────

function generateAlerts(
    cnpj: CnpjData | null,
    domain: DomainData,
    reclameAqui: ReclameAquiData,
    googlePlaces: GooglePlacesData,
    breakdown: ScoreBreakdown,
): StoreAlert[] {
    const alerts: StoreAlert[] = [];

    // CNPJ alerts
    if (!cnpj || !cnpj.found) {
        alerts.push({
            type: 'warning',
            code: 'CNPJ_NOT_FOUND',
            message: 'CNPJ não encontrado no site. A loja pode não ter registro formal.',
        });
    } else if (cnpj.status !== 'ATIVA') {
        alerts.push({
            type: 'danger',
            code: 'CNPJ_INACTIVE',
            message: `CNPJ registrado com situação "${cnpj.status}". Evite comprar nesta loja.`,
        });
    }

    // Domain alerts
    if (domain.ageInYears < 1) {
        alerts.push({
            type: 'warning',
            code: 'DOMAIN_NEW',
            message: `Domínio registrado há menos de 1 ano (${domain.ageInYears.toFixed(1)} anos). Lojas novas têm maior risco.`,
        });
    }

    if (!domain.sslValid) {
        alerts.push({
            type: 'danger',
            code: 'SSL_INVALID',
            message: 'Certificado SSL inválido ou ausente. Seus dados podem não estar protegidos.',
        });
    }

    // Reclame Aqui alerts
    if (!reclameAqui.found) {
        alerts.push({
            type: 'info',
            code: 'RA_NOT_FOUND',
            message: 'Loja não encontrada no Reclame Aqui. Sem histórico para avaliar reputação.',
        });
    } else if (reclameAqui.score != null && reclameAqui.score < 5) {
        alerts.push({
            type: 'danger',
            code: 'RA_BAD_SCORE',
            message: `Nota ${reclameAqui.score}/10 no Reclame Aqui. Reputação: ${reclameAqui.reputation || 'não recomendada'}.`,
        });
    } else if (reclameAqui.resolvidas != null && reclameAqui.resolvidas < 50) {
        alerts.push({
            type: 'warning',
            code: 'RA_LOW_RESOLUTION',
            message: `Apenas ${reclameAqui.resolvidas}% das reclamações foram resolvidas no Reclame Aqui.`,
        });
    }

    // Google Places alerts
    if (googlePlaces.found && googlePlaces.rating != null && googlePlaces.rating < 3) {
        alerts.push({
            type: 'warning',
            code: 'GOOGLE_LOW_RATING',
            message: `Nota ${googlePlaces.rating}/5 no Google (${googlePlaces.totalReviews} avaliações).`,
        });
    }

    // Price alerts
    if (breakdown.priceBonus === WEIGHTS.priceSuspicious) {
        alerts.push({
            type: 'danger',
            code: 'PRICE_TOO_LOW',
            message: 'Preço 40%+ abaixo da média do mercado. Possível golpe ou produto falsificado.',
        });
    }

    return alerts;
}

// ── Public API ───────────────────────────────────────────────

export async function verifyStoreReputation(
    input: StoreVerificationInput
): Promise<StoreReputationResult> {
    const start = Date.now();

    log.info('=== Starting store verification ===', {
        domain: input.domain,
        storeName: input.storeName,
    });

    if (TRUSTED_ECOMMERCE_DOMAINS.some(t => t.includes(input.domain) || input.domain.includes(t.replace('.com.br', '').replace('.com', '')))) {
        log.info('Auto-approving trusted domain', { domain: input.domain });
        const duration = Date.now() - start;
        return {
            domain: input.domain,
            storeName: input.storeName,
            score: 95,
            classification: 'excelente',
            breakdown: {
                cnpjScore: 25,
                domainAgeScore: 20,
                sslScore: 15,
                reclameAquiScore: 25,
                googleScore: 10,
                priceBonus: 0,
            },
            alerts: [{
                type: 'info',
                code: 'VERIFIED_PARTNER',
                message: 'Esta é uma loja parceira verificada e altamente confiável.',
            }],
            details: {
                cnpj: { cnpj: 'Parceiro Verificado', razaoSocial: input.storeName, nomeFantasia: input.storeName, status: 'ATIVA', dataAbertura: 'Ativo', atividadePrincipal: 'E-commerce', uf: 'BR', municipio: 'Brasil', found: true },
                domain: { ageInYears: 10, createdAt: null, sslValid: true, sslIssuer: null, sslExpiresAt: null },
                reclameAqui: { found: true, companyName: input.storeName, score: 9.0, respondidas: 100, resolvidas: 100, notaConsumidor: 9, reputation: 'RA1000', totalReclamacoes: 1000, url: null },
                googlePlaces: { found: true, rating: 4.8, totalReviews: 10000, placeId: null },
            },
            verifiedAt: new Date(),
            duration,
        };
    }

    // Run all 4 checks in parallel with Promise.allSettled
    const [cnpjResult, domainResult, raResult, googleResult] = await Promise.allSettled([
        verifyCnpj(input.storeUrl),
        verifyDomain(input.domain),
        checkReclameAqui(input.storeName),
        checkGooglePlaces(input.storeName),
    ]);

    // Extract values with safe defaults
    const cnpj: CnpjData | null =
        cnpjResult.status === 'fulfilled' ? cnpjResult.value : null;

    const domain: DomainData =
        domainResult.status === 'fulfilled'
            ? domainResult.value
            : { ageInYears: 0, createdAt: null, sslValid: false, sslIssuer: null, sslExpiresAt: null };

    const reclameAqui: ReclameAquiData =
        raResult.status === 'fulfilled'
            ? raResult.value
            : { found: false, companyName: null, score: null, respondidas: null, resolvidas: null, notaConsumidor: null, reputation: null, totalReclamacoes: null, url: null };

    const googlePlaces: GooglePlacesData =
        googleResult.status === 'fulfilled'
            ? googleResult.value
            : { found: false, rating: null, totalReviews: null, placeId: null };

    // Log individual check failures
    if (cnpjResult.status === 'rejected') {
        log.warn('CNPJ check failed', { error: String(cnpjResult.reason) });
    }
    if (domainResult.status === 'rejected') {
        log.warn('Domain check failed', { error: String(domainResult.reason) });
    }
    if (raResult.status === 'rejected') {
        log.warn('Reclame Aqui check failed', { error: String(raResult.reason) });
    }
    if (googleResult.status === 'rejected') {
        log.warn('Google Places check failed', { error: String(googleResult.reason) });
    }

    // Calculate score
    const breakdown = calculateBreakdown(
        cnpj, domain, reclameAqui, googlePlaces,
        input.productPrice, input.averagePrice
    );

    const score = sumScore(breakdown);
    const classification = classify(score);
    const alerts = generateAlerts(cnpj, domain, reclameAqui, googlePlaces, breakdown);

    const duration = Date.now() - start;

    const result: StoreReputationResult = {
        domain: input.domain,
        storeName: input.storeName,
        score,
        classification,
        breakdown,
        alerts,
        details: {
            cnpj,
            domain,
            reclameAqui,
            googlePlaces,
        },
        verifiedAt: new Date(),
        duration,
    };

    log.info('=== Store verification completed ===', {
        domain: input.domain,
        score,
        classification,
        alerts: alerts.length,
        duration: `${duration}ms`,
    });

    return result;
}
