'use strict';
/* CampManager v60: robust offline shell. Does not modify localStorage or IndexedDB. */
const CACHE_PREFIX = 'campmanager-';
const CACHE_NAME = 'campmanager-v60-offline-20261008';
const REQUIRED = ['./index.html'];
const OPTIONAL = [
  './', './manifest.webmanifest', './version.json',
  './logo.jpg', './logo-fallback.jpg', './top-banner.jpg',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Don't switch to this worker until the complete application HTML is stored.
    await cache.addAll(REQUIRED);
    await Promise.allSettled(OPTIONAL.map(url => cache.add(url)));
    // CampManager has its own update banner: wait for user's update action.
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function fetchNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone()).catch(() => {});
      return response;
    }
    return await cache.match(request) || await cache.match('./index.html') || response;
  } catch {
    return await cache.match(request) || await cache.match('./index.html') ||
      new Response('CampManager wurde noch nicht fuer die Offline-Nutzung gespeichert. Bitte einmal online oeffnen.', {
        status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}
      });
  }
}

async function fetchVersion(request) {
  // Don't return an out-of-date version result when online.
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(new Request(request, {cache: 'no-store'}));
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
