// ============================================================
// ValorePro — Supabase Server Client
// ============================================================
// Use this in Server Components, Route Handlers, Server Actions
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createServerSupabase() {
    const cookieStore = cookies();

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // setAll called from Server Component — ignore
                    }
                },
            },
        },
    );
}

// Admin client (service_role — bypasses RLS)
// Use ONLY for server-side operations that need full access
export function createAdminSupabase() {
    return createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );
}
