// ============================================================
// ValorePro — Store Login API (opens bot browser for login)
// ============================================================
// POST /api/purchase/login — launches the bot's persistent browser
// in visible (headed) mode so the user can log in to a store.
// Cookies are saved and reused by the headless purchase agent.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:purchase:login');

export const maxDuration = 300; // 5 minutes — user needs time to log in

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Não autorizado.' },
                { status: 401 },
            );
        }

        const body = await request.json();
        const { storeUrl, storeDomain } = body;

        if (!storeUrl && !storeDomain) {
            return NextResponse.json(
                { error: 'URL ou domínio da loja é obrigatório.' },
                { status: 400 },
            );
        }

        const targetUrl = storeUrl || `https://www.${storeDomain}`;

        log.info('Opening visible browser for store login', {
            userId: user.id,
            targetUrl,
        });

        // Dynamic import to avoid bundling playwright in client
        const { launchVisibleBrowserForLogin } = await import(
            '@/server/services/purchase/stealth-browser'
        );

        // Launch visible browser — this will block until user closes it
        await launchVisibleBrowserForLogin(targetUrl);

        log.info('User completed store login session', {
            userId: user.id,
            storeDomain,
        });

        return NextResponse.json({
            success: true,
            message: 'Login realizado. Tente a compra novamente.',
        });
    } catch (err) {
        log.error('Failed to open login browser', { error: String(err) });
        return NextResponse.json(
            { error: 'Erro ao abrir o navegador. Tente novamente.' },
            { status: 500 },
        );
    }
}
