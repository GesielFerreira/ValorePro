'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Loader2, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PriceChartProps {
    productName: string;
}

interface ChartPoint {
    date: string;
    preco: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white rounded-xl shadow-lg border border-surface-200 px-3 py-2 text-xs">
            <p className="text-surface-500">{label}</p>
            <p className="font-semibold text-brand-600">{formatCurrency(payload[0].value)}</p>
        </div>
    );
};

export function PriceChart({ productName }: PriceChartProps) {
    const [data, setData] = useState<ChartPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasData, setHasData] = useState(false);

    useEffect(() => {
        if (!productName) {
            setLoading(false);
            return;
        }

        async function fetchHistory() {
            try {
                const res = await fetch(`/api/price-history?term=${encodeURIComponent(productName)}`);
                if (res.ok) {
                    const json = await res.json();
                    const history = json.history || [];

                    if (history.length > 0) {
                        const chartData: ChartPoint[] = history.map((h: any) => ({
                            date: new Date(h.date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                            }),
                            preco: Math.round(h.minPrice),
                        }));
                        setData(chartData);
                        setHasData(true);
                    }
                }
            } catch { /* ignore */ } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [productName]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-surface-200 p-4">
                <div className="flex items-center justify-center h-48">
                    <Loader2 size={20} className="animate-spin text-surface-400" />
                </div>
            </div>
        );
    }

    if (!hasData) {
        return (
            <div className="bg-white rounded-2xl border border-surface-200 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-sm font-semibold text-surface-800">Histórico de Preços</h3>
                        <p className="text-xs text-surface-500">Últimos 90 dias</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center h-32 text-surface-400">
                    <TrendingDown size={24} className="mb-2" />
                    <p className="text-xs">Ainda não há dados de histórico para este produto.</p>
                    <p className="text-[10px] mt-1">Os preços serão registrados a cada busca.</p>
                </div>
            </div>
        );
    }

    const minPrice = Math.min(...data.map((d) => d.preco));
    const maxPrice = Math.max(...data.map((d) => d.preco));

    return (
        <div className="bg-white rounded-2xl border border-surface-200 p-4">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-sm font-semibold text-surface-800">Histórico de Preços</h3>
                    <p className="text-xs text-surface-500">Últimos 90 dias · {data.length} registros</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-surface-500">Menor preço</p>
                    <p className="text-sm font-bold text-brand-600">{formatCurrency(minPrice)}</p>
                </div>
            </div>

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00BFA6" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#00BFA6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            stroke="#a3a3a3"
                            tickLine={false}
                            interval={Math.max(0, Math.floor(data.length / 6) - 1)}
                        />
                        <YAxis
                            tick={{ fontSize: 10 }}
                            stroke="#a3a3a3"
                            tickLine={false}
                            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                            domain={[minPrice * 0.95, maxPrice * 1.05]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="preco"
                            stroke="#00BFA6"
                            strokeWidth={2}
                            fill="url(#priceGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
