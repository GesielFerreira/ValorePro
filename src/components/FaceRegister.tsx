// ============================================================
// ValorePro — Face Registration Component (Multi-Angle)
// ============================================================
// Guided multi-angle face capture similar to iPhone Face ID.
// 5 positions: front, left, right, up, down.
// Auto-captures when face is in the correct angle.
// ============================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, User, RefreshCw } from 'lucide-react';
import { loadFaceModels, detectFaceWithLandmarks, descriptorToArray, type FaceAngle } from '@/lib/face-utils';
import { toast } from 'sonner';

interface FaceRegisterProps {
    onComplete: () => void;
    onCancel: () => void;
}

type RegisterStep = 'loading' | 'ready' | 'capturing' | 'processing' | 'done' | 'error';

interface AngleGuide {
    id: string;
    label: string;
    instruction: string;
    icon: string;
    check: (angle: FaceAngle) => boolean;
}

const ANGLE_GUIDES: AngleGuide[] = [
    {
        id: 'front',
        label: 'Frontal',
        instruction: 'Olhe diretamente para a câmera',
        icon: '👤',
        check: (a) => Math.abs(a.yaw) < 0.2 && Math.abs(a.pitch) < 0.25,
    },
    {
        id: 'left',
        label: 'Esquerda',
        instruction: 'Vire levemente para a esquerda',
        icon: '👈',
        check: (a) => a.yaw < -0.2 && a.yaw > -0.7 && Math.abs(a.pitch) < 0.35,
    },
    {
        id: 'right',
        label: 'Direita',
        instruction: 'Vire levemente para a direita',
        icon: '👉',
        check: (a) => a.yaw > 0.2 && a.yaw < 0.7 && Math.abs(a.pitch) < 0.35,
    },
    {
        id: 'up',
        label: 'Para cima',
        instruction: 'Levante levemente o queixo',
        icon: '👆',
        check: (a) => a.pitch < -0.15 && a.pitch > -0.6 && Math.abs(a.yaw) < 0.35,
    },
    {
        id: 'down',
        label: 'Para baixo',
        instruction: 'Abaixe levemente o queixo',
        icon: '👇',
        check: (a) => a.pitch > 0.15 && a.pitch < 0.6 && Math.abs(a.yaw) < 0.35,
    },
];

