import { encode } from 'base-64';

// ============================================================
// ValorePro — Payment Service
// ============================================================
// Direct integration with Pagar.me V5 REST API
// API Endpoint: https://api.pagar.me/core/v5
// ============================================================

const PAGARME_API_URL = 'https://api.pagar.me/core/v5';
const getPagarmeHeaders = () => {
    const secretKey = process.env.PAGARME_SECRET_KEY || process.env.PAGARME_API_KEY;
    if (!secretKey) throw new Error('PAGARME_SECRET_KEY or PAGARME_API_KEY is missing');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encode(`${secretKey}:`)}`
    };
};

export interface PlanConfig {
    id: string;
    name: string;
    price: number;          // BRL cents
    priceLabel: string;     // Formatted label
    credits: number;        // Monthly search credits
    alerts: number;         // Max active alerts (-1 = unlimited)
    features: string[];
    iaPurchase: boolean;    // AI-powered automatic purchase
    popular?: boolean;
}

export const PLANS: Record<string, PlanConfig> = {
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 3490,
        priceLabel: 'R$ 34,90',
        credits: 50,
        alerts: 10,
        features: [
            '50 buscas por mês',
            '10 alertas de preço',
            'Histórico completo de buscas',
            'Score de confiança de lojas',
            'Suporte por e-mail',
        ],
        iaPurchase: false,
        popular: true,
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        price: 7990,
        priceLabel: 'R$ 79,90',
        credits: 120,
        alerts: -1,
        features: [
            '120 buscas por mês',
            'Alertas ilimitados',
            'Compra automática por IA',
            'Histórico completo de buscas',
            'Score de confiança de lojas',
            'Suporte prioritário',
        ],
        iaPurchase: true,
    },
    ilimitado: {
        id: 'ilimitado',
        name: 'Ilimitado',
        price: 29990,
        priceLabel: 'R$ 299,90',
        credits: -1,
        alerts: -1,
        features: [
            'Buscas ilimitadas',
            'Alertas ilimitados',
            'Compra automática por IA',
            'Histórico completo de buscas',
            'Score de confiança de lojas',
            'Suporte prioritário VIP',
        ],
        iaPurchase: true,
    },
};

// Credit add-on packs
export const CREDIT_PACKS = [
    { id: 'pack_10', credits: 10, price: 990, priceLabel: 'R$ 9,90' },
];

export function getPlan(planId: string): PlanConfig | null {
    return PLANS[planId] ?? null;
}

export function formatPrice(cents: number): string {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

// ============================================================
// Pagar.me Client Implementation (Direct HTTP / Core V5)
// ============================================================

export async function createCustomer(user: { name: string; email: string; cpf?: string; id: string }) {
    console.log(`[Pagar.me] Creating/Finding customer for ${user.email}`);
    
    // Check if customer exists first
    const searchRes = await fetch(`${PAGARME_API_URL}/customers?email=${encodeURIComponent(user.email)}`, {
        method: 'GET',
        headers: getPagarmeHeaders()
    });

    if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
            console.log(`[Pagar.me] Customer found: ${searchData.data[0].id}`);
            return {
                pagarme_customer_id: searchData.data[0].id,
                status: 'existing'
            };
        }
    }

    // Default document for missing CPF
    const defaultDocument = '00000000000';
    // Format document: numbers only
    const documentStr = (user.cpf || defaultDocument).replace(/\D/g, '');
    const cleanDoc = documentStr.padStart(11, '0').substring(0, 11);

    // Split name
    const [firstName, ...lastNameParts] = (user.name || 'User').split(' ');
    
    const res = await fetch(`${PAGARME_API_URL}/customers`, {
        method: 'POST',
        headers: getPagarmeHeaders(),
        body: JSON.stringify({
            name: user.name,
            email: user.email,
            document: cleanDoc,
            type: 'individual',
            document_type: 'CPF',
            phones: {
                mobile_phone: {
                    country_code: '55',
                    area_code: '11',
                    number: '999999999'
                }
            }
        })
    });

    if (!res.ok) {
        const err = await res.json();
        console.error('[Pagar.me] Create Customer Error:', JSON.stringify(err, null, 2));
        throw new Error(`Pagar.me Customer Error: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    console.log(`[Pagar.me] Customer created: ${data.id}`);

    return {
        pagarme_customer_id: data.id,
        status: 'created'
    };
}

