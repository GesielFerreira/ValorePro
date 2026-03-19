// ============================================================
// ValorePro — Price History API Route
// ============================================================
// GET /api/price-history?term=iPhone+15 — price trends
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const term = request.nextUrl.searchParams.get('term');

    if (!term) {
        return NextResponse.json(
            { error: 'Parâmetro "term" é obrigatório.' },
            { status: 400 },
        );
    }

    try {
        const admin = createAdminSupabase();

        const { data, error } = await admin
            .from('price_history')
            .select('price, store_name, store_domain, recorded_at')
            .ilike('product_term', `%${term}%`)
            .order('recorded_at', { ascending: true })
            .limit(90);

        if (error) {
            return NextResponse.json({ error: 'Erro ao buscar histórico.' }, { status: 500 });
        }

        // Group by day for chart
        const grouped = (data || []).reduce((acc: Record<string, any>, item: any) => {
            const date = item.recorded_at.split('T')[0];
            if (!acc[date]) {
                acc[date] = { date, minPrice: item.price, maxPrice: item.price, avgPrice: item.price, count: 1 };
            } else {
                acc[date].minPrice = Math.min(acc[date].minPrice, item.price);
                acc[date].maxPrice = Math.max(acc[date].maxPrice, item.price);
                acc[date].avgPrice = ((acc[date].avgPrice * acc[date].count) + item.price) / (acc[date].count + 1);
                acc[date].count += 1;
            }
            return acc;
        }, {} as Record<string, { date: string; minPrice: number; maxPrice: number; avgPrice: number; count: number }>);

        return NextResponse.json({
            term,
            history: Object.values(grouped),
            totalDataPoints: data?.length || 0,
        });
    } catch {
        return NextResponse.json({ error: 'Erro ao buscar histórico.' }, { status: 500 });
    }
}
