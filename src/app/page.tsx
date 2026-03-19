'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Camera, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const POPULAR_PRODUCTS = [
    'iPhone 15 128GB',
    'Samsung Galaxy S24',
    'PlayStation 5',
    'Air Fryer Mondial',
    'Notebook Lenovo i5',
    'Smart TV 55" 4K',
    'AirPods Pro',
    'Kindle Paperwhite',
];

export default function HomePage() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    function handleSearch(q?: string) {
        const searchQuery = q || query;
        if (!searchQuery.trim()) return;
        router.push(`/results?q=${encodeURIComponent(searchQuery.trim())}`);
    }

    return (
        <div className="min-h-[calc(100vh-64px)] flex flex-col">
            {/* Hero */}
            <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full mb-4">
                        <Sparkles size={14} />
                        Busca inteligente com IA
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-surface-900 leading-tight">
                        Encontre o <span className="text-brand-500">melhor preço</span>
                        <br />com segurança
                    </h1>
                    <p className="mt-3 text-surface-500 text-base md:text-lg max-w-md mx-auto">
                        Varremos toda a web, verificamos a loja, e até compramos pra você.
                    </p>
                </motion.div>

                {/* Search bar */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="w-full max-w-xl"
                >
                    <div
                        className={cn(
                            'relative flex items-center bg-white rounded-2xl border-2 transition-all shadow-sm',
                            isFocused
                                ? 'border-brand-400 shadow-lg shadow-brand-500/10'
                                : 'border-surface-200 hover:border-surface-300',
                        )}
                    >
                        <Search size={20} className="ml-4 text-surface-400 flex-shrink-0" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="O que você quer comprar?"
                            className="flex-1 py-4 px-3 text-base bg-transparent outline-none placeholder:text-surface-400"
                        />
                        <button
                            className="mr-2 p-2 rounded-xl text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-all"
                            title="Buscar por imagem"
                        >
                            <Camera size={20} />
                        </button>
                        <button
                            onClick={() => handleSearch()}
                            disabled={!query.trim()}
                            className={cn(
                                'mr-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                                query.trim()
                                    ? 'bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.97]'
                                    : 'bg-surface-100 text-surface-400 cursor-not-allowed',
                            )}
                        >
                            Buscar
                        </button>
                    </div>
                </motion.div>

                {/* Popular products */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="mt-6 max-w-xl w-full"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={14} className="text-surface-400" />
                        <span className="text-xs font-medium text-surface-500">Mais buscados</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {POPULAR_PRODUCTS.map((product) => (
                            <button
                                key={product}
                                onClick={() => handleSearch(product)}
                                className="px-3 py-1.5 text-xs font-medium text-surface-600 bg-white border border-surface-200 rounded-full hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all"
                            >
                                {product}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.4 }}
                    className="mt-12 flex items-center gap-8 text-center"
                >
                    {[
                        { value: '2M+', label: 'Preços comparados' },
                        { value: '15K+', label: 'Lojas verificadas' },
                        { value: 'R$ 847', label: 'Economia média' },
                    ].map((stat) => (
                        <div key={stat.label}>
                            <div className="text-xl md:text-2xl font-bold text-brand-600">{stat.value}</div>
                            <div className="text-[11px] text-surface-500">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>
            </section>
        </div>
    );
}