export async function createCard(customerId: string, cardData: { number: string; holder_name: string; exp_month: number; exp_year: number; cvv: string }) {
    console.log(`[Pagar.me] Creating card for customer ${customerId}`);

    // Pagar.me V5 card format
    const res = await fetch(`${PAGARME_API_URL}/customers/${customerId}/cards`, {
        method: 'POST',
        headers: getPagarmeHeaders(),
        body: JSON.stringify({
            number: cardData.number,
            holder_name: cardData.holder_name,
            exp_month: cardData.exp_month,
            exp_year: cardData.exp_year,
            cvv: cardData.cvv,
            options: {
                verify_card: false
            }
        })
    });

    if (!res.ok) {
        const err = await res.json();
        console.error('[Pagar.me] Create Card Error:', JSON.stringify(err, null, 2));
        throw new Error(`Pagar.me Card Error: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    console.log(`[Pagar.me] Card created: ${data.id}`);
    return data.id as string;
}

export async function createSubscription(customerId: string, planId: string, cardId: string) {
    const plan = getPlan(planId);
    if (!plan) throw new Error('Invalid plan');

    console.log(`[Pagar.me] Creating subscription for customer ${customerId} ($${plan.price} / ${planId})`);

    const res = await fetch(`${PAGARME_API_URL}/subscriptions`, {
        method: 'POST',
        headers: getPagarmeHeaders(),
        body: JSON.stringify({
            customer_id: customerId,
            payment_method: 'credit_card',
            currency: 'BRL',
            interval: 'month',
            interval_count: 1,
            billing_type: 'prepaid',
            installments: 1,
            statement_descriptor: 'ValorePro',
            card_id: cardId,
            pricing_scheme: {
                scheme_type: 'Unit',
                price: plan.price
            },
            quantity: 1,
            description: `Assinatura ${plan.name} - ValorePro`,
            items: [
                {
                    description: `Assinatura ${plan.name} Mensal`,
                    quantity: 1,
                    pricing_scheme: {
                        scheme_type: 'Unit',
                        price: plan.price
                    }
                }
            ]
        })
    });

    if (!res.ok) {
        const err = await res.json();
        console.error('[Pagar.me] Create Sub Error:', JSON.stringify(err, null, 2));
        throw new Error(`Pagar.me Subscription Error: ${err.message || res.statusText}`);
    }

    const data = await res.json();

    return {
        id: data.id,
        status: data.status,
        current_period_start: data.current_cycle?.start_at,
        current_period_end: data.current_cycle?.end_at
    };
}

export async function cancelSubscription(subscriptionId: string) {
    console.log(`[Pagar.me] Canceling subscription ${subscriptionId}`);

    const res = await fetch(`${PAGARME_API_URL}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: getPagarmeHeaders(),
        body: JSON.stringify({
            cancel_pending_invoices: true
        })
    });

    if (!res.ok) {
        const err = await res.json();
        console.error('[Pagar.me] Cancel Sub Error:', JSON.stringify(err, null, 2));
        throw new Error(`Pagar.me Cancel Error: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    return { status: data.status };
}

export async function chargeCreditPack(customerId: string, packId: string, cardId: string) {
    const pack = CREDIT_PACKS.find(p => p.id === packId);
    if (!pack) throw new Error('Invalid credit pack');

    console.log(`[Pagar.me] Charging credit pack ${packId} for customer ${customerId}`);

    const res = await fetch(`${PAGARME_API_URL}/orders`, {
        method: 'POST',
        headers: getPagarmeHeaders(),
        body: JSON.stringify({
            customer_id: customerId,
            items: [
                {
                    amount: pack.price,
                    description: `Pacote: +${pack.credits} Buscas (ValorePro)`,
                    quantity: 1
                }
            ],
            payments: [
                {
                    payment_method: 'credit_card',
                    credit_card: {
                        card_id: cardId,
                        installments: 1,
                        statement_descriptor: 'ValorePro Cred'
                    }
                }
            ]
        })
    });

    if (!res.ok) {
        const err = await res.json();
        console.error('[Pagar.me] Charge Pack Error:', JSON.stringify(err, null, 2));
        throw new Error(`Pagar.me Charge Error: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    if (data.status !== 'paid') {
        throw new Error('Pagamento recusado pela intermediadora');
    }

    return {
        id: data.id,
        status: data.status
    };
}
