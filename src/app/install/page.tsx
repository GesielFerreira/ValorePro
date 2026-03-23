'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share, PlusSquare, Smartphone, CheckCircle2, ChevronRight, MonitorSmartphone } from 'lucide-react';
import Image from 'next/image';

export default function InstallPage() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsStandalone(true);
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Capture Android install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    if (isStandalone) {
        return (
            <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center"
                >
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-surface-900 mb-2">App Instalado!</h1>
                    <p className="text-surface-600 mb-8">
                        Você já está usando o aplicativo ValorePro no seu dispositivo.
                    </p>
                    <a
                        href="/dashboard"
                        className="inline-flex items-center justify-center w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/30"
                    >
                        Acessar Minha Conta
                    </a>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6 pb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-24 h-24 bg-brand-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-brand-200">
                        <MonitorSmartphone size={40} className="text-brand-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-surface-900 mb-3 tracking-tight">Instale o ValorePro</h1>
                    <p className="text-surface-600 text-lg">
                        Tenha acesso rápido, compra automática com Face ID e notificações direto no seu celular.
                    </p>
                </div>

                {/* Instructions Box */}
                <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-surface-100">

                    {isIOS ? (
                        <div className="space-y-6">
                            <h3 className="font-bold text-surface-900 flex items-center gap-2">
                                <Smartphone className="text-brand-500" size={20} />
                                Como instalar no iPhone/iPad
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                                    <p className="text-surface-600 text-sm pt-1.5">
                                        Toque no botão <strong>Compartilhar</strong> <Share size={16} className="inline-block mx-1 -mt-1" /> na barra inferior do Safari.
                                    </p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                                    <p className="text-surface-600 text-sm pt-1.5">
                                        Role para baixo e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong> <PlusSquare size={16} className="inline-block mx-1 -mt-1" />.
                                    </p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                                    <p className="text-surface-600 text-sm pt-1.5">
                                        Toque em <strong>&quot;Adicionar&quot;</strong> no canto superior direito.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <h3 className="font-bold text-surface-900 flex items-center gap-2">
                                <Smartphone className="text-brand-500" size={20} />
                                Como instalar no Android
                            </h3>

                            {deferredPrompt ? (
                                <div className="text-center py-4">
                                    <p className="text-surface-600 text-sm mb-6">
                                        Clique no botão abaixo para baixar o ValorePro e instalá-mo como um aplicativo nativo no seu dispositivo.
                                    </p>
                                    <button
                                        onClick={handleInstallClick}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/30"
                                    >
                                        <Download size={20} />
                                        Instalar Aplicativo Agora
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                                        <p className="text-surface-600 text-sm pt-1.5">
                                            Toque nos <strong>três pontinhos</strong> (menu) no canto superior direito do Chrome.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                                        <p className="text-surface-600 text-sm pt-1.5">
                                            Selecione <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                                        <p className="text-surface-600 text-sm pt-1.5">
                                            Confirme tocando em <strong>&quot;Instalar&quot;</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center px-4">
                    <p className="text-xs text-surface-400">
                        O aplicativo ocupa menos de 2MB e não consome dados em segundo plano.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
