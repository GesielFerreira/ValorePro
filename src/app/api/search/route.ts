// ============================================================
// ValorePro — Search API Route
// ============================================================
// POST /api/search — triggers product search across all sources
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { executeProductSearch } from '@/server/services/search';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:search');

// In-memory coalescing for identical concurrent search API requests
const ongoingRequests = new Map<string, Promise<any>>();

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
        const { query, cep } = body;

        if (!query || typeof query !== 'string' || query.trim().length < 2) {
            return NextResponse.json(
                { error: 'Informe o produto que deseja buscar.' },
                { status: 400 },
            );
        }

        const cleanQuery = query.trim().toLowerCase();
        const requestKey = `${user.id}:${cleanQuery}`;

        if (ongoingRequests.has(requestKey)) {
            log.info('API coalescing concurrent search', { requestKey });
            try {
                const resultData = await ongoingRequests.get(requestKey);
                return NextResponse.json(resultData);
            } catch (err: any) {
                if (err && err.status) {
                    return NextResponse.json({ error: err.message, ...err.payload }, { status: err.status });
                }
                throw err;
            }
        }

        const promise = (async () => {
            // Check user search limits
            const admin = createAdminSupabase();
            const { data: profile } = await admin
                .from('users')
                .select('id, searches_today, searches_limit, plan')
                .eq('auth_id', user.id)
                .single();

            if (!profile) {
                throw { status: 404, message: 'Perfil não encontrado.' };
            }

            if (profile.searches_limit !== -1 && profile.searches_today >= profile.searches_limit) {
                const isNoPlan = profile.searches_limit === 0;
                throw { 
                    status: 429, 
                    message: isNoPlan 
                        ? 'Ative um plano para realizar buscas.' 
                        : 'Limite de buscas diárias atingido.', 
                    payload: { limit: profile.searches_limit, upgrade: true } 
                };
            }

            // Create search record
            const { data: search, error: searchError } = await admin
                .from('searches')
                .insert({
                    user_id: profile.id,
                    query: query.trim(),
                    status: 'processing',
                })
                .select('id')
                .single();

            if (searchError || !search) {
                log.error('Failed to create search record', { error: searchError });
                throw { status: 500, message: 'Erro ao iniciar busca.' };
            }

            log.info('Starting search', { searchId: search.id, query, userId: profile.id });

            // Execute search
            const result = await executeProductSearch({
                query: query.trim(),
                cep,
                userId: profile.id,
            });

            // Save results to database
            const resultsToInsert = result.results.slice(0, 30).map((r, i) => ({
                search_id: search.id,
                title: r.title,
                cash_price: r.cashPrice,
                installment_price: r.installment?.total ?? null,
                shipping_cost: r.shippingCost,
                total_price: r.totalPrice,
                shipping_days: r.shippingDays ?? null,
                store_name: r.store.name,
                store_domain: r.store.domain,
                product_url: r.url,
                image_url: r.imageUrl ?? null,
                source: r.source,
                available: r.available,
                trust_score: 0,
                rank: i + 1,
                is_best: i === 0,
            }));

            if (resultsToInsert.length > 0) {
                await admin.from('results').insert(resultsToInsert);
            }

            // Update search record
            await admin.from('searches').update({
                status: result.status,
                total_results: result.totalResults,
                best_price: result.bestPrice?.totalPrice ?? null,
                worst_price: result.results.length > 0
                    ? Math.max(...result.results.map((r) => r.totalPrice))
                    : null,
                duration_ms: result.duration,
                sources_queried: result.sources,
                completed_at: new Date().toISOString(),
            }).eq('id', search.id);

            // Increment daily search count ONLY if it was a real search (costs credits)
            if (!result.isCached) {
                await admin.from('users').update({
                    searches_today: profile.searches_today + 1,
                }).eq('id', profile.id);
            }

            // Get user's name for AI voice personalization
            const { data: userData } = await admin
                .from('users')
                .select('name')
                .eq('id', profile.id)
                .single();

            return {
                searchId: search.id,
                query: result.query,
                status: result.status,
                results: result.results,
                totalResults: result.totalResults,
                bestPrice: result.bestPrice,
                savings: result.bestPrice && result.results.length > 1
                    ? result.results[result.results.length - 1].totalPrice - result.bestPrice.totalPrice
                    : 0,
                duration: result.duration,
                userName: userData?.name || 'Cliente',
            };
        })();

        ongoingRequests.set(requestKey, promise);

        try {
            const resultData = await promise;
            return NextResponse.json(resultData);
        } catch (err: any) {
            if (err && err.status) {
                return NextResponse.json(
                    { error: err.message, ...err.payload },
                    { status: err.status }
                );
            }
            throw err;
        } finally {
            ongoingRequests.delete(requestKey);
        }
    } catch (err) {
        log.error('Search API error', { error: String(err) });
        return NextResponse.json(
            { error: 'Erro interno ao processar busca.' },
            { status: 500 },
        );
    }
}
