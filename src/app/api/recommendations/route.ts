// ============================================================
// ValorePro — AI Recommendations API Route
// ============================================================
// GET /api/recommendations — returns personalized product
// suggestions based on user's search history.
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

interface Recommendation {
    query: string;
    reason: string;
    category: 'accessory' | 'similar' | 'trending' | 'price_drop';
    icon: string;
}

// Known product → accessory mappings
const ACCESSORIES: Record<string, string[]> = {
    'iphone': ['capinha iphone', 'película iphone', 'carregador iphone', 'fone bluetooth apple'],
    'samsung galaxy': ['capinha samsung', 'película samsung galaxy', 'carregador samsung', 'fone bluetooth samsung'],
    'notebook': ['mouse sem fio', 'suporte notebook', 'teclado bluetooth', 'hub usb-c'],
    'macbook': ['case macbook', 'hub usb-c macbook', 'mouse apple magic', 'teclado apple'],
    'playstation': ['controle ps5', 'headset gamer', 'jogo ps5', 'suporte controle'],
    'xbox': ['controle xbox', 'headset gamer', 'game pass', 'suporte controle xbox'],
    'monitor': ['suporte monitor', 'cabo hdmi', 'cabo displayport', 'webcam'],
    'teclado': ['mouse gamer', 'mousepad', 'apoio de pulso'],
    'mouse': ['mousepad gamer', 'teclado mecânico'],
    'fone': ['case fone', 'adaptador bluetooth', 'cabo auxiliar'],
    'cadeira': ['mesa gamer', 'apoio de pé', 'suporte monitor'],
    'tv': ['soundbar', 'suporte tv parede', 'cabo hdmi 2.1', 'chromecast'],
    'geladeira': ['organizador geladeira', 'filtro agua geladeira'],
    'fogão': ['coifa', 'acendedor fogão'],
    'ar condicionado': ['defletor ar condicionado', 'controle universal ar'],
    'aspirador': ['filtro aspirador', 'bocal aspirador'],
    'câmera': ['cartão memória', 'tripé câmera', 'bolsa câmera', 'lente câmera'],
};

function findAccessories(query: string): Recommendation[] {
    const q = query.toLowerCase();
    const results: Recommendation[] = [];

    for (const [keyword, accessories] of Object.entries(ACCESSORIES)) {
        if (q.includes(keyword)) {
            const picks = accessories.slice(0, 2);
            for (const acc of picks) {
                results.push({
                    query: acc,
                    reason: `Complementa "${query}"`,
                    category: 'accessory',
                    icon: '🎯',
                });
            }
            break;
        }
    }

    return results;
}

function generateSimilarSearches(query: string): Recommendation[] {
    const q = query.toLowerCase();
    const results: Recommendation[] = [];

    // Price modifiers
    if (!q.includes('barato') && !q.includes('promoção')) {
        results.push({
            query: `${query} promoção`,
            reason: 'Buscar com desconto',
            category: 'similar',
            icon: '🏷️',
        });
    }

    return results;
}

export async function GET() {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users').select('id').eq('auth_id', user.id).single();
        if (!profile) return NextResponse.json({ recommendations: [] });

        // Get recent searches
        const { data: searches } = await admin
            .from('searches')
            .select('query')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!searches || searches.length === 0) {
            return NextResponse.json({
                recommendations: [
                    { query: 'fone bluetooth', reason: 'Popular agora', category: 'trending', icon: '🔥' },
                    { query: 'notebook gamer', reason: 'Em alta', category: 'trending', icon: '🔥' },
                    { query: 'iphone 15', reason: 'Mais buscado', category: 'trending', icon: '📱' },
                ],
            });
        }

        const recommendations: Recommendation[] = [];
        const seenQueries = new Set<string>();

        for (const search of searches) {
            // Add accessories
            const accessories = findAccessories(search.query);
            for (const acc of accessories) {
                if (!seenQueries.has(acc.query)) {
                    seenQueries.add(acc.query);
                    recommendations.push(acc);
                }
            }

            // Add similar searches
            const similar = generateSimilarSearches(search.query);
            for (const sim of similar) {
                if (!seenQueries.has(sim.query)) {
                    seenQueries.add(sim.query);
                    recommendations.push(sim);
                }
            }
        }

        // Fill with trending if not enough
        if (recommendations.length < 4) {
            const trending: Recommendation[] = [
                { query: 'fone bluetooth', reason: 'Popular agora', category: 'trending', icon: '🔥' },
                { query: 'notebook gamer', reason: 'Em alta', category: 'trending', icon: '🔥' },
                { query: 'smart tv 4k', reason: 'Destaque', category: 'trending', icon: '📺' },
            ];
            for (const t of trending) {
                if (!seenQueries.has(t.query) && recommendations.length < 6) {
                    seenQueries.add(t.query);
                    recommendations.push(t);
                }
            }
        }

        return NextResponse.json({ recommendations: recommendations.slice(0, 6) });
    } catch {
        return NextResponse.json({ recommendations: [] });
    }
}
