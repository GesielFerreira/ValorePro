// ============================================================
// ValorePro — Smart Deep Links Generator
// ============================================================
// Generates optimized URLs that take the user as close to
// checkout as possible on each supported store.
// ============================================================

interface DeepLinkResult {
    url: string;
    type: 'direct_cart' | 'product_page' | 'app_deeplink';
    instructions?: string;
}

const STORE_DEEP_LINK_GENERATORS: Record<string, (url: string) => DeepLinkResult> = {
    'amazon.com.br': (url) => {
        // Amazon supports "Add to Cart" via URL params when ASIN is known
        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/product\/([A-Z0-9]{10})/i);
        if (asinMatch) {
            return {
                url: `https://www.amazon.com.br/gp/aws/cart/add.html?ASIN.1=${asinMatch[1]}&Quantity.1=1`,
                type: 'direct_cart',
                instructions: 'Produto adicionado ao carrinho automaticamente. Finalize o pagamento.',
            };
        }
        return { url, type: 'product_page' };
    },

    'mercadolivre.com.br': (url) => {
        // ML supports direct buy URL
        if (url.includes('/p/')) {
            return {
                url: url.replace(/\?.*$/, '') + '?pdp_filters=official_store:all#searchVariation',
                type: 'product_page',
                instructions: 'Clique em "Comprar agora" para finalizar.',
            };
        }
        return { url, type: 'product_page' };
    },

    'magazineluiza.com.br': (url) => ({
        url,
        type: 'product_page',
        instructions: 'Clique em "Adicionar à sacola" e finalize a compra.',
    }),

    'magalu.com.br': (url) => ({
        url,
        type: 'product_page',
        instructions: 'Clique em "Adicionar à sacola" e finalize a compra.',
    }),

    'kabum.com.br': (url) => ({
        url,
        type: 'product_page',
        instructions: 'Clique em "COMPRAR" e finalize no carrinho.',
    }),

    'americanas.com.br': (url) => ({
        url,
        type: 'product_page',
        instructions: 'Clique em "Adicionar" e finalize.',
    }),

    'casasbahia.com.br': (url) => ({
        url,
        type: 'product_page',
        instructions: 'Clique em "Comprar" e finalize.',
    }),

    'shopee.com.br': (url) => ({
        url,
        type: 'product_page',
        instructions: 'Clique em "Comprar Agora" ou "Adicionar ao Carrinho".',
    }),

    'aliexpress.com': (url) => ({
        url,
        type: 'product_page',
        instructions: 'Clique em "Buy Now" ou "Add to Cart".',
    }),
};

export function generateDeepLink(productUrl: string, storeDomain: string): DeepLinkResult {
    const cleanDomain = storeDomain.replace(/^www\./, '');
    const generator = STORE_DEEP_LINK_GENERATORS[cleanDomain];

    if (generator) {
        return generator(productUrl);
    }

    return {
        url: productUrl,
        type: 'product_page',
        instructions: 'Acesse o produto e finalize a compra diretamente na loja.',
    };
}

export function getStoreCheckoutTips(storeDomain: string): string[] {
    const cleanDomain = storeDomain.replace(/^www\./, '');

    const tips: Record<string, string[]> = {
        'amazon.com.br': [
            'Use Amazon Prime para frete grátis',
            'Verifique se há cupom na página do produto',
            'Pague com Pix para desconto adicional',
        ],
        'mercadolivre.com.br': [
            'Mercado Pago oferece desconto em compras via app',
            'Frete grátis para compras acima de R$ 79 (Full)',
            'Verifique a reputação do vendedor',
        ],
        'magazineluiza.com.br': [
            'App Magalu geralmente tem preço menor',
            'Cashback disponível para clientes Lu',
            'Pague com Pix para desconto extra',
        ],
        'magalu.com.br': [
            'App Magalu geralmente tem preço menor',
            'Cashback disponível para clientes Lu',
            'Pague com Pix para desconto extra',
        ],
        'kabum.com.br': [
            'Pagamento via Pix tem desconto extra',
            'Prime Ninja tem frete grátis',
            'Verifique combos e kits com desconto',
        ],
        'shopee.com.br': [
            'Use cupons do vendedor na página',
            'Shopee Coins dão cashback',
            'Frete grátis em compras acima do mínimo',
        ],
    };

    return tips[cleanDomain] || [
        'Compare preços de frete antes de finalizar',
        'Verifique se há cupom de desconto disponível',
        'Pagamento via Pix geralmente tem desconto',
    ];
}
