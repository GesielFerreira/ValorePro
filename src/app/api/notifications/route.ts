// ============================================================
// ValorePro — Notifications API Route
// ============================================================
// GET   /api/notifications       — list user notifications
// PATCH /api/notifications       — mark as read (by id or all)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unread') === 'true';
        const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

        let query = admin
            .from('notifications')
            .select('id, type, title, message, data, read, created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (unreadOnly) {
            query = query.eq('read', false);
        }

        const { data: notifications } = await query;

        // Count unread
        const { count: unreadCount } = await admin
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('read', false);

        return NextResponse.json({
            notifications: notifications || [],
            unreadCount: unreadCount || 0,
        });
    } catch {
        return NextResponse.json({ error: 'Erro ao buscar notificações.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { notificationId, markAllRead } = body;

        const admin = createAdminSupabase();
        const { data: profile } = await admin
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        const now = new Date().toISOString();

        if (markAllRead) {
            await admin
                .from('notifications')
                .update({ read: true, read_at: now })
                .eq('user_id', profile.id)
                .eq('read', false);

            return NextResponse.json({ success: true, markedAll: true });
        }

        if (notificationId) {
            await admin
                .from('notifications')
                .update({ read: true, read_at: now })
                .eq('id', notificationId)
                .eq('user_id', profile.id);

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Informe notificationId ou markAllRead.' }, { status: 400 });
    } catch {
        return NextResponse.json({ error: 'Erro ao atualizar notificações.' }, { status: 500 });
    }
}
