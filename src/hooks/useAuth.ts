// ============================================================
// ValorePro — useAuth Hook
// ============================================================
// React hook for auth state, login, signup, logout
// ============================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        loading: true,
    });

    const supabase = createClient();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setState({
                user: session?.user ?? null,
                session,
                loading: false,
            });
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setState({
                    user: session?.user ?? null,
                    session,
                    loading: false,
                });
            },
        );

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const signUp = useCallback(
        async (email: string, password: string, name: string) => {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
            return data;
        },
        [supabase],
    );

    const signIn = useCallback(
        async (email: string, password: string) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            return data;
        },
        [supabase],
    );

    const signInWithGoogle = useCallback(async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) throw error;
        return data;
    }, [supabase]);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }, [supabase]);

    const resetPassword = useCallback(
        async (email: string) => {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });
            if (error) throw error;
        },
        [supabase],
    );

    return {
        user: state.user,
        session: state.session,
        loading: state.loading,
        isAuthenticated: !!state.session,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
    };
}
