'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, CreditCard, Sparkles, Building2, PackagePlus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CREDIT_PACKS } from '@/server/services/payment';
import { toast } from 'sonner';

interface Plan {
    id: string;
    name: string;
    price: number;
    credits: number;
    popular?: boolean;
    features: string[];
}

const PLANS: Plan[] = [
    {
        id: 'free',
        name: 'Gratuito',
        price: 0,
        credits: 90, // ~3 por dia
        features: [
            '3 buscas por dia',
            'Histórico básico',
        ]
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 3490,
        credits: 100,
        popular: true,
        features: [
            '100 buscas por mês',
            '10 alertas de preço',
            'Histórico completo de buscas',
            'Score de confiança de lojas',
            'Suporte por e-mail',
        ]
    },
    {
        id: 'premium',
        name: 'Premium',
        price: 7990,
        credits: 300,
        features: [
            '300 buscas por mês',
            'Alertas ilimitados',
            'Compra automática por IA',
            'Histórico completo',
            'Score de confiança',
            'Suporte prioritário',
        ]
    }
];

export default function PlansPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [subscribingTo, setSubscribingTo] = useState<string | null>(null);
    const [purchasingPack, setPurchasingPack] = useState<string | null>(null);
    const [currentPlan, setCurrentPlan] = useState<string>('free');
    const [cards, setCards] = useState<any[]>([]);

    useEffect(() => {
        async function load() {
            try {
                // Fetch user data for current plan and cards
                const userRes = await fetch('/api/user');
                if (userRes.ok) {
                    const data = await userRes.json();
                    setCurrentPlan(data.profile?.plan || 'free');
                    setCards(data.cards || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const handleSubscribe = async (planId: string) => {
        if (planId === 'free') {
            toast.info('Você já está no plano ou ele é o padrão.');
            return;
        }

        if (cards.length === 0) {
            toast.error('Adicione um cartão de crédito primeiro.');
            router.push('/dashboard/settings?tab=cards');
            return;
        }

        setSubscribingTo(planId);
        try {
            const res = await fetch('/api/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    cardId: cards.find(c => c.is_default)?.id || cards[0].id
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao processar assinatura');
            }

            toast.success('Assinatura ativada com sucesso!');
            setCurrentPlan(planId);
            router.refresh(); // Refresh to update user limits
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubscribingTo(null);
        }
    };

    const handlePurchasePack = async (packId: string) => {
        if (cards.length === 0) {
            toast.error('Adicione um cartão de crédito primeiro.');
            router.push('/dashboard/settings?tab=cards');
            return;
        }

        setPurchasingPack(packId);
        try {
            const res = await fetch('/api/credits/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packId,
                    cardId: cards.find(c => c.is_default)?.id || cards[0].id
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao comprar pacote');
            }

            toast.success('Créditos adicionados com sucesso!');
            router.refresh(); // Update limits on the frontend
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setPurchasingPack(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Escolha o plano ideal
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Ferramentas avançadas para você não perder mais tempo e dinheiro pesquisando online.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {PLANS.map((plan) => {
                    const isCurrent = currentPlan === plan.id;
                    const isPopular = plan.popular;

                    return (
                        <div 
                            key={plan.id}
                            className={`relative rounded-2xl border bg-white dark:bg-gray-800 flex flex-col p-6 shadow-sm transition-all hover:shadow-md ${
                                isPopular ? 'border-purple-500 shadow-purple-500/10' : 'border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            {isPopular && (
                                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                        <Sparkles className="w-3 h-3" /> MAIS ESCOLHIDO
                                    </span>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                                <div className="mt-4 flex items-baseline text-4xl font-extrabold text-gray-900 dark:text-white">
                                    {plan.price === 0 ? 'Grátis' : formatCurrency(plan.price / 100)}
                                    {plan.price > 0 && <span className="ml-1 text-xl font-medium text-gray-500 dark:text-gray-400">/mês</span>}
                                </div>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    {plan.credits} buscas por mês
                                </p>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={`w-full font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center transition-colors ${
                                    isCurrent 
                                        ? 'bg-gray-100 text-gray-500 cursor-default hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
                                        : isPopular 
                                            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                                            : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                                }`}
                                disabled={isCurrent || subscribingTo === plan.id}
                                onClick={() => handleSubscribe(plan.id)}
                            >
                                {subscribingTo === plan.id ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                                ) : isCurrent ? (
                                    'Seu Plano Atual'
                                ) : plan.price === 0 ? (
                                    'Continuar Grátis'
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Assinar {plan.name}
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {cards.length === 0 && (
                <div className="mt-12 max-w-md mx-auto bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50 flex items-start gap-4">
                    <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-200">Precisa de um cartão</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Para assinar os planos Pro ou Premium, você precisa cadastrar um cartão de crédito nas suas configurações.
                        </p>
                        <button 
                            className="mt-3 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors"
                            onClick={() => router.push('/dashboard/settings?tab=cards')}
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Adicionar Cartão
                        </button>
                    </div>
                </div>
            )}

            {/* Credit Packs Section */}
            <div className="mt-20 max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                        <PackagePlus className="w-6 h-6 text-purple-600" />
                        Créditos Adicionais
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Precisa de mais buscas este mês? Adicione um pacote avulso sem alterar sua assinatura.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {CREDIT_PACKS.map((pack) => (
                        <div key={pack.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl p-6 flex flex-col justify-between items-center text-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="mb-4">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                                    +{pack.credits} Buscas
                                </h4>
                                <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
                                    {pack.priceLabel}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Pagamento único
                                </p>
                            </div>
                            <button
                                onClick={() => handlePurchasePack(pack.id)}
                                disabled={purchasingPack === pack.id}
                                className="w-full font-semibold py-2 px-4 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center"
                            >
                                {purchasingPack === pack.id ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                                ) : (
                                    'Comprar Agora'
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
