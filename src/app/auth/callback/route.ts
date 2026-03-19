// ============================================================
// ValorePro — Auth Callback Route
// ============================================================
// Handles OAuth redirects and email confirmation
// ============================================================

import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = createServerSupabase();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Create user profile if it doesn't exist
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: existing } = await supabase
                    .from('users')
                    .select('id')
                    .eq('auth_id', user.id)
                    .single();

                if (!existing) {
                    await supabase.from('users').insert({
                        auth_id: user.id,
                        email: user.email!,
                        name: user.user_metadata?.name || user.email!.split('@')[0],
                    });
                }
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
