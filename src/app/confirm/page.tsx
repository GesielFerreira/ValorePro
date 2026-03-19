'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Truck, CreditCard, Lock, CheckCircle2, Fingerprint, X, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { TrustBadge } from '@/components/TrustBadge';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Image from 'next/image';

interface ScoreDetail {
    label: string;
    value: string;
    ok: boolean;
}

interface UserCard {
    id: string;
    last_four: string;
    brand: string;
    holder_name: string;
    is_default: boolean;
}

interface UserAddress {
    id: string;
    label: string;
    street: string;
    number: string;
    city: string;
    state: string;
    cep: string;
    is_default: boolean;
}

function ConfirmContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Product data from URL params
    const resultId = searchParams.get('resultId') || '';
    const title = searchParams.get('title') || 'Produto';
    const price = Number(searchParams.get('price')) || 0;
    const totalPrice = Number(searchParams.get('totalPrice')) || 0;
    const shipping = Number(searchParams.get('shipping')) || 0;
    const shippingDays = Number(searchParams.get('shippingDays')) || null;
    const storeName = searchParams.get('storeName') || 'Loja';
    const storeDomain = searchParams.get('storeDomain') || '';
    const productUrl = searchParams.get('productUrl') || '';
    const imageUrl = searchParams.get('imageUrl') || '';

    // State
    const [confirming, setConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [purchaseResult, setPurchaseResult] = useState<any>(null);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);

    // Reputation data
    const [trustScore, setTrustScore] = useState<number>(0);
    const [scoreDetails, setScoreDetails] = useState<ScoreDetail[]>([]);
    const [loadingReputation, setLoadingReputation] = useState(true);

    // User payment/address data
    const [card, setCard] = useState<UserCard | null>(null);
    const [address, setAddress] = useState<UserAddress | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const total = totalPrice || (price + shipping);

    // Redirect if no product data
    useEffect(() => {
        if (!resultId && !searchParams.get('title')) {
            router.replace('/');
        }
    }, [resultId, searchParams, router]);

    // Fetch reputation data
    useEffect(() => {
        if (!storeDomain) return;

        async function fetchReputation() {
            try {
                const res = await fetch('/api/reputation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        domain: storeDomain,
                        storeName,
                        productPrice: price,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    setTrustScore(data.trustScore || 0);

                    // Build score details from reputation data
                    const details: ScoreDetail[] = [];
                    if (data.checks) {
                        if (data.checks.cnpj !== undefined) {
                            details.push({
                                label: 'CNPJ ativo',
                                value: '+25',
                                ok: data.checks.cnpj?.valid === true,
                            });
                        }
                        if (data.checks.domain !== undefined) {
                            details.push({
                                label: 'Domínio > 2 anos',
                                value: '+20',
                                ok: (data.checks.domain?.ageYears || 0) >= 2,
                            });
                        }
                        if (data.checks.ssl !== undefined) {
                            details.push({
                                label: 'SSL válido',
                                value: '+15',
                                ok: data.checks.ssl === true,
                            });
                        }
                        if (data.checks.reclameAqui !== undefined) {
                            details.push({
                                label: 'Reclame Aqui ≥ 7',
                                value: '+25',
                                ok: (data.checks.reclameAqui?.score || 0) >= 7,
                            });
                        }
                        if (data.checks.google !== undefined) {
                            details.push({
                                label: 'Google ≥ 4★',
                                value: '+15',
                                ok: (data.checks.google?.rating || 0) >= 4,
                            });
                        }
                    }

                    // Fallback if no detailed checks — use trustScore to build approximate details
                    if (details.length === 0) {
                        const score = data.trustScore || 0;
                        details.push(
                            { label: 'CNPJ ativo', value: '+25', ok: score >= 25 },
                            { label: 'Domínio > 2 anos', value: '+20', ok: score >= 45 },
                            { label: 'SSL válido', value: '+15', ok: score >= 60 },
                            { label: 'Reclame Aqui ≥ 7', value: '+25', ok: score >= 75 },
                            { label: 'Google ≥ 4★', value: '+15', ok: score >= 85 },
                        );
                    }

                    setScoreDetails(details);
                }
            } catch {
                // Fallback: show unknown
                setScoreDetails([
                    { label: 'Verificação de loja', value: '—', ok: false },
                ]);
            } finally {
                setLoadingReputation(false);
            }
        }

        fetchReputation();
    }, [storeDomain, storeName, price]);

    // Fetch user card and address
    useEffect(() => {
        async function fetchUserData() {
            try {
                const res = await fetch('/api/user');
                if (res.ok) {
                    const data = await res.json();
                    const cards: UserCard[] = data.cards || [];
                    const addresses: UserAddress[] = data.addresses || [];
                    setCard(cards.find((c: UserCard) => c.is_default) || cards[0] || null);
                    setAddress(addresses.find((a: UserAddress) => a.is_default) || addresses[0] || null);
                }
            } catch { /* ignore */ } finally {
                setLoadingUser(false);
            }
        }

        fetchUserData();
    }, []);

    async function handleConfirm() {
        if (!resultId) {
            toast.error('Dados do produto não encontrados.');
            return;
        }
        if (!card) {
            toast.error('Adicione um cartão em Configurações antes de comprar.');
            return;
        }

        setConfirming(true);
        setPurchaseError(null);

        try {
            const res = await fetch('/api/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resultId,
                    cardId: card?.id,
                    addressId: address?.id,
                    confirmacao: true,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setPurchaseError(data.error || 'Erro ao processar compra.');
                toast.error(data.error || 'Erro ao processar compra.');
                setConfirming(false);
                return;
            }

            setPurchaseResult(data);
            setConfirmed(true);
            toast.success('Compra confirmada!');
        } catch {
            setPurchaseError('Erro de conexão. Tente novamente.');
            toast.error('Erro de conexão.');
        } finally {
            setConfirming(false);
        }
    }

    if (confirmed && purchaseResult) {
        return (
            <div className="max-w-lg mx-auto px-4 pt-12 text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-20 h-20 mx-auto rounded-full bg-brand-100 flex items-center justify-center mb-6"
                >
                    <CheckCircle2 size={40} className="text-brand-600" />
                </motion.div>
                <h1 className="text-2xl font-bold text-surface-900 mb-2">Compra Confirmada!</h1>
                <p className="text-surface-500 text-sm mb-6">
                    Seu pedido foi registrado com sucesso na {storeName}.
                </p>
                <div className="bg-white rounded-2xl border border-surface-200 p-4 mb-6 text-left">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-surface-500">Pedido</span>
                        <span className="font-mono font-semibold text-surface-800">
                            #{purchaseResult.purchase?.id?.slice(0, 8)?.toUpperCase() || 'VP'}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-surface-500">Total</span>
                        <span className="font-semibold text-brand-600">{formatCurrency(total)}</span>
                    </div>
                    {shippingDays && (
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-500">Entrega</span>
                            <span className="text-surface-700">{shippingDays} dias úteis</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => router.push('/dashboard/purchases')}
                    className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all w-full"
                >
                    Ver Minhas Compras
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-surface-100 text-surface-500">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-bold text-surface-900">Confirmar Compra</h1>
            </div>

            {/* Product summary */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-surface-200 p-4 mb-4"
            >
                <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-surface-100 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                        {imageUrl ? (
                            <Image src={imageUrl} alt="" fill className="object-contain" unoptimized sizes="64px" />
                        ) : (
                            <span className="text-xs text-surface-300">📦</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-semibold text-surface-800 line-clamp-2">{title}</h2>
                        <p className="text-xs text-surface-500 mt-0.5">{storeName}</p>
                    </div>
                </div>

                <div className="mt-4 space-y-2 pt-3 border-t border-surface-100">
                    <div className="flex justify-between text-sm">
                        <span className="text-surface-500">Produto</span>
                        <span className="text-surface-800">{formatCurrency(price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-surface-500 flex items-center gap-1"><Truck size={14} /> Frete</span>
                        <span className={shipping === 0 ? 'text-brand-600 font-medium' : 'text-surface-800'}>
                            {shipping === 0 ? 'Grátis' : formatCurrency(shipping)}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-surface-100">
                        <span className="text-surface-900">Total</span>
                        <span className="text-brand-600 text-lg">{formatCurrency(total)}</span>
                    </div>
                    {shippingDays && (
                        <p className="text-xs text-surface-500 text-right">
                            Entrega em {shippingDays} dias úteis
                        </p>
                    )}
                </div>
            </motion.div>

            {/* Trust score detail */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-surface-200 p-4 mb-4"
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-surface-800">Score de Confiança</h3>
                    {loadingReputation ? (
                        <Loader2 size={16} className="animate-spin text-surface-400" />
                    ) : (
                        <TrustBadge score={trustScore} size="md" />
                    )}
                </div>

                {loadingReputation ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-5 bg-surface-100 rounded animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {scoreDetails.map((item) => (
                            <div key={item.label} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    {item.ok ? (
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                    ) : (
                                        <X size={14} className="text-surface-400" />
                                    )}
                                    <span className={item.ok ? 'text-surface-700' : 'text-surface-400'}>{item.label}</span>
                                </div>
                                <span className={item.ok ? 'text-emerald-600 font-medium' : 'text-surface-300'}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Address */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border border-surface-200 p-4 mb-4"
            >
                <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-surface-600" />
                    <h3 className="text-sm font-semibold text-surface-800">Endereço de Entrega</h3>
                </div>
                {loadingUser ? (
                    <div className="h-10 bg-surface-100 rounded animate-pulse" />
                ) : address ? (
                    <div className="p-3 bg-surface-50 rounded-xl">
                        <p className="text-sm text-surface-700">
                            {address.street}, {address.number} — {address.city}, {address.state}
                        </p>
                        <p className="text-xs text-surface-500 font-mono">CEP: {address.cep}</p>
                    </div>
                ) : (
                    <button
                        onClick={() => router.push('/dashboard/settings')}
                        className="w-full p-3 border-2 border-dashed border-surface-300 rounded-xl text-sm text-surface-500 hover:border-brand-400 hover:text-brand-600 transition-all"
                    >
                        + Adicionar endereço
                    </button>
                )}
            </motion.div>

            {/* Payment */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-surface-200 p-4 mb-6"
            >
                <div className="flex items-center gap-2 mb-2">
                    <CreditCard size={16} className="text-surface-600" />
                    <h3 className="text-sm font-semibold text-surface-800">Pagamento</h3>
                </div>
                {loadingUser ? (
                    <div className="h-10 bg-surface-100 rounded animate-pulse" />
                ) : card ? (
                    <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                        <div className="w-10 h-7 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">{card.brand?.toUpperCase()?.slice(0, 4)}</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-surface-800">•••• •••• •••• {card.last_four}</p>
                            <p className="text-xs text-surface-500">Cartão tokenizado · PCI-DSS</p>
                        </div>
                        <Lock size={14} className="ml-auto text-emerald-500" />
                    </div>
                ) : (
                    <button
                        onClick={() => router.push('/dashboard/settings')}
                        className="w-full p-3 border-2 border-dashed border-surface-300 rounded-xl text-sm text-surface-500 hover:border-brand-400 hover:text-brand-600 transition-all"
                    >
                        + Adicionar cartão
                    </button>
                )}
            </motion.div>

            {/* Error message */}
            {purchaseError && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
                >
                    <AlertTriangle size={16} />
                    {purchaseError}
                </motion.div>
            )}

            {/* Confirm button */}
            <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={handleConfirm}
                disabled={confirming || !card || loadingUser}
                className="w-full flex items-center justify-center gap-2 py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 disabled:cursor-not-allowed text-white text-base font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-brand-500/30"
            >
                {confirming ? (
                    <>
                        <Fingerprint size={20} className="animate-pulse" />
                        Processando compra...
                    </>
                ) : (
                    <>
                        <ShieldCheck size={20} />
                        Confirmar Compra · {formatCurrency(total)}
                    </>
                )}
            </motion.button>

            <p className="text-center text-[11px] text-surface-400 mt-3 flex items-center justify-center gap-1">
                <Lock size={10} /> Compra protegida por tokenização PCI-DSS
            </p>
        </div>
    );
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={
            <div className="max-w-lg mx-auto px-4 pt-12 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
        }>
            <ConfirmContent />
        </Suspense>
    );
}
