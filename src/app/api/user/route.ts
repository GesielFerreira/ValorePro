// ============================================================
// ValorePro — User Profile API Route
// ============================================================
// GET   /api/user — get user profile
// PATCH /api/user — update user profile
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

        // Fetch profile first to get the internal user ID
        const { data: profile } = await admin
            .from('users')
            .select('*')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        // Now fetch addresses and cards in parallel using the known profile.id
        const [addressesResult, cardsResult] = await Promise.all([
            admin
                .from('addresses')
                .select('*')
                .eq('user_id', profile.id)
                .order('is_default', { ascending: false }),
            admin
                .from('cards')
                .select('id, last_four, brand, holder_name, expiry_month, expiry_year, is_default')
                .eq('user_id', profile.id)
                .order('is_default', { ascending: false }),
        ]);

        return NextResponse.json({
            profile,
            addresses: addressesResult.data || [],
            cards: cardsResult.data || [],
        });
    } catch {
        return NextResponse.json({ error: 'Erro ao carregar perfil.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const allowedFields = ['name', 'cpf', 'phone', 'avatar_url', 'notification_prefs'];
        const updates: Record<string, string> = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: 'Nenhum campo para atualizar.' },
                { status: 400 },
            );
        }

        const admin = createAdminSupabase();
        const { data: profile, error } = await admin
            .from('users')
            .update(updates)
            .eq('auth_id', user.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Erro ao atualizar perfil.' }, { status: 500 });
        }

        return NextResponse.json({ profile });
    } catch {
        return NextResponse.json({ error: 'Erro ao atualizar perfil.' }, { status: 500 });
    }
}
