// ============================================================
// ValorePro — Store-Specific Checkout Strategies
// ============================================================
// CSS selectors and flow hints for major Brazilian e-commerce
// stores. Falls back to generic selectors for unknown stores.
// ============================================================

import type { StoreSelectors } from '@/types/purchase';

// ── Generic Selectors (Fallback) ─────────────────────────────

const GENERIC_SELECTORS: StoreSelectors = {
    addToCart: [
        'button[data-testid="add-to-cart"]',
        '#buy-button',
        '#add-to-cart',
        '.buy-button',
        '.add-to-cart',
        'button[name="add"]',
        'button:has-text("Comprar")',
        'button:has-text("Adicionar ao carrinho")',
        'button:has-text("Adicionar")',
        'a:has-text("Comprar")',
    ],
    goToCart: [
        'a[href*="/cart"]',
        'a[href*="/carrinho"]',
        '.cart-link',
        '#cart-icon',
        'button:has-text("Ver carrinho")',
        'button:has-text("Ir para o carrinho")',
    ],
    goToCheckout: [
        'button:has-text("Finalizar")',
        'button:has-text("Fechar pedido")',
        'button:has-text("Continuar")',
        'a:has-text("Finalizar compra")',
        'a[href*="/checkout"]',
        '#checkout-button',
        '.checkout-button',
    ],
    addressFields: {
        cep: ['input[name="cep"]', 'input[name="zipcode"]', 'input[name="zip"]', '#cep', 'input[placeholder*="CEP"]'],
        rua: ['input[name="street"]', 'input[name="rua"]', 'input[name="address"]', '#street', 'input[placeholder*="Rua"]'],
        numero: ['input[name="number"]', 'input[name="numero"]', '#number', 'input[placeholder*="Número"]'],
        complemento: ['input[name="complement"]', 'input[name="complemento"]', '#complement'],
        bairro: ['input[name="neighborhood"]', 'input[name="bairro"]', '#neighborhood'],
        cidade: ['input[name="city"]', 'input[name="cidade"]', '#city'],
        estado: ['select[name="state"]', 'select[name="estado"]', '#state', 'input[name="state"]'],
    },
    shippingOptions: [
        'input[name="shipping"]',
        'input[type="radio"][name*="frete"]',
        'input[type="radio"][name*="shipping"]',
        '.shipping-option input',
        '.frete-option',
        'label:has-text("Frete")',
    ],
    paymentSection: [
        'input[name="cardNumber"]',
        'input[name="card_number"]',
        'input[placeholder*="Número do cartão"]',
        '#card-number',
        '.credit-card-form',
    ],
    confirmOrder: [
        'button:has-text("Finalizar pedido")',
        'button:has-text("Confirmar")',
        'button:has-text("Pagar")',
        'button:has-text("Concluir")',
        'button[type="submit"]:has-text("Comprar")',
        '#place-order',
        '.place-order-button',
    ],
    orderNumber: [
        '[data-testid="order-number"]',
        '.order-number',
        '#order-number',
        '.pedido-numero',
        'span:has-text("Pedido")',
    ],
    totalPrice: [
        '.order-total',
        '.total-price',
        '#total',
        '[data-testid="total"]',
        'span:has-text("Total")',
    ],
    priceOnPage: [
        '[data-testid="price"]',
        '.product-price',
        '.price-value',
        '[itemprop="price"]',
        '#price',
        '.sale-price',
    ],
};

// ── Store-Specific Overrides ─────────────────────────────────

