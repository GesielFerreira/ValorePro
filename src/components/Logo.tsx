// ============================================================
// ValorePro — SVG Logo Component
// ============================================================
// Hexagonal shield with checkmark icon + "ValorePro" text
// Colors: Dark navy bg, teal/cyan accents (#00BFA6)
// ============================================================

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
    className?: string;
}

const sizes = {
    sm: { icon: 28, text: 'text-base' },
    md: { icon: 36, text: 'text-lg' },
    lg: { icon: 48, text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
    const s = sizes[size];

    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            {/* Hexagonal shield with checkmark */}
            <svg
                width={s.icon}
                height={s.icon}
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Outer hexagon */}
                <path
                    d="M24 2L43 13v22L24 46 5 35V13L24 2z"
                    fill="#0F1923"
                    stroke="#00BFA6"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
                {/* Inner glow */}
                <path
                    d="M24 6L40 15.5v19L24 44 8 34.5v-19L24 6z"
                    fill="#0F1923"
                    stroke="#00BFA630"
                    strokeWidth="1"
                    strokeLinejoin="round"
                />
                {/* Checkmark */}
                <path
                    d="M15 24l6 6 12-12"
                    stroke="#00BFA6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Subtle grid dots */}
                <circle cx="18" cy="14" r="0.7" fill="#00BFA620" />
                <circle cx="30" cy="14" r="0.7" fill="#00BFA620" />
                <circle cx="12" cy="24" r="0.7" fill="#00BFA620" />
                <circle cx="36" cy="24" r="0.7" fill="#00BFA620" />
                <circle cx="18" cy="34" r="0.7" fill="#00BFA620" />
                <circle cx="30" cy="34" r="0.7" fill="#00BFA620" />
            </svg>

            {showText && (
                <div className="flex items-baseline gap-1.5">
                    <span className={`font-bold ${s.text} text-surface-900`}>
                        Valore
                    </span>
                    <span className="px-1.5 py-0.5 bg-brand-500 text-white text-[10px] font-bold rounded-md uppercase tracking-wide">
                        Pro
                    </span>
                </div>
            )}
        </div>
    );
}

export function LogoIcon({ size = 32 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M24 2L43 13v22L24 46 5 35V13L24 2z"
                fill="#0F1923"
                stroke="#00BFA6"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="M24 6L40 15.5v19L24 44 8 34.5v-19L24 6z"
                fill="#0F1923"
                stroke="#00BFA630"
                strokeWidth="1"
                strokeLinejoin="round"
            />
            <path
                d="M15 24l6 6 12-12"
                stroke="#00BFA6"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
