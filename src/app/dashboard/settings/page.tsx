'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, CreditCard, MapPin, Bell, Shield, Plus, Edit2, Lock, Loader2, LogIn, Save, X, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UserProfile {
    name: string;
    email: string;
    cpf?: string;
    phone?: string;
    plan: string;
    avatar_url?: string;
    notification_prefs?: {
        price_alerts: boolean;
        purchase_confirmation: boolean;
        weekly_report: boolean;
        push_notifications: boolean;
        promotions: boolean;
    };
}

interface UserCard {
    id: string;
    last_four: string;
    brand: string;
    holder_name: string;
    expiry_month: number;
    expiry_year: number;
    is_default: boolean;
}

interface UserAddress {
    id: string;
    label: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    is_default: boolean;
}

export default function SettingsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'profile' | 'cards' | 'address' | 'notifications'>('profile');
    const [loading, setLoading] = useState(true);
    const [needsLogin, setNeedsLogin] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [cards, setCards] = useState<UserCard[]>([]);
    const [addresses, setAddresses] = useState<UserAddress[]>([]);

    // Editing state
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);

    // Modal state
    const [showCardForm, setShowCardForm] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);

    // Card form
    const [cardForm, setCardForm] = useState({
        holder_name: '', card_number: '', cvv: '', brand: 'visa', expiry: '', is_default: true,
    });

    // Address form
    const [addressForm, setAddressForm] = useState({
        label: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', cep: '', is_default: true,
    });

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/user');
                if (res.status === 401) { setNeedsLogin(true); return; }
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data.profile);
                    setCards(data.cards || []);
                    setAddresses(data.addresses || []);
                }
            } catch { /* empty */ } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function handleSaveField(field: string) {
        if (!editValue.trim()) return;
        setSaving(true);
        try {
            const res = await fetch('/api/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: editValue }),
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data.profile);
                setEditingField(null);
                toast.success('Perfil atualizado');
            } else {
                toast.error('Erro ao atualizar');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setSaving(false);
        }
    }

    async function handleAddCard() {
        const digits = cardForm.card_number.replace(/\D/g, '');
        if (digits.length < 4) { toast.error('Número do cartão inválido'); return; }
        if (cardForm.cvv.length < 3) { toast.error('CVV inválido'); return; }
        const [mm, yy] = cardForm.expiry.split('/');
        if (!mm || !yy) { toast.error('Validade inválida (MM/AA)'); return; }
        if (!cardForm.holder_name.trim()) { toast.error('Nome do titular obrigatório'); return; }

        setSaving(true);
        try {
            const res = await fetch('/api/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    holder_name: cardForm.holder_name,
                    number: digits,
                    cvv: cardForm.cvv,
                    brand: cardForm.brand,
                    expiry_month: Number(mm),
                    expiry_year: Number(`20${yy}`),
                    is_default: cardForm.is_default,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (cardForm.is_default) {
                    setCards(prev => prev.map(c => ({ ...c, is_default: false })).concat(data.card));
                } else {
                    setCards(prev => [...prev, data.card]);
                }
                setShowCardForm(false);
                setCardForm({ holder_name: '', card_number: '', cvv: '', brand: 'visa', expiry: '', is_default: true });
                toast.success('Cartão adicionado');
            } else {
                const err = await res.json();
                toast.error(err.error || 'Erro ao adicionar');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteCard(id: string) {
        try {
            const res = await fetch(`/api/cards?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setCards(prev => prev.filter(c => c.id !== id));
                toast.success('Cartão removido');
            }
        } catch {
            toast.error('Erro ao remover');
        }
    }

    async function handleAddAddress() {
        if (!addressForm.street.trim() || !addressForm.number.trim() || !addressForm.neighborhood.trim() ||
            !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.cep.trim()) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/addresses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addressForm),
            });
            if (res.ok) {
                const data = await res.json();
                if (addressForm.is_default) {
                    setAddresses(prev => prev.map(a => ({ ...a, is_default: false })).concat(data.address));
                } else {
                    setAddresses(prev => [...prev, data.address]);
                }
                setShowAddressForm(false);
                setAddressForm({ label: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', cep: '', is_default: true });
                toast.success('Endereço adicionado');
            } else {
                const err = await res.json();
                toast.error(err.error || 'Erro ao adicionar');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteAddress(id: string) {
        try {
            const res = await fetch(`/api/addresses?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setAddresses(prev => prev.filter(a => a.id !== id));
                toast.success('Endereço removido');
            }
        } catch {
            toast.error('Erro ao remover');
        }
    }

    async function handleCepLookup(cep: string) {
        const digits = cep.replace(/\D/g, '');
        if (digits.length !== 8) return;
        try {
            const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
            if (res.ok) {
                const data = await res.json();
                if (!data.erro) {
                    setAddressForm(prev => ({
                        ...prev,
                        street: data.logradouro || prev.street,
                        neighborhood: data.bairro || prev.neighborhood,
                        city: data.localidade || prev.city,
                        state: data.uf || prev.state,
                    }));
                }
            }
        } catch { /* ignore */ }
    }

    const tabs = [
        { id: 'profile' as const, icon: User, label: 'Perfil' },
        { id: 'cards' as const, icon: CreditCard, label: 'Cartões' },
        { id: 'address' as const, icon: MapPin, label: 'Endereço' },
        { id: 'notifications' as const, icon: Bell, label: 'Notificações' },
    ];

    async function handleToggleNotification(key: keyof NonNullable<UserProfile['notification_prefs']>) {
        if (!profile) return;

        const currentPrefs = profile.notification_prefs || {
            price_alerts: true,
            purchase_confirmation: true,
            weekly_report: false,
            push_notifications: false,
            promotions: false
        };

        const newPrefs = { ...currentPrefs, [key]: !currentPrefs[key] };

        // Optimistic update
        setProfile({ ...profile, notification_prefs: newPrefs });

        try {
            const res = await fetch('/api/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notification_prefs: newPrefs }),
            });
            if (!res.ok) {
                // Revert on error
                setProfile({ ...profile, notification_prefs: currentPrefs });
                toast.error('Erro ao atualizar notificação');
            }
        } catch {
            setProfile({ ...profile, notification_prefs: currentPrefs });
            toast.error('Erro de conexão');
        }
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 pt-6 flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
        );
    }

    if (needsLogin) {
        return (
            <div className="max-w-2xl mx-auto px-4 pt-6 text-center py-20">
                <LogIn size={32} className="mx-auto text-surface-400 mb-4" />
                <h2 className="text-lg font-bold text-surface-900 mb-2">Faça login para acessar configurações</h2>
                <button onClick={() => router.push('/login')} className="mt-4 px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold">
                    Fazer Login
                </button>
            </div>
        );
    }

    if (!profile) return null;

    const initial = profile.name?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase() || '?';
    const maskCpf = (cpf?: string) => cpf ? `•••.•••.${cpf.slice(-6)}` : 'Não informado';

    const profileFields = [
        { key: 'name', label: 'Nome completo', value: profile.name || 'Não informado', editable: true },
        { key: 'cpf', label: 'CPF', value: maskCpf(profile.cpf), editable: true },
        { key: 'phone', label: 'Telefone', value: profile.phone || 'Não informado', editable: true },
        { key: 'email', label: 'E-mail', value: profile.email, editable: false },
    ];

    const inputClass = 'w-full text-sm text-surface-800 border border-surface-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all';
    const labelClass = 'block text-xs font-medium text-surface-500 mb-1';

    return (
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
            <h1 className="text-xl font-bold text-surface-900 mb-6">Configurações</h1>

            {/* Tabs */}
            <div className="flex gap-1 bg-surface-100 rounded-xl p-1 mb-6 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-white text-brand-600 shadow-sm'
                            : 'text-surface-500 hover:text-surface-700'
                            }`}
                    >
                        <tab.icon size={16} />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Profile */}
            {activeTab === 'profile' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="bg-white rounded-2xl border border-surface-200 p-5">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
                                <span className="text-2xl font-bold text-brand-600">{initial}</span>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-surface-900">{profile.name || 'Usuário'}</h2>
                                <p className="text-sm text-surface-500">{profile.email}</p>
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-semibold rounded-full">
                                    <Shield size={10} /> Plano {profile.plan}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {profileFields.map((field) => (
                                <div key={field.key} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                                    {editingField === field.key ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <div className="flex-1">
                                                <p className="text-xs text-surface-500">{field.label}</p>
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-full text-sm text-surface-800 border border-brand-300 rounded-lg px-2 py-1 mt-0.5 outline-none focus:ring-2 focus:ring-brand-200"
                                                    autoFocus
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveField(field.key)}
                                                />
                                            </div>
                                            <button onClick={() => handleSaveField(field.key)} disabled={saving} className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-all">
                                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            </button>
                                            <button onClick={() => setEditingField(null)} className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 transition-all">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="text-xs text-surface-500">{field.label}</p>
                                                <p className="text-sm text-surface-800">{field.value}</p>
                                            </div>
                                            {field.editable && (
                                                <button
                                                    onClick={() => { setEditingField(field.key); setEditValue(field.key === 'cpf' ? '' : (field.value === 'Não informado' ? '' : field.value)); }}
                                                    className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-surface-200 p-5 mt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-surface-900">Meu Plano</h3>
                                <p className="text-sm text-surface-500 mt-1">
                                    Você está atualmente no plano <span className="font-semibold text-brand-600 capitalize">{profile.plan}</span>.
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/dashboard/plans')}
                                className="px-4 py-2 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                            >
                                {profile.plan === 'free' ? 'Fazer Upgrade' : 'Mudar Plano'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Cards */}
            {activeTab === 'cards' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {cards.length === 0 && !showCardForm && (
                        <div className="text-center py-12">
                            <CreditCard size={32} className="mx-auto text-surface-300 mb-4" />
                            <p className="text-sm text-surface-500">Nenhum cartão cadastrado.</p>
                            <p className="text-xs text-surface-400 mt-1">Adicione um cartão para compras automáticas.</p>
                        </div>
                    )}

                    {cards.map((card) => (
                        <div key={card.id} className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white relative overflow-hidden">
                            <div className="absolute top-3 right-3 opacity-20">
                                <CreditCard size={64} />
                            </div>
                            {card.is_default && <p className="text-xs opacity-80">Cartão principal</p>}
                            <p className="text-lg font-mono mt-3 tracking-wider">•••• •••• •••• {card.last_four}</p>
                            <div className="flex items-center justify-between mt-4">
                                <div>
                                    <p className="text-[10px] opacity-60">Titular</p>
                                    <p className="text-sm font-medium">{card.holder_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] opacity-60">Validade</p>
                                    <p className="text-sm font-medium">{String(card.expiry_month).padStart(2, '0')}/{String(card.expiry_year).slice(-2)}</p>
                                </div>
                                <span className="text-lg font-bold opacity-80">{card.brand?.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/20">
                                <div className="flex items-center gap-1 text-xs opacity-70">
                                    <Lock size={10} /> Tokenizado · PCI-DSS
                                </div>
                                <button onClick={() => handleDeleteCard(card.id)} className="text-xs opacity-60 hover:opacity-100 flex items-center gap-1 transition-opacity">
                                    <Trash2 size={12} /> Remover
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Card form */}
                    <AnimatePresence>
                        {showCardForm && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                className="bg-white rounded-2xl border border-surface-200 p-5 space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-surface-800">Novo Cartão</h3>
                                    <button onClick={() => setShowCardForm(false)} className="p-1 rounded-lg text-surface-400 hover:bg-surface-100">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div>
                                    <label className={labelClass}>Nome no cartão *</label>
                                    <input type="text" value={cardForm.holder_name} onChange={(e) => setCardForm(p => ({ ...p, holder_name: e.target.value }))} className={inputClass} placeholder="NOME COMPLETO" />
                                </div>

                                <div>
                                    <label className={labelClass}>Número do cartão *</label>
                                    <input
                                        type="text"
                                        value={cardForm.card_number}
                                        onChange={(e) => {
                                            const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                                            setCardForm(p => ({ ...p, card_number: v.replace(/(\d{4})/g, '$1 ').trim() }));
                                        }}
                                        className={inputClass}
                                        placeholder="0000 0000 0000 0000"
                                        maxLength={19}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className={labelClass}>Validade *</label>
                                        <input
                                            type="text"
                                            value={cardForm.expiry}
                                            onChange={(e) => {
                                                let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                                                setCardForm(p => ({ ...p, expiry: v }));
                                            }}
                                            className={inputClass}
                                            placeholder="MM/AA"
                                            maxLength={5}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>CVV *</label>
                                        <input
                                            type="text"
                                            value={cardForm.cvv}
                                            onChange={(e) => setCardForm(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                            className={inputClass}
                                            placeholder="123"
                                            maxLength={4}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Bandeira *</label>
                                        <select value={cardForm.brand} onChange={(e) => setCardForm(p => ({ ...p, brand: e.target.value }))} className={inputClass}>
                                            <option value="visa">Visa</option>
                                            <option value="mastercard">Mastercard</option>
                                            <option value="elo">Elo</option>
                                            <option value="amex">Amex</option>
                                            <option value="hipercard">Hipercard</option>
                                        </select>
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
                                    <input type="checkbox" checked={cardForm.is_default} onChange={(e) => setCardForm(p => ({ ...p, is_default: e.target.checked }))} className="rounded border-surface-300 text-brand-500 focus:ring-brand-200" />
                                    Definir como cartão principal
                                </label>

                                <button
                                    onClick={handleAddCard}
                                    disabled={saving}
                                    className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    {saving ? 'Salvando...' : 'Adicionar Cartão'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!showCardForm && (
                        <button
                            onClick={() => setShowCardForm(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-surface-300 rounded-2xl text-sm font-medium text-surface-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                        >
                            <Plus size={16} /> Adicionar novo cartão
                        </button>
                    )}
                </motion.div>
            )}

            {/* Address */}
            {activeTab === 'address' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {addresses.length === 0 && !showAddressForm && (
                        <div className="text-center py-12">
                            <MapPin size={32} className="mx-auto text-surface-300 mb-4" />
                            <p className="text-sm text-surface-500">Nenhum endereço cadastrado.</p>
                            <p className="text-xs text-surface-400 mt-1">Adicione um endereço para entregas.</p>
                        </div>
                    )}

                    {addresses.map((addr) => (
                        <div key={addr.id} className="bg-white rounded-2xl border border-surface-200 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-brand-600" />
                                    <h3 className="text-sm font-semibold text-surface-800">
                                        {addr.label || (addr.is_default ? 'Endereço Principal' : 'Endereço')}
                                    </h3>
                                    {addr.is_default && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded-full">Padrão</span>
                                    )}
                                </div>
                                <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="text-sm text-surface-700 space-y-0.5">
                                <p>{addr.street}, {addr.number}{addr.complement ? ` — ${addr.complement}` : ''}</p>
                                <p>{addr.neighborhood} — {addr.city}, {addr.state}</p>
                                <p className="font-mono text-surface-500">CEP: {addr.cep}</p>
                            </div>
                        </div>
                    ))}

                    {/* Address form */}
                    <AnimatePresence>
                        {showAddressForm && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                className="bg-white rounded-2xl border border-surface-200 p-5 space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-surface-800">Novo Endereço</h3>
                                    <button onClick={() => setShowAddressForm(false)} className="p-1 rounded-lg text-surface-400 hover:bg-surface-100">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div>
                                    <label className={labelClass}>Apelido</label>
                                    <input type="text" value={addressForm.label} onChange={(e) => setAddressForm(p => ({ ...p, label: e.target.value }))} className={inputClass} placeholder="Casa, Trabalho..." />
                                </div>

                                <div>
                                    <label className={labelClass}>CEP *</label>
                                    <input
                                        type="text"
                                        value={addressForm.cep}
                                        onChange={(e) => {
                                            const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                                            const formatted = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
                                            setAddressForm(p => ({ ...p, cep: formatted }));
                                            if (v.length === 8) handleCepLookup(v);
                                        }}
                                        className={inputClass}
                                        placeholder="00000-000"
                                        maxLength={9}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>Rua *</label>
                                    <input type="text" value={addressForm.street} onChange={(e) => setAddressForm(p => ({ ...p, street: e.target.value }))} className={inputClass} placeholder="Rua, Avenida..." />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>Número *</label>
                                        <input type="text" value={addressForm.number} onChange={(e) => setAddressForm(p => ({ ...p, number: e.target.value }))} className={inputClass} placeholder="123" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Complemento</label>
                                        <input type="text" value={addressForm.complement} onChange={(e) => setAddressForm(p => ({ ...p, complement: e.target.value }))} className={inputClass} placeholder="Apto 42" />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Bairro *</label>
                                    <input type="text" value={addressForm.neighborhood} onChange={(e) => setAddressForm(p => ({ ...p, neighborhood: e.target.value }))} className={inputClass} placeholder="Centro" />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className={labelClass}>Cidade *</label>
                                        <input type="text" value={addressForm.city} onChange={(e) => setAddressForm(p => ({ ...p, city: e.target.value }))} className={inputClass} placeholder="São Paulo" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>UF *</label>
                                        <input type="text" value={addressForm.state} onChange={(e) => setAddressForm(p => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))} className={inputClass} placeholder="SP" maxLength={2} />
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
                                    <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm(p => ({ ...p, is_default: e.target.checked }))} className="rounded border-surface-300 text-brand-500 focus:ring-brand-200" />
                                    Definir como endereço padrão
                                </label>

                                <button
                                    onClick={handleAddAddress}
                                    disabled={saving}
                                    className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    {saving ? 'Salvando...' : 'Adicionar Endereço'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!showAddressForm && (
                        <button
                            onClick={() => setShowAddressForm(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-surface-300 rounded-2xl text-sm font-medium text-surface-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                        >
                            <Plus size={16} /> Adicionar endereço
                        </button>
                    )}
                </motion.div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="bg-white rounded-2xl border border-surface-200 divide-y divide-surface-100">
                        {[
                            { id: 'price_alerts', label: 'Alertas de preço', desc: 'Quando um produto atingir seu preço-alvo' },
                            { id: 'purchase_confirmation', label: 'Confirmação de compra', desc: 'E-mail após cada compra automatizada' },
                            { id: 'weekly_report', label: 'Relatório semanal', desc: 'Resumo de economia e preços monitorados' },
                            { id: 'push_notifications', label: 'Notificações push', desc: 'Notificações no celular (FCM)' },
                            { id: 'promotions', label: 'Promoções', desc: 'Ofertas e cupons personalizados' },
                        ].map((item) => {
                            const isEnabled = profile.notification_prefs?.[item.id as keyof NonNullable<UserProfile['notification_prefs']>] ?? false;

                            return (
                                <div key={item.id} className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="text-sm font-medium text-surface-800">{item.label}</p>
                                        <p className="text-xs text-surface-500">{item.desc}</p>
                                    </div>
                                    <button
                                        onClick={() => handleToggleNotification(item.id as keyof NonNullable<UserProfile['notification_prefs']>)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${isEnabled ? 'bg-brand-500' : 'bg-surface-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