const STORE_OVERRIDES: Record<string, Partial<StoreSelectors>> = {
    'kabum.com.br': {
        addToCart: [
            '#botaoComprar',
            'button[data-testid="buy-button"]',
            'button:has-text("COMPRAR")',
        ],
        priceOnPage: [
            '.price-template__text',
            '.finalPrice',
            'h4[itemprop="price"]',
        ],
    },

    'magazineluiza.com.br': {
        addToCart: [
            '#bagButton',
            'button[data-testid="bagButton"]',
            'button:has-text("Adicionar à sacola")',
            'button:has-text("Adicionar ao carrinho")',
        ],
        goToCheckout: [
            '#buyButton',
            'button[data-testid="buyButton"]',
            'button:has-text("Comprar")',
            'a[href*="/sacola"]',
        ],
        priceOnPage: [
            'p[data-testid="price-value"]',
            '[data-testid="price-value"]',
        ],
    },

    'magalu.com.br': {
        addToCart: [
            '#bagButton',
            'button[data-testid="bagButton"]',
            'button:has-text("Adicionar à sacola")',
            'button:has-text("Adicionar ao carrinho")',
        ],
        goToCheckout: [
            '#buyButton',
            'button[data-testid="buyButton"]',
            'button:has-text("Comprar")',
            'a[href*="/sacola"]',
        ],
        priceOnPage: [
            'p[data-testid="price-value"]',
            '[data-testid="price-value"]',
        ],
    },

    'amazon.com.br': {
        addToCart: [
            '#add-to-cart-button',
            'input[name="submit.add-to-cart"]',
        ],
        goToCheckout: [
            '#sc-buy-box-ptc-button input',
            'input[name="proceedToRetailCheckout"]',
        ],
        priceOnPage: [
            '.a-price .a-offscreen',
            '#priceblock_ourprice',
            '#corePrice_feature_div .a-offscreen',
        ],
        orderNumber: [
            '.a-alert-content bdi',
            '#orderId',
            '[data-testid="order-id"]',
        ],
    },

    'americanas.com.br': {
        addToCart: [
            'button[data-testid="add-cart-button"]',
            'button:has-text("Adicionar")',
        ],
        priceOnPage: [
            '.priceSales',
            '[data-testid="main-price"]',
        ],
    },

    'casasbahia.com.br': {
        addToCart: [
            'button[data-testid="add-cart-button"]',
            'button:has-text("Comprar")',
        ],
        priceOnPage: [
            '.price__SalesPrice',
            '[data-testid="price-value"]',
        ],
    },

    'shopee.com.br': {
        addToCart: [
            'button:has-text("Adicionar ao Carrinho")',
            '.btn-solid-primary:has-text("carrinho")',
        ],
        priceOnPage: [
            '.price--xl',
            '._3e_UQa',
        ],
    },
};

// ── Public API ───────────────────────────────────────────────

export function getSelectorsForStore(domain: string): StoreSelectors {
    const cleanDomain = domain.replace(/^www\./, '');
    const overrides = STORE_OVERRIDES[cleanDomain];

    if (!overrides) return GENERIC_SELECTORS;

    // Deep merge: store-specific selectors override the generic ones
    return {
        addToCart: overrides.addToCart || GENERIC_SELECTORS.addToCart,
        goToCart: overrides.goToCart || GENERIC_SELECTORS.goToCart,
        goToCheckout: overrides.goToCheckout || GENERIC_SELECTORS.goToCheckout,
        addressFields: {
            ...GENERIC_SELECTORS.addressFields,
            ...(overrides.addressFields || {}),
        },
        shippingOptions: overrides.shippingOptions || GENERIC_SELECTORS.shippingOptions,
        paymentSection: overrides.paymentSection || GENERIC_SELECTORS.paymentSection,
        confirmOrder: overrides.confirmOrder || GENERIC_SELECTORS.confirmOrder,
        orderNumber: overrides.orderNumber || GENERIC_SELECTORS.orderNumber,
        totalPrice: overrides.totalPrice || GENERIC_SELECTORS.totalPrice,
        priceOnPage: overrides.priceOnPage || GENERIC_SELECTORS.priceOnPage,
    };
}

export function getSupportedStores(): string[] {
    return Object.keys(STORE_OVERRIDES);
}
