const VERSION = 'v56';
const CACHE = `campmanager-${VERSION}`;
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './version.json',
  './logo.jpg',
  './logo-fallback.jpg',
  './top-banner.jpg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

function patchIndexHtml(text) {
  let s = String(text || '');

  // App-Version / Datenmigration v55 -> v56
  s = s.replaceAll('<title>CampManager v55</title>', '<title>CampManager v56</title>');
  s = s.replaceAll('<span class="ver">v55</span>', '<span class="ver">v56</span>');
  s = s.replaceAll('const APP_VERSION=55;', 'const APP_VERSION=56;');
  s = s.replaceAll("const KEY='campmanager_complete_v55';", "const KEY='campmanager_complete_v56';");
  s = s.replaceAll("const OLD=['campmanager_complete_v54'", "const OLD=['campmanager_complete_v55','campmanager_complete_v54'");

  // Kfz: Übernachtungen wählen ausschließlich die Tarifstufe.
  // Personen-Auswahl hat keinen Einfluss auf den eigenen Kostenpunkt Auto.
  s = s.replace(
` const presence=personPresenceDatesForYear(p,y);presence.legacy.forEach(id=>legacyStayIds.add(id));
 const carPresenceNights=Math.min(365,presence.dates.length),carIndex=tierIndexByStayNumber(carPresenceNights);`,
` const carPresenceNights=Math.min(365,used),carIndex=tierIndexByStayNumber(carPresenceNights);`
  );

  s = s.replaceAll(
    'Kfz-Anwesenheit: ${num(b.carPresenceNights)} Nacht/Nächte – automatisch aus den ausgewählten Familienmitgliedern.',
    'Kfz-Tarifgrundlage: ${num(b.carPresenceNights)} Übernachtungen – automatisch aus den tatsächlichen Übernachtungen des Stellplatzes.'
  );
  s = s.replaceAll(
    'Auto ${money(b.carCost)} (${num(b.carPresenceNights)} Anwesenheitsnächte)',
    'Auto ${money(b.carCost)} (${num(b.carPresenceNights)} Übernachtungen als Tarifgrundlage)'
  );
  s = s.replaceAll(
    '<tr><td>Kfz-Anwesenheit</td><td class="r">${num(b.carPresenceNights)} Nacht/Nächte</td></tr>',
    '<tr><td>Kfz-Tarifgrundlage</td><td class="r">${num(b.carPresenceNights)} Übernachtungen</td></tr>'
  );
  s = s.replaceAll(
    'Kfz-Anwesenheit folgt automatisch den ausgewählten Personen im Aufenthalt. Die Übernachtungszahl bestimmt nur die Tarifstufe; keine Multiplikation pro Nacht.',
    'Die Kfz-Tarifstufe richtet sich ausschließlich nach den tatsächlichen Übernachtungen des Stellplatzes. Das Auto bleibt ein eigener Kostenpunkt und wird nicht unter Personen abgerechnet. Keine Multiplikation pro Nacht.'
  );
  s = s.replaceAll(
    "row('Kfz-Anwesenheit',`${num(b.carPresenceNights)} Nacht/Nächte`);",
    "row('Kfz-Tarifgrundlage',`${num(b.carPresenceNights)} Übernachtungen`);"
  );
  s = s.replaceAll(
    "paragraph('Kfz-Anwesenheit folgt automatisch den ausgewählten Personen im Aufenthalt. Die Übernachtungszahl bestimmt nur die Tarifstufe; der Tarifbetrag wird nicht pro Nacht multipliziert.');",
    "paragraph('Die Kfz-Tarifstufe richtet sich ausschließlich nach den tatsächlichen Übernachtungen des Stellplatzes. Das Auto bleibt ein eigener Kostenpunkt und wird nicht unter Personen abgerechnet. Der Tarifbetrag wird nicht pro Nacht multipliziert.');"
  );

  return s;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE).catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('campmanager-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function patchedNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(new Request(request, {cache:'no-store'}));
    if (!fresh || !fresh.ok) throw new Error('network');
    const type = fresh.headers.get('content-type') || '';
    if (!type.includes('text/html')) return fresh;
    const text = patchIndexHtml(await fresh.text());
    const response = new Response(text, {
      status: fresh.status,
      statusText: fresh.statusText,
      headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}
    });
    cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    const cached = await cache.match(request) || await cache.match('./index.html');
    if (!cached) return Response.error();
    const type = cached.headers.get('content-type') || '';
    if (!type.includes('text/html')) return cached;
    const text = patchIndexHtml(await cached.text());
    return new Response(text, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE), cached = await cache.match(request);
  const update = fetch(request).then(r => { if (r && r.ok) cache.put(request, r.clone()); return r; }).catch(() => null);
  return cached || (await update) || Response.error();
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(new Request(req,{cache:'no-store'})).catch(() => caches.match('./version.json')));
    return;
  }

  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    event.respondWith(patchedNavigation(req));
    return;
  }

  event.respondWith(staleWhileRevalidate(req));
});
