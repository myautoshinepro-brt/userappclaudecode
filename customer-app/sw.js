const CACHE    = 'sparkwash-customer-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/css/base.css',
  '/css/components.css',
  '/css/screens.css',
  '/js/data.js',
  '/js/state.js',
  '/js/ui.js',
  '/js/router.js',
  '/js/auth.js',
  '/js/home.js',
  '/js/booking.js',
  '/js/detail.js',
  '/js/summary.js',
];

// Install — pre-cache all static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   /api/*      → network only (always fresh)
//   everything  → cache first, fall back to network, then offline page
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls: network only, no caching
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'You are offline. Please check your connection.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Static assets: stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request).then(res => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);

      // Return cached immediately; update cache in background
      return cached || networkFetch || cache.match('/index.html');
    })
  );
});
