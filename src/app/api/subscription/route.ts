import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { getPlan, createCustomer, createSubscription, cancelSubscription } from '@/server/services/payment';

// GET /api/subscription
// Get the user's current subscription details
export async function GET() {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select(`
                *,
                card:cards(*)
            `)
            .eq('user_id', profile.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching subscription:', error);
            return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
        }

        return NextResponse.json(subscription || null);
    } catch (error) {
        console.error('Unhandled error in GET /api/subscription:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/subscription
// Create or upgrade a subscription
export async function POST(req: Request) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { planId, cardId } = body;

        const planConfig = getPlan(planId);
        if (!planConfig) {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
        }

        if (!cardId) {
            return NextResponse.json({ error: 'A payment method is required' }, { status: 400 });
        }

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // 1. Verify card belongs to user
        const { data: card, error: cardError } = await supabase
            .from('cards')
            .select('id, token')
            .eq('id', cardId)
            .eq('user_id', profile.id)
            .single();

        if (cardError || !card) {
            return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
        }

        if (!card.token) {
            return NextResponse.json({ error: 'Selected payment method does not have a Pagar.me token.' }, { status: 400 });
        }

        // ==========================================
        // PAGAR.ME INTEGRATION
        // ==========================================
        
        // 1. Create or Find Customer
        const customerResult = await createCustomer({
            id: user.id,
            name: user.user_metadata?.name || 'ValorePro User',
            email: user.email!,
            cpf: user.user_metadata?.cpf
        });

        // 2. Create Subscription
        let pagarmeSubs;
        try {
            pagarmeSubs = await createSubscription(
                customerResult.pagarme_customer_id,
                planConfig.id,
                card.token
            );
        } catch (subError: any) {
            console.error('Pagar.me Subscription Error:', subError);
            return NextResponse.json({ error: subError.message || 'Failed to create subscription at Pagar.me' }, { status: 400 });
        }

        // 3. Upsert subscription in database
        const { data: subscription, error: upsertError } = await admin
            .from('subscriptions')
            .upsert({
                user_id: profile.id,
                plan: planId,
                status: pagarmeSubs.status === 'active' ? 'active' : 'trialing',
                card_id: cardId,
                pagarme_subscription_id: pagarmeSubs.id,
                pagarme_customer_id: customerResult.pagarme_customer_id,
                current_period_start: pagarmeSubs.current_period_start || new Date().toISOString(),
                current_period_end: pagarmeSubs.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                cancelled_at: null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (upsertError) {
            console.error('Error creating subscription:', upsertError);
            return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
        }

        return NextResponse.json(subscription);
    } catch (error) {
        console.error('Unhandled error in POST /api/subscription:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/subscription
// Cancel subscription at period end
export async function DELETE() {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Fetch current subscription
        const { data: currentSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', profile.id)
            .single();

        if (!currentSub || currentSub.status !== 'active') {
            return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
        }

        // ==========================================
        // PAGAR.ME INTEGRATION
        // ==========================================
        if (currentSub.pagarme_subscription_id) {
            await cancelSubscription(currentSub.pagarme_subscription_id);
        }

        const now = new Date().toISOString();

        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .update({
                status: 'cancelled',
                cancelled_at: now,
                updated_at: now
                // Intentionally NOT downgrading plan yet, user keeps access until `current_period_end`
            })
            .eq('user_id', profile.id)
            .select()
            .single();

        if (error) {
            console.error('Error cancelling subscription:', error);
            return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
        }

        return NextResponse.json({ success: true, subscription });
    } catch (error) {
        console.error('Unhandled error in DELETE /api/subscription:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
