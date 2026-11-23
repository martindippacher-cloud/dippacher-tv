#!/usr/bin/env node
// Rendert für jede Folie in auswahl.json ein Vorschaubild 640×360 (JPEG, typisch <60 KB)
// nach assets/vorschau/<id>.jpg. Wird bei jedem Veröffentlichen mit scripts/vorschauen.sh
// aufgerufen, damit die Übersicht keine Live-iframes mehr braucht.
'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const OUTDIR = path.join(ROOT, 'assets', 'vorschau');
const MAX_BYTES = Number(process.env.VORSCHAU_MAX_BYTES || 60 * 1024);
const WIDTH = 640;
const HEIGHT = 360;
const CHROME = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  '/home/box/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';

function resolvePlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    '/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright',
  ].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* next */ }
  }
  try { return require('playwright'); } catch (e) {
    throw new Error('Playwright nicht gefunden. PLAYWRIGHT_MODULE setzen.');
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      let rel = decodeURIComponent(u.pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.normalize(path.join(ROOT, rel));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(err.code === 'ENOENT' ? 404 : 500); res.end(); return; }
        const ext = path.extname(file).toLowerCase();
        const types = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.webp': 'image/webp',
          '.avif': 'image/avif',
          '.mp4': 'video/mp4',
          '.woff2': 'font/woff2',
          '.woff': 'font/woff',
          '.ttf': 'font/ttf',
        };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: 'http://127.0.0.1:' + port });
    });
    server.on('error', reject);
  });
}

function jpegCompress(srcPng, destJpg) {
  const py = `
import sys
from PIL import Image
from io import BytesIO
src, dest, w, h, max_bytes = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
im = Image.open(src).convert('RGB')
scale = min(w/im.width, h/im.height)
nw, nh = max(1, round(im.width*scale)), max(1, round(im.height*scale))
im = im.resize((nw, nh), Image.Resampling.LANCZOS)
out = Image.new('RGB', (w, h), (245, 237, 223))
out.paste(im, ((w-nw)//2, (h-nh)//2))
best = None
for q in list(range(80, 34, -5)) + [72, 60, 50, 42, 36]:
    buf = BytesIO()
    out.save(buf, format='JPEG', quality=q, optimize=True, subsampling=2)
    data = buf.getvalue()
    if best is None or len(data) < len(best[1]) or (len(data) <= max_bytes and (best[0] < q or len(best[1]) > max_bytes)):
        if best is None or len(data) <= max_bytes or len(data) < len(best[1]):
            best = (q, data)
    if len(data) <= max_bytes:
        best = (q, data)
        break
open(dest, 'wb').write(best[1])
print(f'{len(best[1])} {best[0]}')
`;
  const r = spawnSync('python3', ['-c', py, srcPng, destJpg, String(WIDTH), String(HEIGHT), String(MAX_BYTES)], {
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error('JPEG-Kompression fehlgeschlagen: ' + (r.stderr || r.stdout));
  const [bytes, quality] = r.stdout.trim().split(/\s+/);
  return { bytes: Number(bytes), quality: Number(quality) };
}

async function waitSlide(page) {
  await page.waitForSelector('.f.on, .f.fehler', { timeout: 20000 });
  await page.evaluate(() => (document.fonts && document.fonts.ready) ? document.fonts.ready : null).catch(() => {});
  // Dashboard: auf Wetterkachel warten, aber nicht endlos
  const isDash = await page.evaluate(() => document.body.classList.contains('dash-on'));
  if (isDash) {
    await page.waitForSelector('.k.wetter, .d-body .k', { timeout: 10000 }).catch(() => {});
    await page.waitForSelector('.k.wetter .w-jetzt, .k.wetter .w-temp', { timeout: 8000 }).catch(() => {});
  }
  await page.waitForFunction(() => {
    const on = document.querySelector('.f.on') || document.body;
    return [...on.querySelectorAll('img')].every(img => img.complete);
  }, { timeout: 10000 }).catch(() => {});
  const video = page.locator('.f.on video');
  if (await video.count()) {
    await page.waitForFunction(() => {
      const v = document.querySelector('.f.on video');
      return v && v.readyState >= 2;
    }, { timeout: 8000 }).catch(() => {});
  }
  // kurz setzen lassen (Bestand, Schrift-Fit, Plakat-Bilder)
  await new Promise(r => setTimeout(r, 700));
}

async function main() {
  const auswahl = JSON.parse(fs.readFileSync(path.join(ROOT, 'auswahl.json'), 'utf8'));
  const ids = Array.isArray(auswahl.reihenfolge) ? auswahl.reihenfolge : [];
  if (!ids.length) throw new Error('auswahl.json hat keine reihenfolge');
  fs.mkdirSync(OUTDIR, { recursive: true });

  const { chromium } = resolvePlaywright();
  const execPath = fs.existsSync(CHROME) ? CHROME : undefined;
  const { server, base } = process.env.VORSCHAU_BASE
    ? { server: null, base: process.env.VORSCHAU_BASE.replace(/\/$/, '') }
    : await startServer();

  const browser = await chromium.launch({
    executablePath: execPath,
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    serviceWorkers: 'block',
  });
  await context.addInitScript(() => {
    try { document.documentElement.style.colorScheme = 'only light'; } catch (e) {}
  });

  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'tv-vorschau-'));
  const summary = [];
  try {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const page = await context.newPage();
      page.setDefaultTimeout(25000);
      const url = base + '/?folie=' + i + '&alle';
      process.stdout.write('[' + (i + 1) + '/' + ids.length + '] ' + id + ' … ');
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitSlide(page);
        const png = path.join(tmpDir, id + '.png');
        await page.screenshot({ path: png, type: 'png', animations: 'disabled' });
        const dest = path.join(OUTDIR, id + '.jpg');
        const { bytes, quality } = jpegCompress(png, dest);
        const ok = bytes <= MAX_BYTES;
        console.log((Math.round(bytes / 102.4) / 10) + ' KB, q=' + quality + (ok ? '' : '  WARNUNG: über ' + Math.round(MAX_BYTES / 1024) + ' KB'));
        summary.push({ id, bytes, quality, ok });
      } catch (err) {
        console.log('FEHLER: ' + err.message);
        summary.push({ id, error: String(err.message || err) });
      } finally {
        await page.close();
      }
    }

    // verwaiste Miniaturen entfernen (nur .jpg in diesem Ordner)
    const keep = new Set(ids.map(id => id + '.jpg'));
    for (const name of fs.readdirSync(OUTDIR)) {
      if (!name.endsWith('.jpg')) continue;
      if (!keep.has(name)) {
        fs.unlinkSync(path.join(OUTDIR, name));
        console.log('entfernt (nicht mehr in auswahl.json): ' + name);
      }
    }
  } finally {
    await browser.close();
    if (server) server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const failed = summary.filter(s => s.error);
  const oversized = summary.filter(s => s.bytes && !s.ok);
  if (failed.length) {
    console.error('Fehlgeschlagen: ' + failed.map(s => s.id).join(', '));
    process.exit(1);
  }
  if (oversized.length) {
    console.error('Über Größenlimit, aber geschrieben: ' + oversized.map(s => s.id + ' ' + s.bytes).join(', '));
  }
  console.log('Fertig: ' + summary.length + ' Vorschaubilder in assets/vorschau/');
}

main().catch(err => { console.error(err); process.exit(1); });
