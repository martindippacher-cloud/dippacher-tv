/* Dippacher TV – Offline-Cache (Service Worker)
   Cache-Name hängt an version.json: index.html registriert ./sw.js?v=<version>.
   Neue Version -> neuer Worker -> alter Cache wird beim Aktivieren gelöscht.
   Hülle (HTML/JS/CSS) und JSON: network-first (Cache nur offline).
   Bilder/Schriften: stale-while-revalidate (sofort aus Cache, im Hintergrund aktualisieren). */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'ohne-version';
const CACHE = 'dippacher-tv-' + VERSION;
const PRECACHE = [
  './',
  './index.html',
  './uebersicht.html',
  './schedule.js',
  './slides.js',
  './dashboard.js',
  './dashboard.css',
  './termine.json',
  './auswahl.json',
  './version.json',
  './einblendung.json',
  './laufband.json',
  './assets/fonts/fonts.css',
  './assets/fonts/playfair-display-700-latin.woff2',
  './assets/fonts/playfair-display-700-latin-ext.woff2',
  './assets/fonts/source-sans-3-latin.woff2',
  './assets/fonts/source-sans-3-latin-ext.woff2',
  './assets/fonts/source-sans-3-600-latin.woff2',
  './assets/fonts/source-sans-3-600-latin-ext.woff2',
  './assets/fonts/source-sans-3-700-latin.woff2',
  './assets/fonts/source-sans-3-700-latin-ext.woff2',
  './assets/logo.png',
  './assets/food-box-24.7.jpg',
  './assets/gutscheinkartedippacher.jpg',
  './assets/qr_foodbox.png',
  './assets/qr_gutschein.png',
  './assets/qr_reservierung.png',
  './assets/qr_reservierung_resmio.png',
  './assets/qr_weihnachten.png',
  './assets/schaueferla_9731Lr.jpg',
  './assets/stadtwerke_forchheim_bg.jpg',
  './assets/stadtwerke_forchheim_logo.png',
  './assets/stadtwerke_forchheim_logo.svg',
  './assets/karpfen_0461Lr.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const u of PRECACHE) {
      try { await c.add(new Request(u, {cache:'reload'})); } catch (err) { /* einzelne Datei optional */ }
    }
    try {
      const aus = await (await fetch('./auswahl.json', {cache:'no-store'})).json();
      for (const id of (aus.reihenfolge || [])) {
        try {
          const u = './folien/' + encodeURIComponent(id) + '.json';
          await c.add(new Request(u, {cache:'reload'}));
          /* Bilder der Folie (z. B. Plakat-PNGs in assets/vereine/) gleich mitcachen, damit sie offline da sind */
          const f = await (await c.match(u)).clone().json();
          const kachelBilder = Array.isArray(f.kacheln) ? f.kacheln.map(k => k && k.bild) : [];
          const bilder = [].concat(Array.isArray(f.bilder) ? f.bilder : [], f.bild || [], f.qr || [], f.logo || [], kachelBilder)
            .filter(b => typeof b === 'string' && b && !/^https?:/i.test(b));
          for (const b of bilder) { try { if (!(await c.match('./' + b.replace(/^\.\//, '')))) await c.add('./' + b.replace(/^\.\//, '')); } catch (_) {} }
        } catch (_) {}
      }
      /* Folien, die nur noch eine Dashboard-Kachel braucht (z. B. Teaser aus folien/archiv/). */
      try {
        const dash = await (await fetch('./folien/dashboard.json', {cache:'no-store'})).json();
        const ids = [];
        for (const k of (dash.kacheln || [])) {
          if (k && k.folie) ids.push(k.folie);
          if (k && Array.isArray(k.folien)) ids.push.apply(ids, k.folien);
        }
        const inAuswahl = new Set(aus.reihenfolge || []);
        for (const id of ids) {
          if (!id || inAuswahl.has(id)) continue;
          let u = './folien/' + encodeURIComponent(id) + '.json';
          try { await c.add(new Request(u, {cache:'reload'})); }
          catch (_) {
            u = './folien/archiv/' + encodeURIComponent(id) + '.json';
            try { await c.add(new Request(u, {cache:'reload'})); } catch (__) { continue; }
          }
        }
      } catch (_) {}
    } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('dippacher-tv-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isShell(req, url) {
  const p = url.pathname;
  return req.mode === 'navigate' || p.endsWith('/') || /\.(html|js|css|json)$/.test(p);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* Wetter (Open-Meteo) nie im SW-Cache: das Dashboard hält selbst den letzten Stand (localStorage, max. 12 h) */
  if (url.hostname.endsWith('open-meteo.com')) return;
  if (url.origin !== self.location.origin) {
    e.respondWith(networkFirst(req));
    return;
  }
  if (url.pathname.endsWith('/sw.js')) return;
  if (isShell(req, url)) e.respondWith(networkFirst(req));
  else e.respondWith(staleWhileRevalidate(e, req));
});

async function staleWhileRevalidate(e, req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req, {ignoreSearch: true});
  const frisch = fetch(req).then(res => {
    if (res && res.ok) { try { c.put(req, res.clone()); } catch (_) {} }
    return res;
  });
  if (hit) {
    e.waitUntil(frisch.catch(() => {}));
    return hit;
  }
  return frisch;
}

async function networkFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      try { c.put(req, res.clone()); } catch (_) {}
      return res;
    }
    /* Server liefert Fehler (z. B. 5xx): lieber letzten guten Stand zeigen */
    const alt = await c.match(req) || await c.match(req, {ignoreSearch: true});
    return alt || res;
  } catch (err) {
    const hit = await c.match(req) || await c.match(req, {ignoreSearch: true});
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const fb = await c.match('./index.html') || await c.match('./');
      if (fb) return fb;
    }
    throw err;
  }
}
