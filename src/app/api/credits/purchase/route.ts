import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { CREDIT_PACKS, createCustomer, chargeCreditPack } from '@/server/services/payment';

export async function POST(request: Request) {
    try {
        const supabase = createServerSupabase();
        
        // 1. Authenticate user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users')
            .select('id, searches_limit')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
        }

        // 2. Parse request body
        const { packId, cardId } = await request.json();

        if (!packId || !cardId) {
            return NextResponse.json({ error: 'ID do pacote e cartão são obrigatórios' }, { status: 400 });
        }

        const pack = CREDIT_PACKS.find(p => p.id === packId);
        if (!pack) {
            return NextResponse.json({ error: 'Pacote de créditos inválido' }, { status: 400 });
        }

        // 3. Verify card belongs to user
        const { data: card, error: cardError } = await supabase
            .from('cards')
            .select('id, token')
            .eq('id', cardId)
            .eq('user_id', profile.id)
            .single();

        if (cardError || !card) {
            return NextResponse.json({ error: 'Cartão não encontrado ou inválido' }, { status: 400 });
        }

        if (!card.token) {
            return NextResponse.json({ error: 'Cartão não possui token da Pagar.me' }, { status: 400 });
        }

        // 4. PAGAR.ME INTEGRATION
        // Create or Find Customer
        const customerResult = await createCustomer({
            id: user.id,
            name: user.user_metadata?.name || 'ValorePro User',
            email: user.email!,
            cpf: user.user_metadata?.cpf
        });
        
        // Charge Credit Pack
        const chargeResult = await chargeCreditPack(
            customerResult.pagarme_customer_id, 
            pack.id, 
            card.token
        );

        console.log(`[PAGAR.ME] Success - Charging ${pack.price} cents for pack ${packId}`);

        // 5. Update user limits
        const newLimit = (profile.searches_limit || 0) + pack.credits;

        const { error: userUpdateError } = await admin
            .from('users')
            .update({ searches_limit: newLimit } as any)
            .eq('id', profile.id);

        if (userUpdateError) {
            throw new Error('Falha ao atualizar limite de buscas.');
        }

        // Optionally, we could log this transaction in a `payments` table here.

        return NextResponse.json({
            success: true,
            newLimit,
            addedCredits: pack.credits
        });

    } catch (error: any) {
        console.error('Credits purchase error:', error);
        return NextResponse.json(
            { error: error.message || 'Erro interno no servidor' },
            { status: 500 }
        );
    }
}
