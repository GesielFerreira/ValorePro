const CACHE_NAME = 'valorepro-v3';
const STATIC_ASSETS = ['/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Never intercept: non-GET, API routes, auth routes, non-same-origin
    if (
        event.request.method !== 'GET' ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/auth/') ||
        url.origin !== self.location.origin
    ) {
        return; // Let the browser handle it normally
    }

    // Navigation requests (HTML pages) — always go to network, no fallback
    if (event.request.mode === 'navigate') {
        return; // Let the browser handle navigation normally
    }

    // Static assets only — network-first with cache fallback
    if (
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.startsWith('/icons/') ||
        url.pathname.startsWith('/models/') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.webp') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname === '/manifest.json'
    ) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request).then((r) => r || fetch(event.request)))
        );
        return;
    }

    // Everything else — let the browser handle it
});
