// ============================================================
// ValorePro — Next.js Middleware
// ============================================================

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         * - api (API routes, they handle their own auth)
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
