import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: 'class',
    content: [
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                brand: {
                    50: '#effefb',
                    100: '#c7fff3',
                    200: '#90ffe8',
                    300: '#51f7d8',
                    400: '#1de4c3',
                    500: '#00BFA6',
                    600: '#009e8b',
                    700: '#007d6f',
                    800: '#006259',
                    900: '#005049',
                    950: '#002f2c',
                },
                navy: {
                    50: '#e6edf4',
                    100: '#c2d1e2',
                    200: '#8fa8c4',
                    300: '#5a7ea5',
                    400: '#2c4f73',
                    500: '#162d45',
                    600: '#0F1923',
                    700: '#0C141C',
                    800: '#090F15',
                    900: '#060A0E',
                    950: '#030507',
                },
                surface: {
                    50: '#f1f5f9',
                    100: '#e2e8f0',
                    200: '#cbd5e1',
                    300: '#94a3b8',
                    400: '#64748b',
                    500: '#475569',
                    600: '#334155',
                    700: '#1e293b',
                    800: '#0f172a',
                    900: '#0a0f1a',
                    950: '#050810',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            borderRadius: {
                lg: '0.75rem',
                md: '0.5rem',
                sm: '0.375rem',
            },
            keyframes: {
                'scan-line': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(200%)' },
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
            animation: {
                'scan-line': 'scan-line 1.5s ease-in-out infinite',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
                'slide-up': 'slide-up 0.4s ease-out',
                'fade-in': 'fade-in 0.3s ease-out',
            },
        },
    },
    plugins: [],
};

export default config;
