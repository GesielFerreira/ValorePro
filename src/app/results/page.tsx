'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Sparkles, AlertTriangle, RefreshCw, GitCompare, Lightbulb, X } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { SearchSkeleton } from '@/components/Skeletons';
import { PriceChart } from '@/components/PriceChart';
import { ComparisonTable } from '@/components/ComparisonTable';
import { TimingBadge } from '@/components/TimingBadge';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { TRUSTED_ECOMMERCE_DOMAINS } from '@/types/search';


interface SearchResultItem {
    id: string;
    source: string;
    title: string;
    cashPrice: number;
    totalPrice: number;
    shippingCost: number;
    shippingDays?: number;
    url: string;
    imageUrl?: string;
    store: { name: string; url: string; domain: string };
    available: boolean;
    condition: string;
}

interface SearchResponse {
    searchId: string;
    query: string;
    status: string;
    results: SearchResultItem[];
    totalResults: number;
    bestPrice?: SearchResultItem;
    savings: number;
    duration: number;
    userName?: string;
}

interface PriceAnalysisData {
    timing: 'buy_now' | 'normal' | 'wait';
    timingLabel: string;
    trendPercent: number;
    recommendation: string;
}

interface Recommendation {
    query: string;
    reason: string;
    category: string;
    icon: string;
}

// Known Pix discounts per store
const PIX_DISCOUNTS: Record<string, number> = {
    'kabum.com.br': 5,
    'magazineluiza.com.br': 3,
    'magalu.com.br': 3,
    'americanas.com.br': 5,
    'casasbahia.com.br': 5,
    'pichau.com.br': 5,
    'terabyteshop.com.br': 5,
};

const CASHBACK_RATES: Record<string, number> = {
    'magazineluiza.com.br': 2,
    'magalu.com.br': 2,
    'shopee.com.br': 3,
    'mercadolivre.com.br': 1,
};

const FREE_SHIPPING_MIN: Record<string, number> = {
    'mercadolivre.com.br': 79,
    'magazineluiza.com.br': 99,
    'magalu.com.br': 99,
    'americanas.com.br': 99,
    'casasbahia.com.br': 99,
};

const LOADING_MESSAGES = [
    'Varrendo a web...',
    'Consultando Mercado Livre...',
    'Buscando no Google Shopping...',
    'Verificando lojas confiáveis...',
    'Comparando preços...',
    'Calculando fretes...',
    'Analisando tendências...',
    'Quase lá...',
];

function ResultsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || '';
    const fetchedQuery = useRef<string | null>(null);
    const isFetchingRef = useRef<boolean>(false);

    const [loading, setLoading] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [savings, setSavings] = useState(0);
    const [totalResults, setTotalResults] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showChart, setShowChart] = useState(false);
    const [needsLogin, setNeedsLogin] = useState(false);
    const [needsUpgrade, setNeedsUpgrade] = useState(false);
    const [isNoPlan, setIsNoPlan] = useState(false);
    const [storeReputations, setStoreReputations] = useState<Record<string, any>>({});

    // New feature states
    const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysisData | null>(null);
    const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
    const [showCompare, setShowCompare] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

    // Known trusted domains get a baseline score
    const getBaselineScore = (domain: string): number => {
        const clean = domain.replace(/^www\./, '');
        if (TRUSTED_ECOMMERCE_DOMAINS.some(t => clean.includes(t))) return 85;
        return 50;
    };

    const fetchTrustScores = useCallback(async (items: SearchResultItem[]) => {
        const uniqueDomains = [...new Set(items.map((r) => r.store.domain))];

        const baseline: Record<string, any> = {};
        for (const domain of uniqueDomains) {
            baseline[domain] = { trust_score: getBaselineScore(domain) };
        }
        setStoreReputations(baseline);

        for (const domain of uniqueDomains.slice(0, 10)) {
            try {
                const item = items.find((r) => r.store.domain === domain);
                const res = await fetch('/api/reputation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        domain,
                        storeName: item?.store.name || domain,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.trust_score != null) {
                        setStoreReputations((prev) => ({ ...prev, [domain]: data }));
                    }
                }
            } catch { /* Keep baseline */ }
        }
    }, []);

    // Fetch price timing analysis
    const fetchPriceAnalysis = useCallback(async (bestPrice: number) => {
        try {
            const res = await fetch(`/api/price-analysis?term=${encodeURIComponent(query)}&price=${bestPrice}`);
            if (res.ok) {
                const data = await res.json();
                if (data.dataPoints > 0) {
                    setPriceAnalysis(data);
                }
            }
        } catch { /* silent */ }
    }, [query]);

    // Fetch AI recommendations
    const fetchRecommendations = useCallback(async () => {
        try {
            const res = await fetch('/api/recommendations');
            if (res.ok) {
                const data = await res.json();
                setRecommendations(data.recommendations || []);
            }
        } catch { /* silent */ }
    }, []);

    const fetchResults = useCallback(async (force = false) => {
        if (!query) return;
        if (!force && fetchedQuery.current === query) return;
        if (isFetchingRef.current) return;

        fetchedQuery.current = query;
        isFetchingRef.current = true;

        setLoading(true);
        setError(null);
        setNeedsLogin(false);
        setNeedsUpgrade(false);
        setIsNoPlan(false);
        setPriceAnalysis(null);

        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401) {
                    setNeedsLogin(true);
                    setError('Faça login para buscar produtos.');
                    createClient().auth.signOut().catch(() => {});
                } else if (res.status === 429 && data.upgrade) {
                    setNeedsUpgrade(true);
                    const noPlan = data.limit === 0;
                    setIsNoPlan(noPlan);
                    setError(data.error || 'Limite atingido.');
                } else {
                    setError(data.error || 'Erro ao buscar produtos.');
                }
                return;
            }

            const response = data as SearchResponse;
            setResults(response.results);
            setSavings(response.savings);
            setTotalResults(response.totalResults);

            if (response.totalResults === 0) {
                setError('Nenhum resultado encontrado. Tente um termo diferente.');
            } else {
                fetchTrustScores(response.results);
                // Fetch price analysis with best price
                if (response.bestPrice) {
                    fetchPriceAnalysis(response.bestPrice.cashPrice);
                }
                // Fetch recommendations
                fetchRecommendations();
            }
        } catch {
            setError('Erro de conexão. Verifique sua internet.');
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, [query, fetchTrustScores, fetchPriceAnalysis, fetchRecommendations]);

    // Loading messages rotation
    useEffect(() => {
        if (!loading) return;
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % LOADING_MESSAGES.length;
            setLoadingMsg(LOADING_MESSAGES[i]);
        }, 2500);
        return () => clearInterval(interval);
    }, [loading]);

    // Trigger search
    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    // Compare helpers
    const toggleCompare = (id: string) => {
        setCompareIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < 4) {
                next.add(id);
            } else {
                toast.error('Máximo 4 produtos para comparar.');
            }
            return next;
        });
    };

    const getPixPrice = (price: number, domain: string): number | null => {
        const cleanDomain = domain.replace(/^www\./, '');
        const discount = PIX_DISCOUNTS[cleanDomain];
        if (!discount) return null;
        return Math.round((price * (1 - discount / 100)) * 100) / 100;
    };

    const compareItems = results
        .filter(r => compareIds.has(r.id))
        .map(r => ({
            id: r.id,
            title: r.title,
            cashPrice: r.cashPrice,
            totalPrice: r.totalPrice,
            shippingCost: r.shippingCost,
            shippingDays: r.shippingDays,
            storeName: r.store.name,
            storeDomain: r.store.domain,
            imageUrl: r.imageUrl,
            trustScore: storeReputations[r.store.domain]?.trust_score,
            pixPrice: getPixPrice(r.cashPrice, r.store.domain) ?? undefined,
        }));

    // ── Loading State ────────────────────────────────────────
    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 pt-8">
                <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 mb-4">
                    <ArrowLeft size={16} /> Voltar
                </button>
                <div className="text-center py-12">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-brand-200 animate-ping opacity-30" />
                        <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
                            <Loader2 size={24} className="text-brand-500 animate-spin" />
                        </div>
                    </div>
                    <motion.p key={loadingMsg} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-surface-600">
                        {loadingMsg}
                    </motion.p>
                    <p className="text-xs text-surface-400 mt-1">Buscando &quot;{query}&quot;</p>
                </div>
                <SearchSkeleton />
            </div>
        );
    }

    // ── Error State ──────────────────────────────────────────
    if (error) {
        return (
            <div className="max-w-2xl mx-auto px-4 pt-8">
                <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 mb-4">
                    <ArrowLeft size={16} /> Voltar
                </button>
                <div className="text-center py-16">
                    {needsUpgrade ? (
                        <>
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center mx-auto mb-5">
                                <Sparkles size={32} className="text-brand-500" />
                            </div>
                            <h2 className="text-xl font-bold text-surface-900 mb-2">
                                {isNoPlan ? 'Você ainda não tem um plano ativo' : 'Seus créditos de busca acabaram'}
                            </h2>
                            <p className="text-sm text-surface-500 max-w-sm mx-auto mb-6">
                                {isNoPlan
                                    ? 'Para buscar os melhores preços, ative um plano ou compre créditos avulsos.'
                                    : 'Você atingiu o limite de buscas do seu plano. Faça um upgrade ou compre créditos avulsos para continuar.'}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <button
                                    onClick={() => router.push('/dashboard/plans')}
                                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
                                >
                                    <Sparkles size={16} />
                                    {isNoPlan ? 'Ver Planos' : 'Fazer Upgrade'}
                                </button>
                                <button
                                    onClick={() => router.push('/')}
                                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-surface-200 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-all"
                                >
                                    Voltar ao início
                                </button>
                            </div>
                            <p className="text-xs text-surface-400 mt-6">
                                Planos a partir de R$ 29,90/mês com até 100 buscas diárias
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={28} className="text-amber-500" />
                            </div>
                            <h2 className="text-lg font-bold text-surface-900 mb-2">{error}</h2>
                            <div className="flex items-center justify-center gap-3 mt-6">
                                {needsLogin ? (
                                    <button
                                        onClick={() => router.push('/login')}
                                        className="px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all"
                                    >
                                        Fazer Login
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => fetchResults(true)}
                                        className="px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all flex items-center gap-2"
                                    >
                                        <RefreshCw size={16} /> Tentar novamente
                                    </button>
                                )}
                                <button
                                    onClick={() => router.push('/')}
                                    className="px-6 py-2.5 rounded-xl border border-surface-200 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-all"
                                >
                                    Nova busca
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ── Results State ────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <button onClick={() => router.push('/')} className="p-2 -ml-2 rounded-xl hover:bg-surface-100 text-surface-500">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-surface-900 line-clamp-1">&quot;{query}&quot;</h1>
                    <p className="text-xs text-surface-500">
                        {totalResults} resultados{savings > 0 && ` · Economia de até ${formatCurrency(savings)}`}
                    </p>
                </div>
                {/* Timing badge */}
                {priceAnalysis && (
                    <TimingBadge
                        timing={priceAnalysis.timing}
                        label={priceAnalysis.timingLabel}
                        trendPercent={priceAnalysis.trendPercent}
                        size="md"
                        showTrend
                    />
                )}
            </div>

            {/* Price Analysis recommendation */}
            {priceAnalysis && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-surface-50 border border-surface-200 rounded-2xl"
                >
                    <p className="text-xs text-surface-600 flex items-start gap-2">
                        <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>{priceAnalysis.recommendation}</span>
                    </p>
                </motion.div>
            )}

            {/* Savings banner */}
            {savings > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 p-3 bg-brand-50 border border-brand-100 rounded-2xl flex items-center gap-3"
                >
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                        <Sparkles size={20} className="text-brand-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-brand-800">
                            Você pode economizar {formatCurrency(savings)}
                        </p>
                        <p className="text-xs text-brand-600">
                            Comparado com a opção mais cara encontrada
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Price chart toggle */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-surface-700">Resultados</span>
                <div className="flex items-center gap-3">
                    {compareIds.size > 0 && (
                        <button
                            onClick={() => setShowCompare(true)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                            <GitCompare size={14} />
                            Comparar ({compareIds.size})
                        </button>
                    )}
                    <button
                        onClick={() => setShowChart(!showChart)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                        {showChart ? 'Ocultar gráfico' : 'Ver histórico de preços'}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showChart && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-4"
                    >
                        <PriceChart productName={query} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results list */}
            <div className="space-y-3">
                {results.map((r, i) => {
                    const cleanDomain = r.store.domain.replace(/^www\./, '');
                    const pixDiscount = PIX_DISCOUNTS[cleanDomain] ?? 0;
                    const pixPrice = pixDiscount > 0
                        ? Math.round((r.cashPrice * (1 - pixDiscount / 100)) * 100) / 100
                        : null;

                    return (
                        <ProductCard
                            key={r.id}
                            rank={i}
                            title={r.title}
                            cashPrice={r.cashPrice}
                            totalPrice={r.totalPrice}
                            shippingCost={r.shippingCost}
                            shippingDays={r.shippingDays}
                            storeName={r.store.name}
                            storeDomain={r.store.domain}
                            imageUrl={r.imageUrl}
                            storeDetails={storeReputations[r.store.domain]}
                            url={r.url}
                            isBest={i === 0}
                            timing={priceAnalysis ? {
                                timing: priceAnalysis.timing,
                                label: priceAnalysis.timingLabel,
                            } : null}
                            pixPrice={pixPrice}
                            pixDiscount={pixDiscount > 0 ? pixDiscount : undefined}
                            cashbackPercent={CASHBACK_RATES[cleanDomain]}
                            freeShippingMin={FREE_SHIPPING_MIN[cleanDomain]}
                            resultId={r.id}
                            isInCompare={compareIds.has(r.id)}
                            onToggleCompare={() => toggleCompare(r.id)}
                            onBuyClick={() => {
                                // Checkout Assistant: deep link to store
                                const params = new URLSearchParams({
                                    title: r.title,
                                    price: String(r.cashPrice),
                                    totalPrice: String(r.totalPrice),
                                    shipping: String(r.shippingCost),
                                    shippingDays: String(r.shippingDays ?? ''),
                                    storeName: r.store.name,
                                    storeDomain: r.store.domain,
                                    productUrl: r.url,
                                    imageUrl: r.imageUrl || '',
                                    pixPrice: pixPrice ? String(pixPrice) : '',
                                    pixDiscount: pixDiscount ? String(pixDiscount) : '',
                                });
                                router.push(`/confirm?${params.toString()}`);
                            }}
                        />
                    );
                })}
            </div>

            {/* AI Recommendations */}
            {recommendations.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 pt-4 border-t border-surface-200"
                >
                    <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
                        <Sparkles size={16} className="text-brand-500" />
                        Recomendações para Você
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                        {recommendations.map((rec, i) => (
                            <button
                                key={i}
                                onClick={() => router.push(`/results?q=${encodeURIComponent(rec.query)}`)}
                                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl transition-all text-left"
                            >
                                <span className="text-base">{rec.icon}</span>
                                <div>
                                    <p className="text-xs font-medium text-surface-800">{rec.query}</p>
                                    <p className="text-[10px] text-surface-500">{rec.reason}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Comparison Table */}
            <AnimatePresence>
                {showCompare && compareItems.length > 0 && (
                    <ComparisonTable
                        items={compareItems}
                        onRemove={(id) => toggleCompare(id)}
                        onClose={() => setShowCompare(false)}
                    />
                )}
            </AnimatePresence>

            {/* Floating compare button */}
            {compareIds.size >= 2 && !showCompare && (
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setShowCompare(true)}
                    className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-sm font-bold rounded-full shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95"
                >
                    <GitCompare size={18} />
                    Comparar {compareIds.size} produtos
                </motion.button>
            )}
        </div>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={
            <div className="max-w-2xl mx-auto px-4 pt-12 flex justify-center">
                <Loader2 size={32} className="text-brand-500 animate-spin" />
            </div>
        }>
            <ResultsContent />
        </Suspense>
    );
}
