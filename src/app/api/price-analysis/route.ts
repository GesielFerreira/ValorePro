// ============================================================
// ValorePro — Price Analysis API Route
// ============================================================
// GET /api/price-analysis?term=...&price=...
// Returns timing score, trend, and recommendation
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { analyzePriceTrend } from '@/server/services/price-intelligence';

export async function GET(request: NextRequest) {
    const term = request.nextUrl.searchParams.get('term');
    const priceStr = request.nextUrl.searchParams.get('price');

    if (!term || !priceStr) {
        return NextResponse.json(
            { error: 'Parâmetros "term" e "price" são obrigatórios.' },
            { status: 400 },
        );
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
        return NextResponse.json(
            { error: 'Preço inválido.' },
            { status: 400 },
        );
    }

    try {
        const analysis = await analyzePriceTrend(term, price);
        return NextResponse.json(analysis);
    } catch {
        return NextResponse.json(
            { error: 'Erro ao analisar preço.' },
            { status: 500 },
        );
    }
}
