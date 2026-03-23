// ============================================================
// ValorePro — Face Registration Component
// ============================================================
// Captures selfie, extracts face descriptor, saves via API.
// Takes 3 samples for a more robust average descriptor.
// ============================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, CheckCircle2, User, RefreshCw } from 'lucide-react';
import { loadFaceModels, extractDescriptor, descriptorToArray } from '@/lib/face-utils';
import { toast } from 'sonner';

interface FaceRegisterProps {
    onComplete: () => void;
    onCancel: () => void;
}

type RegisterStep = 'loading' | 'ready' | 'capturing' | 'processing' | 'done' | 'error';

export function FaceRegister({ onComplete, onCancel }: FaceRegisterProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [step, setStep] = useState<RegisterStep>('loading');
    const [samples, setSamples] = useState<Float32Array[]>([]);
    const [message, setMessage] = useState('Preparando câmera...');
    const TOTAL_SAMPLES = 3;

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                await loadFaceModels();
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: 640, height: 480 },
                });
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setStep('ready');
                setMessage('Olhe para a câmera e clique em "Capturar"');
            } catch {
                if (!cancelled) {
                    setStep('error');
                    setMessage('Não foi possível acessar a câmera.');
                }
            }
        }

        init();
        return () => { cancelled = true; stopCamera(); };
    }, [stopCamera]);

    const captureSample = useCallback(async () => {
        if (!videoRef.current) return;

        setStep('capturing');
        setMessage(`Capturando amostra ${samples.length + 1}/${TOTAL_SAMPLES}...`);

        const descriptor = await extractDescriptor(videoRef.current);

        if (!descriptor) {
            setStep('ready');
            setMessage('Nenhum rosto detectado. Posicione-se e tente novamente.');
            return;
        }

        const newSamples = [...samples, descriptor];
        setSamples(newSamples);

        if (newSamples.length < TOTAL_SAMPLES) {
            setStep('ready');
            setMessage(`Amostra ${newSamples.length}/${TOTAL_SAMPLES} capturada! Mude levemente o ângulo e capture novamente.`);
        } else {
            setStep('processing');
            setMessage('Processando Face ID...');

            // Average all descriptors for robustness
            const avgDescriptor = new Float32Array(128);
            for (let i = 0; i < 128; i++) {
                let sum = 0;
                for (const s of newSamples) sum += s[i];
                avgDescriptor[i] = sum / newSamples.length;
            }

            try {
                const res = await fetch('/api/face', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descriptor: descriptorToArray(avgDescriptor) }),
                });

                if (!res.ok) throw new Error('API error');

                stopCamera();
                setStep('done');
                setMessage('Face ID cadastrado com sucesso!');
                toast.success('Face ID cadastrado!');
                setTimeout(() => onComplete(), 1500);
            } catch {
                setStep('error');
                setMessage('Erro ao salvar Face ID. Tente novamente.');
            }
        }
    }, [samples, stopCamera, onComplete]);

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
                            <User size={20} className="text-brand-500" />
                            <h3 className="font-bold text-surface-900">Cadastrar Face ID</h3>
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
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                        />

                        {/* Oval guide */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className={`w-48 h-60 rounded-full border-4 transition-colors duration-300 ${
                                step === 'done' ? 'border-emerald-400' :
                                step === 'capturing' ? 'border-amber-400' :
                                'border-white/50'
                            }`} />
                        </div>

                        {/* Progress dots */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {Array.from({ length: TOTAL_SAMPLES }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-3 h-3 rounded-full transition-all ${
                                        i < samples.length
                                            ? 'bg-emerald-400 scale-110'
                                            : 'bg-white/30'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Action area */}
                    <div className="p-4">
                        <p className="text-sm text-surface-600 text-center mb-4">
                            {message}
                        </p>

                        {step === 'ready' && (
                            <button
                                onClick={captureSample}
                                className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <Camera size={18} />
                                Capturar {samples.length > 0 ? `(${samples.length + 1}/${TOTAL_SAMPLES})` : ''}
                            </button>
                        )}

                        {step === 'capturing' && (
                            <div className="flex justify-center py-3">
                                <Loader2 size={24} className="animate-spin text-brand-500" />
                            </div>
                        )}

                        {step === 'processing' && (
                            <div className="flex justify-center py-3">
                                <Loader2 size={24} className="animate-spin text-brand-500" />
                            </div>
                        )}

                        {step === 'done' && (
                            <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 font-semibold text-sm">
                                <CheckCircle2 size={20} />
                                Cadastro completo!
                            </div>
                        )}

                        {step === 'error' && (
                            <button
                                onClick={() => { setSamples([]); setStep('loading'); }}
                                className="w-full py-3 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} />
                                Recomeçar
                            </button>
                        )}

                        <p className="text-[11px] text-surface-400 text-center mt-3">
                            Processamento 100% local — nenhuma imagem é enviada ao servidor.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
