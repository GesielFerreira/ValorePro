// ============================================================
// ValorePro — Coupon Aggregation Service
// ============================================================
// Aggregates known coupon/discount info for Brazilian stores.
// Uses a static knowledge base + potential future API integrations.
// ============================================================

import { createLogger } from '@/lib/logger';

const log = createLogger('coupon-service');

export interface StoreCoupon {
    code: string;
    description: string;
    discount: string;          // "10%", "R$ 50", "Frete Grátis"
    type: 'percentage' | 'fixed' | 'shipping';
    minPurchase?: number;
    expiresAt?: string;
    verified: boolean;
    source: string;
}

export interface StoreDiscountInfo {
    storeDomain: string;
    storeName: string;
    coupons: StoreCoupon[];
    pixDiscount?: number;       // % discount for Pix payment
    cashbackPercent?: number;   // cashback %
    freeShippingMin?: number;   // min purchase for free shipping
    hasPrimeProgram: boolean;
    tips: string[];
}

// Known store discount patterns (always-on knowledge base)
const STORE_DISCOUNT_DB: Record<string, Partial<StoreDiscountInfo>> = {
    'amazon.com.br': {
        pixDiscount: 0,
        hasPrimeProgram: true,
        freeShippingMin: 0,
        tips: [
            'Amazon Prime: frete grátis e entrega rápida',
            'Verifique cupons na página do produto',
            'Subscribe & Save dá até 15% off em produtos recorrentes',
        ],
    },
    'kabum.com.br': {
        pixDiscount: 5,
        hasPrimeProgram: true,
        tips: [
            'Pagamento via Pix: até 5% de desconto',
            'KaBuM! Prime: frete grátis',
            'Flash Sales às sextas com descontos extras',
        ],
    },
    'magazineluiza.com.br': {
        pixDiscount: 3,
        cashbackPercent: 2,
        hasPrimeProgram: false,
        freeShippingMin: 99,
        tips: [
            'Pix: desconto adicional de ~3%',
            'App Magalu pode ter preço exclusivo',
            'Cashback para membros do programa',
        ],
    },
    'magalu.com.br': {
        pixDiscount: 3,
        cashbackPercent: 2,
        hasPrimeProgram: false,
        freeShippingMin: 99,
        tips: [
            'Pix: desconto adicional de ~3%',
            'App Magalu pode ter preço exclusivo',
            'Cashback para membros do programa',
        ],
    },
    'americanas.com.br': {
        pixDiscount: 5,
        hasPrimeProgram: false,
        freeShippingMin: 99,
        tips: [
            'Pix dá até 5% de desconto',
            'Cupom de primeira compra disponível',
            'Frete grátis acima de R$ 99',
        ],
    },
    'casasbahia.com.br': {
        pixDiscount: 5,
        hasPrimeProgram: false,
        freeShippingMin: 99,
        tips: [
            'Pix dá até 5% de desconto',
            'Frete grátis em produtos selecionados',
        ],
    },
    'mercadolivre.com.br': {
        pixDiscount: 0,
        hasPrimeProgram: false,
        freeShippingMin: 79,
        cashbackPercent: 1,
        tips: [
            'Mercado Livre Full: frete grátis acima de R$ 79',
            'Mercado Pontos: cashback nas compras',
            'Verifique a reputação do vendedor',
        ],
    },
    'shopee.com.br': {
        pixDiscount: 0,
        hasPrimeProgram: false,
        freeShippingMin: 0,
        cashbackPercent: 3,
        tips: [
            'Use cupons do vendedor na página',
            'Shopee Coins: cashback de até 5%',
            'Frete grátis com cupom de frete',
            'Verifique se o vendedor é "Shopee Oficial"',
        ],
    },
    'aliexpress.com': {
        pixDiscount: 0,
        hasPrimeProgram: false,
        tips: [
            'Choice: frete grátis e devolução',
            'Cupons de primeiro pedido',
            'Moedas AliExpress: desconto extra',
        ],
    },
};

export function getStoreDiscounts(storeDomain: string, storeName: string): StoreDiscountInfo {
    const cleanDomain = storeDomain.replace(/^www\./, '');
    const known = STORE_DISCOUNT_DB[cleanDomain];

    return {
        storeDomain: cleanDomain,
        storeName,
        coupons: [],
        pixDiscount: known?.pixDiscount ?? 0,
        cashbackPercent: known?.cashbackPercent ?? 0,
        freeShippingMin: known?.freeShippingMin,
        hasPrimeProgram: known?.hasPrimeProgram ?? false,
        tips: known?.tips ?? [
            'Verifique se a loja aceita Pix com desconto',
            'Procure cupons de primeira compra',
        ],
    };
}

export function calculatePixPrice(price: number, storeDomain: string): number | null {
    const cleanDomain = storeDomain.replace(/^www\./, '');
    const pixDiscount = STORE_DISCOUNT_DB[cleanDomain]?.pixDiscount;
    if (!pixDiscount || pixDiscount <= 0) return null;
    return Math.round((price * (1 - pixDiscount / 100)) * 100) / 100;
}

export function hasDiscountInfo(storeDomain: string): boolean {
    const cleanDomain = storeDomain.replace(/^www\./, '');
    return cleanDomain in STORE_DISCOUNT_DB;
}
