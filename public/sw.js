const CACHE_NAME = 'valorepro-v2';
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

    // Never cache: non-GET, API routes, auth routes, chrome-extension
    if (
        event.request.method !== 'GET' ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/auth/') ||
        url.protocol === 'chrome-extension:'
    ) {
        return;
    }

    // Navigation requests (HTML pages) — always network-first, no cache fallback
    // This prevents stale pages in PWA standalone mode
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/'))
        );
        return;
    }

    // Static assets — network-first with cache fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Only cache successful responses for static assets
                if (response.ok && (
                    url.pathname.startsWith('/_next/static/') ||
                    url.pathname.startsWith('/icons/') ||
                    url.pathname.endsWith('.svg') ||
                    url.pathname.endsWith('.png') ||
                    url.pathname.endsWith('.webp') ||
                    url.pathname === '/manifest.json'
                )) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