export function FaceRegister({ onComplete, onCancel }: FaceRegisterProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number>(0);
    const holdTimerRef = useRef<number>(0);

    const [step, setStep] = useState<RegisterStep>('loading');
    const [currentAngleIdx, setCurrentAngleIdx] = useState(0);
    const [samples, setSamples] = useState<Float32Array[]>([]);
    const [message, setMessage] = useState('Preparando câmera...');
    const [isAligned, setIsAligned] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);

    const TOTAL_ANGLES = ANGLE_GUIDES.length;
    const HOLD_DURATION = 1200; // ms to hold position before capture

    const currentGuide = ANGLE_GUIDES[currentAngleIdx];

    const stopCamera = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = 0;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    // Initialize camera and models
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
                setMessage(ANGLE_GUIDES[0].instruction);
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

    // Real-time face tracking loop
    useEffect(() => {
        if (step !== 'ready' || !videoRef.current) return;

        let holdStart = 0;
        let lastSamplesLen = samples.length;
        let currentIdx = currentAngleIdx;
        const guide = ANGLE_GUIDES[currentIdx];

        async function detectLoop() {
            if (!videoRef.current || !streamRef.current) return;

            const result = await detectFaceWithLandmarks(videoRef.current);

            if (result && guide.check(result.angle)) {
                if (holdStart === 0) holdStart = Date.now();
                const elapsed = Date.now() - holdStart;
                const progress = Math.min(1, elapsed / HOLD_DURATION);
                setIsAligned(true);
                setHoldProgress(progress);

                if (elapsed >= HOLD_DURATION) {
                    // Auto-capture!
                    const newSamples = [...samples.slice(0, currentIdx), result.descriptor];
                    setSamples(newSamples);
                    lastSamplesLen = newSamples.length;
                    holdStart = 0;
                    setHoldProgress(0);
                    setIsAligned(false);

                    if (currentIdx + 1 < TOTAL_ANGLES) {
                        currentIdx++;
                        setCurrentAngleIdx(currentIdx);
                        setMessage(ANGLE_GUIDES[currentIdx].instruction);
                    } else {
                        // All angles captured — process
                        setStep('processing');
                        setMessage('Processando Face ID...');

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
                        return; // Don't schedule next frame
                    }
                }
            } else {
                holdStart = 0;
                setIsAligned(false);
                setHoldProgress(0);
            }

            animFrameRef.current = requestAnimationFrame(detectLoop);
        }

        // Start detection loop with throttle
        let lastDetect = 0;
        async function throttledLoop() {
            const now = Date.now();
            if (now - lastDetect >= 200) { // ~5 FPS for detection
                lastDetect = now;
                await detectLoop();
            } else {
                animFrameRef.current = requestAnimationFrame(throttledLoop);
            }
        }

        throttledLoop();

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [step, currentAngleIdx, samples, stopCamera, onComplete]);

    // Arc progress for the circular guide
    const arcProgress = currentAngleIdx / TOTAL_ANGLES;
    const arcDegrees = arcProgress * 360;

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

                        {/* Oval guide with progress arc */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-52 h-64">
                                {/* SVG progress arc */}
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 208 256">
                                    {/* Background oval */}
                                    <ellipse
                                        cx="104" cy="128" rx="96" ry="120"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.2)"
                                        strokeWidth="4"
                                    />
                                    {/* Progress arc */}
                                    <ellipse
                                        cx="104" cy="128" rx="96" ry="120"
                                        fill="none"
                                        stroke={step === 'done' ? '#34d399' : isAligned ? '#fbbf24' : '#00BFA6'}
                                        strokeWidth="4"
                                        strokeDasharray={`${(arcProgress + (isAligned ? holdProgress / TOTAL_ANGLES : 0)) * 678} 678`}
                                        strokeLinecap="round"
                                        className="transition-all duration-300"
                                        style={{ transform: 'rotate(-90deg)', transformOrigin: '104px 128px' }}
                                    />
                                </svg>

                                {/* Center alignment indicator */}
                                {step === 'ready' && (
                                    <motion.div
                                        animate={isAligned ? { scale: [1, 1.05, 1] } : {}}
                                        transition={{ repeat: Infinity, duration: 0.8 }}
                                        className="absolute inset-0 flex items-center justify-center"
                                    >
                                        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                            isAligned
                                                ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                                                : 'bg-white/30'
                                        }`} />
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Step dots at top */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {ANGLE_GUIDES.map((guide, i) => (
                                <div key={guide.id} className="flex flex-col items-center gap-1">
                                    <div
                                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                            i < currentAngleIdx
                                                ? 'bg-emerald-400 scale-100'
                                                : i === currentAngleIdx
                                                ? isAligned ? 'bg-amber-400 scale-125' : 'bg-white/80 scale-110'
                                                : 'bg-white/20'
                                        }`}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Direction indicator arrow */}
                        {step === 'ready' && (
                            <motion.div
                                key={currentGuide?.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full"
                            >
                                <div className="flex items-center gap-2 text-white">
                                    <span className="text-lg">{currentGuide?.icon}</span>
                                    <span className="text-sm font-medium">{currentGuide?.label}</span>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Action area */}
                    <div className="p-4">
                        <motion.p
                            key={message}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-surface-600 text-center mb-3"
                        >
                            {message}
                        </motion.p>

                        {/* Hold progress bar */}
                        {step === 'ready' && isAligned && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mb-3"
                            >
                                <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-brand-400 to-emerald-400 rounded-full"
                                        style={{ width: `${holdProgress * 100}%` }}
                                        transition={{ duration: 0.1 }}
                                    />
                                </div>
                                <p className="text-[11px] text-surface-400 text-center mt-1">
                                    Mantenha a posição...
                                </p>
                            </motion.div>
                        )}

                        {step === 'ready' && !isAligned && (
                            <div className="flex items-center justify-center gap-3 py-2">
                                <div className="flex items-center gap-1.5 text-xs text-surface-400">
                                    <span className="font-semibold text-brand-600">
                                        {currentAngleIdx + 1}/{TOTAL_ANGLES}
                                    </span>
                                    posições
                                </div>
                            </div>
                        )}

                        {(step === 'loading' || step === 'capturing' || step === 'processing') && (
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
                                onClick={() => {
                                    setSamples([]);
                                    setCurrentAngleIdx(0);
                                    setStep('loading');
                                    setMessage('Preparando câmera...');
                                }}
                                className="w-full py-3 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} />
                                Recomeçar
                            </button>
                        )}

                        <p className="text-[11px] text-surface-400 text-center mt-3">
                            🔒 Processamento 100% local — nenhuma imagem é enviada ao servidor.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
