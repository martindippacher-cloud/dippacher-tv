/* Dippacher TV – Offline-Cache (Service Worker) */
const CACHE = 'dippacher-tv-v1';
const PRECACHE = [
  './',
  './index.html',
  './uebersicht.html',
  './schedule.js',
  './slides.js',
  './sw.js',
  './auswahl.json',
  './version.json',
  './einblendung.json',
  './laufband.json',
  './assets/fonts/fonts.css',
  './assets/fonts/playfair-display-700-latin.woff2',
  './assets/fonts/playfair-display-700-latin-ext.woff2',
  './assets/fonts/source-sans-3-latin.woff2',
  './assets/fonts/source-sans-3-latin-ext.woff2',
  './assets/logo.png',
  './assets/food-box-24.7.jpg',
  './assets/gutscheinkartedippacher.jpg',
  './assets/kloesse.jpg',
  './assets/qr_foodbox.png',
  './assets/qr_gutschein.png',
  './assets/qr_reservierung.png',
  './assets/qr_weihnachten.png',
  './assets/schaueferla_9731Lr.jpg',
  './assets/stadtwerke_forchheim_bg.jpg',
  './assets/stadtwerke_forchheim_logo.png',
  './assets/stadtwerke_forchheim_logo.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const u of PRECACHE) {
      try { await c.add(u); } catch (err) { /* einzelne Datei optional */ }
    }
    try {
      const aus = await (await fetch('./auswahl.json', {cache:'no-store'})).json();
      for (const id of (aus.reihenfolge || [])) {
        try { await c.add('./folien/' + id + '.json'); } catch (_) {}
      }
    } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isVolatile(url) {
  const p = url.pathname;
  return p.endsWith('.json') || /inventory\.json/.test(url.href);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    e.respondWith(networkFirst(req));
    return;
  }
  if (isVolatile(url)) e.respondWith(networkFirst(req));
  else e.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const hit = await caches.match(req, {ignoreSearch: true});
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const c = await caches.open(CACHE);
      try { c.put(req, res.clone()); } catch (_) {}
    }
    return res;
  } catch (err) {
    if (req.mode === 'navigate') {
      const fb = await caches.match('./index.html');
      if (fb) return fb;
    }
    throw err;
  }
}

async function networkFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      try { c.put(req, res.clone()); } catch (_) {}
    }
    return res;
  } catch (err) {
    const hit = await caches.match(req) || await caches.match(req, {ignoreSearch: true});
    if (hit) return hit;
    throw err;
  }
}
