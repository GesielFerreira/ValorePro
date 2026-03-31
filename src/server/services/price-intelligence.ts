// ============================================================
// ValorePro — Price Intelligence Service
// ============================================================
// Analyzes price history to determine trends and optimal
// timing for purchases. Provides timing scores and forecasts.
// ============================================================

import { createAdminSupabase } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('price-intelligence');

export type PriceTrend = 'rising' | 'falling' | 'stable';
export type TimingScore = 'buy_now' | 'normal' | 'wait';

export interface PriceAnalysis {
    trend: PriceTrend;
    trendPercent: number;           // % change over analysis window
    timing: TimingScore;
    timingLabel: string;
    timingColor: string;            // green | yellow | red
    currentVsAvg: number;          // % difference from avg
    currentVsLowest: number;       // % difference from lowest
    lowestEver: number | null;
    highestEver: number | null;
    avgPrice: number | null;
    dataPoints: number;
    recommendation: string;
}

interface PricePoint {
    price: number;
    recorded_at: string;
}

export async function analyzePriceTrend(
    productTerm: string,
    currentPrice: number,
): Promise<PriceAnalysis> {
    const defaultResult: PriceAnalysis = {
        trend: 'stable',
        trendPercent: 0,
        timing: 'normal',
        timingLabel: 'Preço normal',
        timingColor: 'yellow',
        currentVsAvg: 0,
        currentVsLowest: 0,
        lowestEver: null,
        highestEver: null,
        avgPrice: null,
        dataPoints: 0,
        recommendation: 'Sem dados históricos suficientes para análise.',
    };

    try {
        const admin = createAdminSupabase();
        const { data: history } = await admin
            .from('price_history')
            .select('price, recorded_at')
            .ilike('product_term', `%${productTerm}%`)
            .order('recorded_at', { ascending: true })
            .limit(200);

        if (!history || history.length < 2) {
            return defaultResult;
        }

        const prices = history.map((h: PricePoint) => h.price);
        const lowestEver = Math.min(...prices);
        const highestEver = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        // Trend analysis: compare recent prices (last 7 data points) vs previous
        const recentWindow = Math.min(7, Math.floor(prices.length / 2));
        const recentPrices = prices.slice(-recentWindow);
        const olderPrices = prices.slice(0, prices.length - recentWindow);

        const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;

        const trendPercent = olderAvg > 0
            ? ((recentAvg - olderAvg) / olderAvg) * 100
            : 0;

        let trend: PriceTrend = 'stable';
        if (trendPercent > 3) trend = 'rising';
        else if (trendPercent < -3) trend = 'falling';

        // Timing score
        const currentVsAvg = avgPrice > 0
            ? ((currentPrice - avgPrice) / avgPrice) * 100
            : 0;
        const currentVsLowest = lowestEver > 0
            ? ((currentPrice - lowestEver) / lowestEver) * 100
            : 0;

        let timing: TimingScore = 'normal';
        let timingLabel = 'Preço normal';
        let timingColor = 'yellow';
        let recommendation = '';

        if (currentVsLowest <= 5) {
            // Within 5% of lowest ever
            timing = 'buy_now';
            timingLabel = 'Melhor momento';
            timingColor = 'green';
            recommendation = `Preço próximo do menor histórico (${formatBRL(lowestEver)}). Bom momento para comprar!`;
        } else if (currentVsAvg <= -10) {
            // 10% below average
            timing = 'buy_now';
            timingLabel = 'Preço baixo';
            timingColor = 'green';
            recommendation = `Preço ${Math.abs(Math.round(currentVsAvg))}% abaixo da média. Aproveite!`;
        } else if (currentVsAvg >= 10) {
            // 10% above average
            timing = 'wait';
            timingLabel = 'Preço alto';
            timingColor = 'red';
            recommendation = `Preço ${Math.round(currentVsAvg)}% acima da média (${formatBRL(avgPrice)}). Considere esperar.`;
        } else {
            timing = 'normal';
            timingLabel = 'Preço normal';
            timingColor = 'yellow';
            recommendation = `Preço dentro da faixa normal. Média histórica: ${formatBRL(avgPrice)}.`;
        }

        // Enhance recommendation with trend info
        if (trend === 'falling' && timing !== 'buy_now') {
            recommendation += ' Tendência de queda nos últimos dias.';
        } else if (trend === 'rising' && timing !== 'wait') {
            recommendation += ' Tendência de alta — considere comprar logo.';
        }

        return {
            trend,
            trendPercent: Math.round(trendPercent * 10) / 10,
            timing,
            timingLabel,
            timingColor,
            currentVsAvg: Math.round(currentVsAvg * 10) / 10,
            currentVsLowest: Math.round(currentVsLowest * 10) / 10,
            lowestEver,
            highestEver,
            avgPrice: Math.round(avgPrice * 100) / 100,
            dataPoints: history.length,
            recommendation,
        };
    } catch (err) {
        log.error('Price trend analysis failed', { error: String(err) });
        return defaultResult;
    }
}

function formatBRL(value: number | null): string {
    if (value == null) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Save price point to history (called after every search)
export async function recordPricePoint(
    productTerm: string,
    storeName: string,
    storeDomain: string,
    price: number,
): Promise<void> {
    try {
        const admin = createAdminSupabase();
        await admin.from('price_history').insert({
            product_term: productTerm.toLowerCase(),
            store_name: storeName,
            store_domain: storeDomain,
            price,
        });
    } catch (err) {
        log.warn('Failed to record price point', { error: String(err) });
    }
}
