// ============================================================
// ValorePro — Automated Purchase Types
// ============================================================

export type PurchaseStatus =
    | 'pending_confirmation'
    | 'confirmed'
    | 'navigating'
    | 'adding_to_cart'
    | 'filling_address'
    | 'selecting_shipping'
    | 'filling_payment'
    | 'confirming_order'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'price_mismatch'
    | 'out_of_stock';

export type PurchaseFailReason =
    | 'NO_CONFIRMATION'
    | 'OUT_OF_STOCK'
    | 'PRICE_CHANGED'
    | 'PAYMENT_FAILED'
    | 'TIMEOUT'
    | 'BLOCKED_BY_STORE'
    | 'CHECKOUT_ERROR'
    | 'NAVIGATION_ERROR'
    | 'STORE_LOGIN_REQUIRED'
    | 'UNKNOWN';

// ── Input ────────────────────────────────────────────────────

export interface UserAddress {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;       // UF 2 letras (SP, RJ, etc.)
    cep: string;          // "01001-000"
}

export interface UserData {
    nome: string;
    cpf: string;           // "000.000.000-00"
    telefone: string;      // "+5511999999999"
    email: string;
    endereco: UserAddress;
}

export interface PaymentToken {
    tokenId: string;        // Pagar.me token (nunca o número real)
    lastFourDigits: string; // "4242" para exibição
    brand: string;          // "visa", "mastercard", etc.
}

export interface PurchaseInput {
    productUrl: string;
    expectedPrice: number;    // preço que o usuário viu
    storeDomain: string;
    storeName: string;
    userData: UserData;
    paymentToken: PaymentToken;
    confirmacao: boolean;     // OBRIGATÓRIO: true para executar
    userId: string;
    searchId?: string;        // ID da busca que originou
}

// ── Output ───────────────────────────────────────────────────

export interface PurchaseSuccess {
    sucesso: true;
    numeroPedido: string;
    valorTotal: number;
    previsaoEntrega: string;
    loja: string;
    comprovanteUrl?: string;
    timestamp: Date;
}

export interface PurchaseFailure {
    sucesso: false;
    motivo: PurchaseFailReason;
    mensagem: string;         // mensagem legível em PT-BR
    urlManual: string;        // URL para o usuário comprar manualmente
    precoAtual?: number;      // se houve mudança de preço
    timestamp: Date;
}

export type PurchaseResult = PurchaseSuccess | PurchaseFailure;

// ── Audit Log ────────────────────────────────────────────────

export type AuditAction =
    | 'PURCHASE_REQUESTED'
    | 'CONFIRMATION_VALIDATED'
    | 'BROWSER_OPENED'
    | 'PAGE_LOADED'
    | 'PRICE_VERIFIED'
    | 'PRICE_MISMATCH_DETECTED'
    | 'ADD_TO_CART_CLICKED'
    | 'CART_CONFIRMED'
    | 'CHECKOUT_STARTED'
    | 'ADDRESS_FILLED'
    | 'SHIPPING_SELECTED'
    | 'PAYMENT_FILLED'
    | 'ORDER_CONFIRMED'
    | 'ORDER_NUMBER_CAPTURED'
    | 'SCREENSHOT_TAKEN'
    | 'ERROR_OCCURRED'
    | 'LOGIN_WALL_DETECTED'
    | 'PURCHASE_COMPLETED'
    | 'PURCHASE_FAILED'
    | 'PURCHASE_CANCELLED';

export interface AuditEntry {
    id: string;
    purchaseId: string;
    userId: string;
    action: AuditAction;
    details: Record<string, unknown>;
    screenshot?: string;       // base64 ou path para screenshot
    timestamp: Date;
    step: number;              // sequência numérica
}

// ── Store Strategy ───────────────────────────────────────────

export interface StoreSelectors {
    addToCart: string[];
    goToCart: string[];
    goToCheckout: string[];
    addressFields: {
        cep: string[];
        rua: string[];
        numero: string[];
        complemento: string[];
        bairro: string[];
        cidade: string[];
        estado: string[];
    };
    shippingOptions: string[];
    paymentSection: string[];
    confirmOrder: string[];
    orderNumber: string[];
    totalPrice: string[];
    priceOnPage: string[];
}
