const CACHE    = 'sparkwash-center-v1';
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
  '/js/onboarding.js',
  '/js/dashboard.js',
  '/js/bookings.js',
  '/js/queue.js',
  '/js/slots.js',
  '/js/profile.js',
  '/js/packages.js',
  '/js/reports.js',
  '/js/reviews.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls: network first, offline error response
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'You are offline.' }),
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
      return cached || networkFetch || cache.match('/index.html');
    })
  );
});
