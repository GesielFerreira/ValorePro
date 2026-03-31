'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ExternalLink, ArrowLeft, Shield, Truck, Zap, Lightbulb,
    Copy, CheckCircle2, ShoppingCart, Star, Loader2,
    Bookmark, Share2,
} from 'lucide-react';
import Image from 'next/image';
import { cn, formatCurrency } from '@/lib/utils';
import { TrustBadge } from '@/components/TrustBadge';
import { TimingBadge } from '@/components/TimingBadge';
import { toast } from 'sonner';
import { TRUSTED_ECOMMERCE_DOMAINS } from '@/types/search';

function generateSmartLink(url: string, domain: string, title: string = ''): { url: string; type: string; hint: string } {
    const clean = domain.replace(/^www\./, '');

    // Amazon add-to-cart automation
    if (clean === 'amazon.com.br' && !url.includes('google.com')) {
        const asin = url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
        if (asin) {
            return {
                url: `https://www.amazon.com.br/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`,
                type: 'Carrinho Direto',
                hint: 'Produto será adicionado ao carrinho automaticamente.',
            };
        }
    }

    // Bypass Google Shopping "ibp=oshop" (In-browser product) aggregator UI
    if (url.includes('google.com') && url.includes('ibp=')) {
        const cleanTitle = encodeURIComponent(title.replace(/[^a-zA-Z0-9\s]/g, ''));
        
        if (clean === 'shopee.com.br' || clean.includes('shopee')) {
            return {
                url: `https://shopee.com.br/search?keyword=${cleanTitle}`,
                type: 'Smart Search',
                hint: 'Redirecionamento inteligente: Buscando o produto exato na vitrine da loja.',
            };
        }
        if (clean === 'mercadolivre.com.br') {
            const mlSearchParam = title.replace(/\s+/g, '-').toLowerCase();
            return {
                url: `https://lista.mercadolivre.com.br/${mlSearchParam}#D[A:${cleanTitle}]`,
                type: 'Smart Search',
                hint: 'Redirecionamento inteligente: Buscando o produto exato na vitrine da loja.',
            };
        }
        if (clean === 'magazineluiza.com.br' || clean === 'magalu.com.br') {
            return {
                url: `https://www.magazineluiza.com.br/busca/${cleanTitle}/`,
                type: 'Smart Search',
                hint: 'Redirecionamento inteligente: Buscando o produto exato na vitrine da loja.',
            };
        }
        if (clean === 'amazon.com.br') {
            return {
                url: `https://www.amazon.com.br/s?k=${cleanTitle}`,
                type: 'Smart Search',
                hint: 'Redirecionamento inteligente: Buscando o produto exato na vitrine da loja.',
            };
        }
        
        // Fallback default domain search
        return {
            url: `https://${clean}`,
            type: 'Ir para a Loja',
            hint: 'Acesso direto ao portal principal (Link oficial bloqueado pelo agregador).',
        }
    }

    return {
        url,
        type: 'Página do Produto',
        hint: 'Clique no botão de compra na loja.',
    };
}

// Store checkout tips
const STORE_TIPS: Record<string, string[]> = {
    'amazon.com.br': [
        '🎯 Use Amazon Prime para frete grátis e entrega rápida',
        '💳 Verifique cupons na página do produto',
        '📦 Subscribe & Save dá até 15% off em recorrentes',
    ],
    'kabum.com.br': [
        '⚡ Pix com desconto de até 5%',
        '🚀 KaBuM! Prime: frete grátis',
        '🔥 Flash Sales às sextas',
    ],
    'mercadolivre.com.br': [
        '📦 Mercado Livre Full: frete grátis acima de R$ 79',
        '🪙 Mercado Pontos: cashback',
        '⭐ Verifique reputação do vendedor',
    ],
    'magazineluiza.com.br': [
        '⚡ Pix dá ~3% de desconto',
        '📱 App Magalu pode ter preço exclusivo',
        '💰 Cashback para membros',
    ],
    'magalu.com.br': [
        '⚡ Pix dá ~3% de desconto',
        '📱 App Magalu pode ter preço exclusivo',
        '💰 Cashback para membros',
    ],
    'americanas.com.br': [
        '⚡ Pix dá até 5% de desconto',
        '🎁 Cupom de primeira compra disponível',
        '📦 Frete grátis acima de R$ 99',
    ],
    'shopee.com.br': [
        '🎫 Use cupons do vendedor na página',
        '🪙 Shopee Coins: cashback de até 5%',
        '📦 Cupom de frete grátis',
    ],
};

function ConfirmContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const title = searchParams.get('title') || '';
    const price = Number(searchParams.get('price')) || 0;
    const totalPrice = Number(searchParams.get('totalPrice')) || 0;
    const shipping = Number(searchParams.get('shipping')) || 0;
    const shippingDays = searchParams.get('shippingDays');
    const storeName = searchParams.get('storeName') || '';
    const storeDomain = searchParams.get('storeDomain') || '';
    const productUrl = searchParams.get('productUrl') || '';
    const imageUrl = searchParams.get('imageUrl') || '';
    const pixPriceParam = searchParams.get('pixPrice');
    const pixDiscountParam = searchParams.get('pixDiscount');

    const pixPrice = pixPriceParam ? Number(pixPriceParam) : null;
    const pixDiscount = pixDiscountParam ? Number(pixDiscountParam) : null;

    const [copied, setCopied] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const [savedToWatchlist, setSavedToWatchlist] = useState(false);

    const cleanDomain = storeDomain.replace(/^www\./, '');
    const isTrusted = TRUSTED_ECOMMERCE_DOMAINS.some(d => cleanDomain.includes(d));
    const smartLink = generateSmartLink(productUrl, storeDomain, title);
    const tips = STORE_TIPS[cleanDomain] || [
        '💡 Verifique se aceita Pix com desconto',
        '🎫 Procure cupons de primeira compra',
        '📦 Compare opções de frete',
    ];

    const handleGoToStore = () => {
        setRedirecting(true);
        window.open(smartLink.url, '_blank');
        setTimeout(() => setRedirecting(false), 2000);
    };

    const handleCopyLink = async () => {
        await navigator.clipboard.writeText(smartLink.url);
        setCopied(true);
        toast.success('Link copiado!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        const shareText = `🔥 ${title}\n💰 ${formatCurrency(price)} na ${storeName}\n🔗 ${productUrl}\n\nEncontrado pelo ValorePro`;
        if (navigator.share) {
            try {
                await navigator.share({ title: `${title} - ${formatCurrency(price)}`, text: shareText, url: productUrl });
            } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(shareText);
            toast.success('Link copiado! 📋');
        }
    };

    const handleWatchlist = async () => {
        try {
            const res = await fetch('/api/watchlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productTitle: title,
                    productUrl,
                    imageUrl,
                    storeName,
                    storeDomain,
                    price,
                    shippingCost: shipping,
                }),
            });
            if (res.status === 409) {
                toast.info('Já está na watchlist!');
            } else if (res.ok) {
                setSavedToWatchlist(true);
                toast.success('Salvo na Watchlist! 📌');
            } else {
                toast.error('Erro ao salvar.');
            }
        } catch {
            toast.error('Erro de conexão.');
        }
    };

    return (
        <div className="max-w-lg mx-auto px-4 pt-4 pb-12">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 rounded-xl hover:bg-surface-100 text-surface-500"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-surface-900">Assistente de Compra</h1>
                    <p className="text-xs text-surface-500">Tudo pronto para você finalizar</p>
                </div>
            </div>

            {/* Product Card */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-surface-200 p-4 mb-4 shadow-sm"
            >
                <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl bg-surface-100 overflow-hidden relative flex-shrink-0">
                        {imageUrl ? (
                            <Image src={imageUrl} alt={title} fill className="object-contain p-1" unoptimized sizes="80px" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-2xl">📦</div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-medium text-surface-800 line-clamp-2 leading-snug">{title}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-surface-500">{storeName}</span>
                            {isTrusted && <TrustBadge score={85} size="sm" showLabel={false} />}
                        </div>
                    </div>
                </div>

                {/* Price breakdown */}
                <div className="mt-4 space-y-2 bg-surface-50 rounded-xl p-3 border border-surface-100">
                    <div className="flex justify-between text-xs text-surface-600">
                        <span>Preço à vista</span>
                        <span className="font-semibold text-surface-800">{formatCurrency(price)}</span>
                    </div>
                    {pixPrice && pixDiscount && (
                        <div className="flex justify-between text-xs">
                            <span className="text-teal-700 flex items-center gap-1">
                                <Zap size={12} /> Preço no Pix (-{pixDiscount}%)
                            </span>
                            <span className="font-bold text-teal-700">{formatCurrency(pixPrice)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs text-surface-600">
                        <span className="flex items-center gap-1">
                            <Truck size={12} /> Frete
                        </span>
                        <span className={cn(
                            'font-semibold',
                            shipping === 0 ? 'text-brand-600' : 'text-surface-800',
                        )}>
                            {shipping === 0 ? 'Grátis' : formatCurrency(shipping)}
                        </span>
                    </div>
                    {shippingDays && (
                        <div className="flex justify-between text-xs text-surface-500">
                            <span>Prazo estimado</span>
                            <span>{shippingDays} dias úteis</span>
                        </div>
                    )}
                    <div className="border-t border-surface-200 pt-2 flex justify-between text-sm">
                        <span className="font-semibold text-surface-800">Total</span>
                        <span className="font-bold text-brand-600">{formatCurrency(totalPrice)}</span>
                    </div>
                </div>
            </motion.div>

            {/* Smart redirect info */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-4"
            >
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart size={20} className="text-brand-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-brand-800">
                            {smartLink.type === 'Carrinho Direto' ? '🎯 Link direto ao carrinho!' : '📦 Link para o produto'}
                        </p>
                        <p className="text-xs text-brand-600 mt-0.5">{smartLink.hint}</p>
                    </div>
                </div>
            </motion.div>

            {/* Go to store button */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-3 mb-6"
            >
                <button
                    onClick={handleGoToStore}
                    disabled={redirecting}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-brand-500 hover:bg-brand-600 text-white text-base font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-brand-500/20 disabled:opacity-70"
                >
                    {redirecting ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            Abrindo loja...
                        </>
                    ) : (
                        <>
                            <ExternalLink size={20} />
                            Ir para {storeName}
                        </>
                    )}
                </button>

                <div className="flex gap-2">
                    <button
                        onClick={handleCopyLink}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium text-surface-700 hover:bg-surface-50 transition-all"
                    >
                        {copied ? <CheckCircle2 size={16} className="text-brand-500" /> : <Copy size={16} />}
                        {copied ? 'Copiado!' : 'Copiar link'}
                    </button>
                    <button
                        onClick={handleWatchlist}
                        disabled={savedToWatchlist}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-medium transition-all',
                            savedToWatchlist
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-50',
                        )}
                    >
                        <Bookmark size={16} />
                        {savedToWatchlist ? 'Na Watchlist!' : 'Watchlist'}
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center w-12 py-3 bg-white border border-surface-200 rounded-xl text-surface-700 hover:bg-surface-50 transition-all"
                    >
                        <Share2 size={16} />
                    </button>
                </div>
            </motion.div>

            {/* Store tips */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-surface-200 p-4"
            >
                <h3 className="text-sm font-semibold text-surface-800 flex items-center gap-2 mb-3">
                    <Lightbulb size={16} className="text-amber-500" />
                    Dicas para economizar na {storeName}
                </h3>
                <div className="space-y-2">
                    {tips.map((tip, i) => (
                        <p key={i} className="text-xs text-surface-600 leading-relaxed">{tip}</p>
                    ))}
                </div>
            </motion.div>

            {/* Security badge */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 flex items-center justify-center gap-2 py-3"
            >
                <Shield size={14} className="text-surface-400" />
                <p className="text-[11px] text-surface-400">
                    Você será redirecionado com segurança para a loja oficial.
                    ValorePro não armazena dados de pagamento.
                </p>
            </motion.div>
        </div>
    );
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={
            <div className="max-w-lg mx-auto px-4 pt-12 flex justify-center">
                <Loader2 size={32} className="text-brand-500 animate-spin" />
            </div>
        }>
            <ConfirmContent />
        </Suspense>
    );
}
