// ============================================================
// ValorePro — Price Alerts API Route
// ============================================================
// GET  /api/alerts      — list user alerts
// POST /api/alerts      — create new alert
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        const { data: alerts } = await admin
            .from('price_alerts')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });

        return NextResponse.json({ alerts: alerts || [] });
    } catch {
        return NextResponse.json({ error: 'Erro ao buscar alertas.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { productName, searchTerm, targetPrice } = body;

        if (!productName || !searchTerm || !targetPrice) {
            return NextResponse.json(
                { error: 'productName, searchTerm e targetPrice são obrigatórios.' },
                { status: 400 },
            );
        }

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users')
            .select('id, plan')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        // Check alert limits
        const { count } = await admin
            .from('price_alerts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('status', 'active');

        const alertLimit = profile.plan === 'free' ? 3 : profile.plan === 'pro' ? 20 : 100;

        if ((count || 0) >= alertLimit) {
            return NextResponse.json(
                { error: `Limite de ${alertLimit} alertas ativos atingido.`, upgrade: true },
                { status: 429 },
            );
        }

        const { data: alert, error } = await admin
            .from('price_alerts')
            .insert({
                user_id: profile.id,
                product_name: productName,
                search_term: searchTerm,
                target_price: targetPrice,
                status: 'active',
                expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Erro ao criar alerta.' }, { status: 500 });
        }

        return NextResponse.json({ alert }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Erro ao criar alerta.' }, { status: 500 });
    }
}
