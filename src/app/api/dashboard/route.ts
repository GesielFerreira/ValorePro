// ============================================================
// ValorePro — Dashboard API Route
// ============================================================
// GET /api/dashboard — user stats, recent purchases, alerts
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const admin = createAdminSupabase();

        // Get user profile
        const { data: profile } = await admin
            .from('users')
            .select('*')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        // Parallel fetch all dashboard data
        const [purchases, alerts, searches, savingsAgg] = await Promise.all([
            admin
                .from('purchases')
                .select('id, product_title, store_name, total_price, status, savings, created_at')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(10),

            admin
                .from('price_alerts')
                .select('id, product_name, target_price, current_price, best_price_found, best_store_name, status, last_checked_at')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(20),

            admin
                .from('searches')
                .select('id, query, created_at')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(10),

            // Get the sum of savings using an aggregation to avoid fetching all rows
            admin
                .from('purchases')
                .select('savings.sum()')
                .eq('user_id', profile.id)
                .eq('status', 'completed')
                .single(),
        ]);

        const economyTotal = savingsAgg.data?.sum || 0;

        return NextResponse.json({
            user: {
                name: profile.name,
                email: profile.email,
                plan: profile.plan,
                searchesToday: profile.searches_today,
                searchesLimit: profile.searches_limit,
                avatarUrl: profile.avatar_url,
            },
            stats: {
                totalSavings: economyTotal,
                totalPurchases: purchases.data?.length || 0,
                activeAlerts: (alerts.data || []).filter((a: any) => a.status === 'active').length,
            },
            recentPurchases: purchases.data || [],
            alerts: alerts.data || [],
            recentSearches: searches.data || [],
        });
    } catch (err) {
        return NextResponse.json(
            { error: 'Erro ao carregar painel.' },
            { status: 500 },
        );
    }
}
