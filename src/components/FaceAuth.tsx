// ============================================================
// ValorePro — Face Authentication Component
// ============================================================
// Opens camera, detects face, compares with stored descriptor.
// Returns onSuccess/onFail to parent component.
// ============================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, ShieldCheck, ShieldX, RefreshCw } from 'lucide-react';
import { loadFaceModels, extractDescriptor, compareFaces } from '@/lib/face-utils';

interface FaceAuthProps {
    storedDescriptor: number[];
    onSuccess: () => void;
    onFail: () => void;
    onCancel: () => void;
}

type AuthStatus = 'loading' | 'ready' | 'scanning' | 'success' | 'fail' | 'error';

export function FaceAuth({ storedDescriptor, onSuccess, onFail, onCancel }: FaceAuthProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [message, setMessage] = useState('Carregando modelos...');
    const [attempts, setAttempts] = useState(0);
    const MAX_ATTEMPTS = 3;

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            return true;
        } catch {
            setStatus('error');
            setMessage('Não foi possível acessar a câmera. Verifique as permissões.');
            return false;
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                await loadFaceModels();
                if (cancelled) return;
                const cameraOk = await startCamera();
                if (!cancelled && cameraOk) {
                    setStatus('ready');
                    setMessage('Posicione seu rosto na câmera');
                }
            } catch {
                if (!cancelled) {
                    setStatus('error');
                    setMessage('Erro ao carregar modelos de reconhecimento facial.');
                }
            }
        }

        init();
        return () => { cancelled = true; stopCamera(); };
    }, [startCamera, stopCamera]);

    const handleScan = useCallback(async () => {
        if (!videoRef.current || status === 'scanning') return;

        setStatus('scanning');
        setMessage('Analisando rosto...');

        try {
            const descriptor = await extractDescriptor(videoRef.current);

            if (!descriptor) {
                setStatus('ready');
                setMessage('Nenhum rosto detectado. Posicione-se melhor.');
                return;
            }

            const result = compareFaces(storedDescriptor, descriptor);

            if (result.match) {
                setStatus('success');
                setMessage('Identidade confirmada!');
                stopCamera();
                setTimeout(() => onSuccess(), 1200);
            } else {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);

                if (newAttempts >= MAX_ATTEMPTS) {
                    setStatus('fail');
                    setMessage('Rosto não reconhecido após 3 tentativas.');
                    stopCamera();
                    setTimeout(() => onFail(), 2000);
                } else {
                    setStatus('ready');
                    setMessage(`Rosto não reconhecido. Tentativa ${newAttempts}/${MAX_ATTEMPTS}`);
                }
            }
        } catch {
            setStatus('error');
            setMessage('Erro ao processar reconhecimento facial.');
        }
    }, [status, storedDescriptor, attempts, stopCamera, onSuccess, onFail]);

    const statusConfig = {
        loading: { bg: 'bg-blue-500', ring: 'ring-blue-300' },
        ready: { bg: 'bg-brand-500', ring: 'ring-brand-300' },
        scanning: { bg: 'bg-amber-500', ring: 'ring-amber-300' },
        success: { bg: 'bg-emerald-500', ring: 'ring-emerald-300' },
        fail: { bg: 'bg-red-500', ring: 'ring-red-300' },
        error: { bg: 'bg-red-500', ring: 'ring-red-300' },
    };

    const { bg, ring } = statusConfig[status];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-surface-100">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={20} className="text-brand-500" />
                            <h3 className="font-bold text-surface-900">Face ID</h3>
                        </div>
                        <button
                            onClick={() => { stopCamera(); onCancel(); }}
                            className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Camera view */}
                    <div className="relative aspect-[4/3] bg-black">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover mirror"
                            style={{ transform: 'scaleX(-1)' }}
                        />

                        {/* Overlay oval guide */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className={`w-48 h-60 rounded-full border-4 ${status === 'success' ? 'border-emerald-400' : status === 'fail' ? 'border-red-400' : 'border-white/50'} transition-colors duration-300`} />
                        </div>

                        {/* Status indicator */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                            <div className={`px-4 py-1.5 rounded-full ${bg} text-white text-xs font-medium flex items-center gap-1.5 ring-4 ${ring}/20`}>
                                {status === 'loading' && <Loader2 size={12} className="animate-spin" />}
                                {status === 'scanning' && <Loader2 size={12} className="animate-spin" />}
                                {status === 'success' && <ShieldCheck size={12} />}
                                {status === 'fail' && <ShieldX size={12} />}
                                {message}
                            </div>
                        </div>
                    </div>

                    {/* Action area */}
                    <div className="p-4">
                        {(status === 'ready') && (
                            <button
                                onClick={handleScan}
                                className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <Camera size={18} />
                                Verificar Rosto
                            </button>
                        )}

                        {status === 'error' && (
                            <button
                                onClick={() => { setStatus('loading'); startCamera().then(() => setStatus('ready')); }}
                                className="w-full py-3 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} />
                                Tentar Novamente
                            </button>
                        )}

                        {status === 'success' && (
                            <div className="text-center text-sm text-emerald-600 font-medium py-2">
                                ✅ Redirecionando...
                            </div>
                        )}

                        {status === 'fail' && (
                            <div className="text-center text-sm text-red-600 font-medium py-2">
                                Autenticação falhou. Compre manualmente pelo link.
                            </div>
                        )}

                        <p className="text-[11px] text-surface-400 text-center mt-3">
                            Seus dados faciais são processados localmente no seu dispositivo.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
