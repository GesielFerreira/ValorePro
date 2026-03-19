// ============================================================
// ValorePro — Cards API Route
// ============================================================
// POST   /api/cards — add a new card
// DELETE /api/cards — delete a card
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { createCustomer, createCard } from '@/server/services/payment';

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
            .select('id, name, email, cpf')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        const body = await request.json();
        const { holder_name, number, cvv, brand, expiry_month, expiry_year, is_default } = body;

        if (!holder_name || !number || !cvv || !brand || !expiry_month || !expiry_year) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: holder_name, number, cvv, brand, expiry_month, expiry_year' },
                { status: 400 },
            );
        }

        let customerResult;
        try {
            // Create or find customer
            customerResult = await createCustomer({
                id: user.id,
                name: profile.name || holder_name,
                email: profile.email || user.email!,
                cpf: profile.cpf || undefined
            });
        } catch (e: any) {
            console.error('[Cards API] Error creating customer:', e);
            return NextResponse.json({ error: e.message || 'Erro ao criar cliente na operadora.' }, { status: 400 });
        }

        // Create card in Pagar.me
        let pagarmeCardId: string;
        try {
            pagarmeCardId = await createCard(customerResult.pagarme_customer_id, {
                number: number.replace(/\D/g, ''),
                holder_name,
                exp_month: Number(expiry_month),
                exp_year: Number(expiry_year),
                cvv
            });
        } catch (e: any) {
            console.error('[Cards API] Error creating card in Pagar.me:', e);
            return NextResponse.json({ error: e.message || 'Erro ao validar cartão na operadora' }, { status: 400 });
        }

        // If setting as default, unset other defaults
        if (is_default) {
            await admin
                .from('cards')
                .update({ is_default: false })
                .eq('user_id', profile.id);
        }

        const { data: card, error } = await admin
            .from('cards')
            .insert({
                user_id: profile.id,
                holder_name,
                last_four: number.replace(/\D/g, '').slice(-4),
                brand: brand.toLowerCase(),
                expiry_month: Number(expiry_month),
                expiry_year: Number(expiry_year),
                token: pagarmeCardId,
                is_default: is_default ?? false,
            })
            .select('id, last_four, brand, holder_name, expiry_month, expiry_year, is_default')
            .single();

        if (error) {
            console.error('[Cards API] Supabase Insert Error:', error);
            return NextResponse.json({ error: 'Erro de banco de dados ao salvar cartão.' }, { status: 500 });
        }

        return NextResponse.json({ card }, { status: 201 });
    } catch (outerError: any) {
        console.error('[Cards API] Outer catch error:', outerError);
        return NextResponse.json({ error: 'Erro interno ao processar requisição.' }, { status: 500 });
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
        const cardId = searchParams.get('id');

        if (!cardId) {
            return NextResponse.json({ error: 'ID do cartão é obrigatório.' }, { status: 400 });
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
            .from('cards')
            .delete()
            .eq('id', cardId)
            .eq('user_id', profile.id);

        if (error) {
            return NextResponse.json({ error: 'Erro ao remover cartão.' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Erro ao remover cartão.' }, { status: 500 });
    }
}
