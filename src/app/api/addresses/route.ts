// ============================================================
// ValorePro — Addresses API Route
// ============================================================
// POST   /api/addresses — add a new address
// DELETE /api/addresses — delete an address
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { label, street, number, complement, neighborhood, city, state, cep, is_default } = body;

        if (!street || !number || !neighborhood || !city || !state || !cep) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: street, number, neighborhood, city, state, cep' },
                { status: 400 },
            );
        }

        // If setting as default, unset other defaults
        if (is_default) {
            await admin
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', profile.id);
        }

        const { data: address, error } = await admin
            .from('addresses')
            .insert({
                user_id: profile.id,
                label: label || 'Endereço',
                street,
                number,
                complement: complement || null,
                neighborhood,
                city,
                state,
                cep,
                is_default: is_default ?? false,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Erro ao adicionar endereço.' }, { status: 500 });
        }

        return NextResponse.json({ address }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Erro ao adicionar endereço.' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const addressId = searchParams.get('id');

        if (!addressId) {
            return NextResponse.json({ error: 'ID do endereço é obrigatório.' }, { status: 400 });
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
            .from('addresses')
            .delete()
            .eq('id', addressId)
            .eq('user_id', profile.id);

        if (error) {
            return NextResponse.json({ error: 'Erro ao remover endereço.' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Erro ao remover endereço.' }, { status: 500 });
    }
}
