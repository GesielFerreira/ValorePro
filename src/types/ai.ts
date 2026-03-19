// ============================================================
// ValorePro — AI Service Types
// ============================================================

// ── Product Identification ───────────────────────────────────

export interface ProductIdentificationInput {
    userQuery: string;
    imageBase64?: string;         // busca por imagem (câmera)
}

export interface IdentifiedProduct {
    nome: string;                 // "iPhone 17 Pro 256GB Preto Titanium"
    categoria: string;            // "smartphone"
    marca?: string;               // "Apple"
    modelo?: string;              // "iPhone 17 Pro"
    especificacoes?: string[];    // ["256GB", "Preto", "Titanium"]
    termoBusca: string;           // query otimizada para SerpAPI
    confianca: number;            // 0-1 confiança na identificação
}

// ── Result Analysis ──────────────────────────────────────────

export interface AnalysisInput {
    productName: string;
    results: AnalysisResultItem[];
}

export interface AnalysisResultItem {
    id: string;
    title: string;
    cashPrice: number;
    totalPrice: number;
    shippingCost: number;
    shippingDays?: number;
    storeName: string;
    storeDomain: string;
    trustScore: number;
    available: boolean;
}

export interface BestOptionAnalysis {
    selectedId: string;
    selectedTitle: string;
    storeName: string;
    totalPrice: number;
    justificativa: string;        // justificativa em PT-BR natural
    alternativas: Array<{
        id: string;
        motivo: string;             // "R$50 mais caro mas Score de 92"
    }>;
    alertas: string[];            // alertas sobre opções suspeitas
}

// ── Confirmation Message ─────────────────────────────────────

export interface ConfirmationInput {
    productName: string;
    price: number;
    shipping: number;
    shippingDays?: number;
    storeName: string;
    trustScore: number;
    savings?: number;
}

export interface ConfirmationMessage {
    mensagem: string;             // mensagem natural para o usuário
    destaque: string;             // frase curta de destaque
}

// ── Store Alert Analysis ─────────────────────────────────────

export interface StoreAlertInput {
    storeName: string;
    domain: string;
    trustScore: number;
    cnpjStatus?: string;
    domainAgeYears?: number;
    sslValid?: boolean;
    reclameAquiScore?: number;
    reclameAquiResolvidas?: number;
    googleRating?: number;
    googleReviews?: number;
    priceVsAverage?: number;     // % from average (-0.4 = 40% below)
}

export interface StoreAlertAnalysis {
    resumo: string;               // resumo em linguagem natural
    nivel: 'segura' | 'atencao' | 'risco';
    pontosFavoraveis: string[];
    pontosDeAtencao: string[];
    recomendacao: string;
}

// ── Client Config ────────────────────────────────────────────

export interface AIConfig {
    model: string;
    maxTokens: number;
    temperature: number;
}
