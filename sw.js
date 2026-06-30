// ── Armeria Personale — Service Worker ──────────────────────────
const CACHE_NAME = 'armeria-v1';

// File da cachare al momento dell'installazione
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/fonts/tabler-icons.woff2'
];

// ── INSTALL: precache di tutti i file statici ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: rimuove cache vecchie ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Cache First per asset locali, Network First per API ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Chiamate all'API Anthropic: sempre rete, mai cache
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Tutto il resto: Cache First (funziona offline)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Salva in cache solo risposte valide
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: ritorna la home
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
