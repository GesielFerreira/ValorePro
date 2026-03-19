// ============================================================
// ValorePro — Purchase API Route
// ============================================================
// POST /api/purchase — create a purchase record (+ optionally execute)
// GET  /api/purchase — get purchase(s) by id or user
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:purchase');

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Não autorizado. Faça login para continuar.' },
                { status: 401 },
            );
        }

        const body = await request.json();
        const { resultId, addressId, cardId, confirmacao } = body;

        if (!resultId) {
            return NextResponse.json(
                { error: 'ID do resultado é obrigatório.' },
                { status: 400 },
            );
        }

        const admin = createAdminSupabase();

        // Get user profile
        const { data: profile } = await admin
            .from('users')
            .select('id, name, email, cpf, phone')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        // Get the result (product data)
        const { data: result } = await admin
            .from('results')
            .select('*')
            .eq('id', resultId)
            .single();

        if (!result) {
            return NextResponse.json({ error: 'Resultado não encontrado.' }, { status: 404 });
        }

        // Get card if provided
        let card = null;
        if (cardId) {
            const { data: cardData } = await admin
                .from('cards')
                .select('*')
                .eq('id', cardId)
                .eq('user_id', profile.id)
                .single();
            card = cardData;
        } else {
            // Fallback: get default card
            const { data: defaultCard } = await admin
                .from('cards')
                .select('*')
                .eq('user_id', profile.id)
                .eq('is_default', true)
                .single();
            card = defaultCard;
        }

        // Get address if provided
        let address = null;
        if (addressId) {
            const { data: addrData } = await admin
                .from('addresses')
                .select('*')
                .eq('id', addressId)
                .eq('user_id', profile.id)
                .single();
            address = addrData;
        } else {
            // Fallback: get default address
            const { data: defaultAddr } = await admin
                .from('addresses')
                .select('*')
                .eq('user_id', profile.id)
                .eq('is_default', true)
                .single();
            address = defaultAddr;
        }

        // Calculate savings (difference between worst and current price)
        const { data: searchResults } = await admin
            .from('results')
            .select('total_price')
            .eq('search_id', result.search_id)
            .order('total_price', { ascending: false })
            .limit(1);

        const worstPrice = searchResults?.[0]?.total_price || result.total_price;
        const savings = Math.max(0, worstPrice - result.total_price);

        // Create purchase record
        const { data: purchase, error: purchaseError } = await admin
            .from('purchases')
            .insert({
                user_id: profile.id,
                result_id: resultId,
                search_id: result.search_id,
                product_title: result.title,
                product_url: result.product_url,
                product_price: result.cash_price,
                total_price: result.total_price,
                shipping_cost: result.shipping_cost,
                shipping_days: result.shipping_days,
                store_name: result.store_name,
                store_domain: result.store_domain,
                store_id: result.store_id,
                trust_score: result.trust_score,
                address_id: address?.id || null,
                card_id: card?.id || null,
                savings,
                status: confirmacao ? 'confirmed' : 'pending',
                confirmed_at: confirmacao ? new Date().toISOString() : null,
            })
            .select('*')
            .single();

        if (purchaseError || !purchase) {
            log.error('Failed to create purchase', { error: purchaseError });
            return NextResponse.json(
                { error: 'Erro ao registrar compra.' },
                { status: 500 },
            );
        }

        log.info('Purchase created', {
            purchaseId: purchase.id,
            store: result.store_name,
            total: result.total_price,
            confirmed: confirmacao,
        });

        // Send in-app notification
        if (confirmacao) {
            try {
                const { notifyPurchaseCompleted } = await import('@/server/services/notifications');
                await notifyPurchaseCompleted(profile.id, {
                    productTitle: result.title,
                    storeName: result.store_name,
                    totalPrice: result.total_price,
                    orderId: purchase.id,
                });
            } catch { /* non-blocking */ }
        }

        return NextResponse.json({
            purchase,
            product: {
                title: result.title,
                price: result.cash_price,
                totalPrice: result.total_price,
                shippingCost: result.shipping_cost,
                shippingDays: result.shipping_days,
                storeName: result.store_name,
                storeDomain: result.store_domain,
                productUrl: result.product_url,
                imageUrl: result.image_url,
            },
        });
    } catch (err) {
        log.error('Purchase API error', { error: String(err) });
        return NextResponse.json(
            { error: 'Erro interno ao processar compra.' },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const purchaseId = searchParams.get('id');

        if (purchaseId) {
            // Get single purchase
            const { data: purchase } = await admin
                .from('purchases')
                .select('*')
                .eq('id', purchaseId)
                .eq('user_id', profile.id)
                .single();

            if (!purchase) {
                return NextResponse.json({ error: 'Compra não encontrada.' }, { status: 404 });
            }

            return NextResponse.json({ purchase });
        }

        // List all user purchases
        const { data: purchases } = await admin
            .from('purchases')
            .select('id, product_title, product_url, store_name, store_domain, total_price, shipping_cost, shipping_days, status, savings, order_number, created_at, completed_at, trust_score')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(50);

        return NextResponse.json({ purchases: purchases || [] });
    } catch (err) {
        log.error('Purchase GET error', { error: String(err) });
        return NextResponse.json(
            { error: 'Erro ao buscar compras.' },
            { status: 500 },
        );
    }
}
