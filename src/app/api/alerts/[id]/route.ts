// ============================================================
// ValorePro — Alert by ID API Route
// ============================================================
// PATCH  /api/alerts/[id] — update alert (pause/resume)
// DELETE /api/alerts/[id] — delete alert
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } },
) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { status } = body;

        if (!['active', 'paused'].includes(status)) {
            return NextResponse.json(
                { error: 'Status deve ser "active" ou "paused".' },
                { status: 400 },
            );
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

        const { data: alert, error } = await admin
            .from('price_alerts')
            .update({ status })
            .eq('id', params.id)
            .eq('user_id', profile.id)
            .select()
            .single();

        if (error || !alert) {
            return NextResponse.json({ error: 'Alerta não encontrado.' }, { status: 404 });
        }

        return NextResponse.json({ alert });
    } catch {
        return NextResponse.json({ error: 'Erro ao atualizar alerta.' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } },
) {
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

        const { error } = await admin
            .from('price_alerts')
            .delete()
            .eq('id', params.id)
            .eq('user_id', profile.id);

        if (error) {
            return NextResponse.json({ error: 'Alerta não encontrado.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Erro ao deletar alerta.' }, { status: 500 });
    }
}
