// ============================================================
// ValorePro — Watchlist API Route
// ============================================================
// GET    /api/watchlist — list user watchlist items
// POST   /api/watchlist — add product to watchlist
// DELETE /api/watchlist — remove item from watchlist
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users').select('id').eq('auth_id', user.id).single();
        if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });

        const { data: items } = await admin
            .from('watchlist')
            .select('*')
            .eq('user_id', profile.id)
            .neq('status', 'removed')
            .order('created_at', { ascending: false });

        return NextResponse.json({ items: items || [] });
    } catch {
        return NextResponse.json({ error: 'Erro ao buscar watchlist.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

        const body = await request.json();
        const { productTitle, productUrl, imageUrl, storeName, storeDomain, price, shippingCost, targetPrice } = body;

        if (!productTitle || !productUrl || !storeDomain || !price) {
            return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
        }

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users').select('id').eq('auth_id', user.id).single();
        if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });

        // Check for duplicates
        const { data: existing } = await admin
            .from('watchlist')
            .select('id')
            .eq('user_id', profile.id)
            .eq('product_url', productUrl)
            .eq('status', 'active')
            .limit(1);

        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'Produto já está na sua watchlist.' }, { status: 409 });
        }

        const { data: item, error } = await admin
            .from('watchlist')
            .insert({
                user_id: profile.id,
                product_title: productTitle,
                product_url: productUrl,
                image_url: imageUrl || null,
                store_name: storeName,
                store_domain: storeDomain,
                initial_price: price,
                current_price: price,
                lowest_price: price,
                lowest_price_at: new Date().toISOString(),
                highest_price: price,
                shipping_cost: shippingCost || 0,
                target_price: targetPrice || null,
                status: 'active',
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 });
        }

        return NextResponse.json({ item }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Erro ao salvar na watchlist.' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('id');
        if (!itemId) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users').select('id').eq('auth_id', user.id).single();
        if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });

        await admin
            .from('watchlist')
            .update({ status: 'removed' })
            .eq('id', itemId)
            .eq('user_id', profile.id);

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Erro ao remover.' }, { status: 500 });
    }
}
