import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
    title: 'ValorePro — Busca Inteligente de Preços com IA',
    description: 'Encontre o melhor preço de qualquer produto, verifique a segurança da loja, e compre com confiança usando IA.',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'ValorePro',
    },
    openGraph: {
        title: 'ValorePro — Busca Inteligente de Preços',
        description: 'Varredura web + verificação de loja + compra automática com IA',
        type: 'website',
        locale: 'pt_BR',
    },
};

export const viewport: Viewport = {
    themeColor: '#00BFA6',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className="antialiased">
            <head>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link rel="apple-touch-icon" href="/icons/icon-192.png" />
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body className="min-h-screen bg-surface-50 font-sans">
                <Navbar />
                <main className="pb-20 md:pb-0">
                    {children}
                </main>
                <Toaster
                    position="top-center"
                    toastOptions={{
                        style: { background: '#00BFA6', color: '#fff', border: 'none' },
                    }}
                />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
                    }}
                />
            </body>
        </html>
    );
}
