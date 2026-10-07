const VERSION = 'v59';
const CACHE = `campmanager-${VERSION}`;
const CORE=['./','./index.html','./manifest.webmanifest','./version.json','./logo.jpg','./logo-fallback.jpg','./top-banner.jpg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{}))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('campmanager-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
async function networkFirst(req){const c=await caches.open(CACHE);try{const r=await fetch(new Request(req,{cache:'no-store'}));if(r?.ok)c.put(req,r.clone());return r}catch{return await c.match(req)||await c.match('./index.html')}}
async function swr(req){const c=await caches.open(CACHE),hit=await c.match(req);const up=fetch(req).then(r=>{if(r?.ok)c.put(req,r.clone());return r}).catch(()=>null);return hit||await up||Response.error()}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(u.origin!==self.location.origin)return;if(u.pathname.endsWith('/version.json')){e.respondWith(fetch(new Request(req,{cache:'no-store'})).catch(()=>caches.match('./version.json')));return}if(req.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/')){e.respondWith(networkFirst(req));return}e.respondWith(swr(req))});
