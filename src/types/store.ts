// ============================================================
// ValorePro — Store Reputation Types
// ============================================================

export type StoreClassification = 'excelente' | 'confiavel' | 'regular' | 'duvidosa' | 'perigosa';

export interface StoreVerificationInput {
    domain: string;
    storeName: string;
    storeUrl: string;
    productPrice?: number;
    averagePrice?: number;
}

// ── CNPJ ─────────────────────────────────────────────────────

export interface CnpjData {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    status: 'ATIVA' | 'INATIVA' | 'SUSPENSA' | 'INAPTA' | 'BAIXADA' | string;
    dataAbertura: string;
    atividadePrincipal: string;
    uf: string;
    municipio: string;
    found: boolean;
}

// ── Domain ───────────────────────────────────────────────────

export interface DomainData {
    ageInYears: number;
    createdAt: string | null;
    sslValid: boolean;
    sslIssuer: string | null;
    sslExpiresAt: string | null;
}

// ── Reclame Aqui ─────────────────────────────────────────────

export interface ReclameAquiData {
    found: boolean;
    companyName: string | null;
    score: number | null;               // 0-10
    respondidas: number | null;         // % reclamações respondidas
    resolvidas: number | null;          // % reclamações resolvidas
    notaConsumidor: number | null;      // consumer rating 0-10
    reputation: string | null;          // "Ótimo", "Bom", "Regular", "Ruim", "Não recomendada"
    totalReclamacoes: number | null;
    url: string | null;
}

// ── Google Places ────────────────────────────────────────────

export interface GooglePlacesData {
    found: boolean;
    rating: number | null;              // 1-5
    totalReviews: number | null;
    placeId: string | null;
}

// ── Score Components ─────────────────────────────────────────

export interface ScoreBreakdown {
    cnpjScore: number;          // 0 or 25
    domainAgeScore: number;     // 0 or 20
    sslScore: number;           // 0 or 15
    reclameAquiScore: number;   // 0 or 25
    googleScore: number;        // 0 or 15
    priceBonus: number;         // -30, 0, or +10
}

export interface StoreAlert {
    type: 'danger' | 'warning' | 'info';
    code: string;
    message: string;
}

// ── Final Result ─────────────────────────────────────────────

export interface StoreReputationResult {
    domain: string;
    storeName: string;
    score: number;                       // 0-100
    classification: StoreClassification;
    breakdown: ScoreBreakdown;
    alerts: StoreAlert[];
    details: {
        cnpj: CnpjData | null;
        domain: DomainData;
        reclameAqui: ReclameAquiData;
        googlePlaces: GooglePlacesData;
    };
    verifiedAt: Date;
    duration: number;
}
