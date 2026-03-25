// ============================================================
// ValorePro — Face Descriptor API
// ============================================================
// CRUD for user face descriptors (128 floats from face-api.js)
// POST: save descriptor | GET: retrieve | DELETE: remove
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminSupabase();
    const { data, error } = await admin
        .from('users')
        .select('face_descriptor')
        .eq('auth_id', user.id)
        .single() as { data: { face_descriptor: number[] | null } | null; error: unknown };

    if (error) {
        return NextResponse.json({ error: 'Erro ao buscar Face ID' }, { status: 500 });
    }

    return NextResponse.json({
        hasDescriptor: !!data?.face_descriptor,
        descriptor: data?.face_descriptor || null,
    });
}

export async function POST(req: Request) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { descriptor } = body;

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
        return NextResponse.json(
            { error: 'Descriptor inválido. Deve ser array de 128 números.' },
            { status: 400 },
        );
    }

    if (!descriptor.every((v: unknown) => typeof v === 'number' && isFinite(v as number))) {
        return NextResponse.json(
            { error: 'Descriptor contém valores inválidos.' },
            { status: 400 },
        );
    }

    const admin = createAdminSupabase();
    const { error } = await admin
        .from('users')
        .update({ face_descriptor: descriptor } as Record<string, unknown>)
        .eq('auth_id', user.id);

    if (error) {
        return NextResponse.json({ error: 'Erro ao salvar Face ID' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Face ID cadastrado com sucesso' });
}

export async function DELETE() {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminSupabase();
    const { error } = await admin
        .from('users')
        .update({ face_descriptor: null } as Record<string, unknown>)
        .eq('auth_id', user.id);

    if (error) {
        return NextResponse.json({ error: 'Erro ao remover Face ID' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Face ID removido' });
}
