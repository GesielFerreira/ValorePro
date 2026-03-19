// ============================================================
// ValorePro — Store Reputation API Route
// ============================================================
// POST /api/reputation — check store trust score
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { verifyStoreReputation } from '@/server/services/reputation';
import { createLogger } from '@/lib/logger';
import { TRUSTED_ECOMMERCE_DOMAINS } from '@/types/search';

const log = createLogger('api:reputation');

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { domain, storeName, productPrice, averagePrice } = body;

        if (!domain || !storeName) {
            return NextResponse.json(
                { error: 'Domain e storeName são obrigatórios.' },
                { status: 400 },
            );
        }

        const admin = createAdminSupabase();
        const isTrustedDomain = TRUSTED_ECOMMERCE_DOMAINS.some(t => domain.includes(t));

        // Check for cached store data (valid for 24h)
        const { data: cached } = await admin
            .from('stores')
            .select('*')
            .eq('domain', domain)
            .single();

        if (cached?.last_verified_at && !isTrustedDomain) {
            const lastVerified = new Date(cached.last_verified_at).getTime();
            const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

            if (lastVerified > dayAgo) {
                log.info('Returning cached store data', { domain });
                return NextResponse.json(cached);
            }
        }

        // Run reputation check
        log.info('Checking store reputation', { domain, storeName });

        const result = await verifyStoreReputation({
            domain,
            storeName,
            storeUrl: `https://${domain}`,
            productPrice,
            averagePrice,
        });

        // Map classification to trust_level enum
        const trustLevelMap: Record<string, 'safe' | 'caution' | 'risky'> = {
            excelente: 'safe',
            confiavel: 'safe',
            regular: 'caution',
            duvidosa: 'risky',
            perigosa: 'risky',
        };

        // Upsert store in database
        const storeData = {
            domain,
            name: storeName,
            cnpj: result.details.cnpj?.cnpj ?? null,
            cnpj_status: result.details.cnpj?.status ?? null,
            domain_age_years: result.details.domain?.ageInYears ?? null,
            ssl_valid: result.details.domain?.sslValid ?? null,
            reclame_aqui_score: result.details.reclameAqui?.score ?? null,
            reclame_aqui_resolved: result.details.reclameAqui?.resolvidas ?? null,
            google_rating: result.details.googlePlaces?.rating ?? null,
            google_reviews: result.details.googlePlaces?.totalReviews ?? null,
            trust_score: result.score,
            trust_level: trustLevelMap[result.classification] ?? 'caution',
            alerts: result.alerts as any,
            last_verified_at: new Date().toISOString(),
        };

        await admin.from('stores').upsert(storeData, { onConflict: 'domain' });

        return NextResponse.json({
            ...storeData,
            breakdown: result.breakdown,
        });
    } catch (err) {
        log.error('Reputation API error', { error: String(err) });
        return NextResponse.json(
            { error: 'Erro ao verificar reputação da loja.' },
            { status: 500 },
        );
    }
}
