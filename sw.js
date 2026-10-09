'use strict';
/* CampManager v62 service worker.
   Preserves the current index.html and injects the v62 receipt/car-fix/PDF-attachments add-on.
   LocalStorage and IndexedDB are never modified here.
*/
const CACHE_PREFIX = 'campmanager-';
const CACHE_NAME = 'campmanager-v62-offline-20261009';
const REQUIRED = ['./index.html', './cost-receipts.js'];
const OPTIONAL = [
  './', './manifest.webmanifest', './version.json',
  './logo.jpg', './logo-fallback.jpg', './top-banner.jpg',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(REQUIRED);
    await Promise.allSettled(OPTIONAL.map(url => cache.add(url)));
    // Activate the update immediately; the open page changes on the next reload/reopen.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

async function injectAddon(response) {
  if (!response) return response;
  const type = response.headers.get('content-type') || '';
  // GitHub Pages can serve index.html as text/html; only transform HTML.
  if (!type.includes('text/html')) return response;

  const html = await response.text();
  const tag = '<script src="./cost-receipts.js?v=62"></script>';
  const transformed = html.includes('cost-receipts.js')
    ? html
    : (html.includes('</body>') ? html.replace('</body>', tag + '</body>') : html + tag);

  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.delete('Content-Length');
  return new Response(transformed, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function fetchNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(new Request(request, {cache:'no-store'}));
    if (response.ok) {
      await cache.put('./index.html', response.clone()).catch(() => {});
      return await injectAddon(response);
    }
    const cached = await cache.match('./index.html') || await cache.match(request);
    return cached ? await injectAddon(cached) : response;
  } catch {
    const cached = await cache.match('./index.html') || await cache.match(request);
    if (cached) return await injectAddon(cached);
    return new Response(
      'CampManager wurde noch nicht fuer die Offline-Nutzung gespeichert. Bitte einmal online oeffnen.',
      {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}}
    );
  }
}

async function fetchVersion(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(new Request(request, {cache:'no-store'}));
    if (response.ok) await cache.put('./version.json', response.clone()).catch(() => {});
    return response;
  } catch {
    return await cache.match('./version.json') || Response.error();
  }
}

async function fetchAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const stored = await cache.match(request);
  if (stored) return stored;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetchVersion(request));
  } else if (request.mode === 'navigate' || /\/index\.html$/.test(url.pathname)) {
    event.respondWith(fetchNavigation(request));
  } else {
    event.respondWith(fetchAsset(request));
  }
});
