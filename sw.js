'use strict';
/* CampManager v64 service worker
   - erzwingt das aktuelle v64-Add-on
   - ersetzt alte v61/v62/v63 Add-on-Script-Tags
   - cache-bustet cost-receipts.js
*/
const CACHE_PREFIX='campmanager-';
const CACHE_NAME='campmanager-v64-offline-20261009';
const ADDON='./cost-receipts.js?v=64';
const REQUIRED=['./index.html',ADDON];
const OPTIONAL=['./','./manifest.webmanifest','./version.json','./logo.jpg','./logo-fallback.jpg','./top-banner.jpg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(REQUIRED);
    await Promise.allSettled(OPTIONAL.map(u=>cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(n=>n.startsWith(CACHE_PREFIX)&&n!==CACHE_NAME).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});

async function injectAddon(response){
  if(!response)return response;
  let html=await response.text();
  // Alte oder doppelte Add-on-Tags entfernen, danach exakt v64 einsetzen.
  html=html.replace(/<script[^>]+src=["'][^"']*cost-receipts\.js[^"']*["'][^>]*>\s*<\/script>/gi,'');
  const tag='<script src="./cost-receipts.js?v=64"></script>';
  const transformed=html.includes('</body>')?html.replace('</body>',tag+'</body>'):html+tag;
  const headers=new Headers(response.headers);
  headers.set('Content-Type','text/html; charset=utf-8');
  headers.delete('Content-Length');
  return new Response(transformed,{status:response.status,statusText:response.statusText,headers});
}

async function navigation(request){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(new Request(request,{cache:'no-store'}));
    if(response.ok){
      await cache.put('./index.html',response.clone()).catch(()=>{});
      return injectAddon(response)
    }
    const cached=await cache.match('./index.html')||await cache.match(request);
    return cached?injectAddon(cached):response;
  }catch{
    const cached=await cache.match('./index.html')||await cache.match(request);
    if(cached)return injectAddon(cached);
    return new Response('CampManager ist offline noch nicht gespeichert. Bitte einmal online öffnen.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
}

async function versionRequest(request){
  const cache=await caches.open(CACHE_NAME);
  try{
    const r=await fetch(new Request(request,{cache:'no-store'}));
    if(r.ok)await cache.put('./version.json',r.clone()).catch(()=>{});
    return r
  }catch{
    return await cache.match('./version.json')||Response.error()
  }
}

async function addonRequest(request){
  const cache=await caches.open(CACHE_NAME);
  try{
    const r=await fetch(new Request(request,{cache:'no-store'}));
    if(r.ok)await cache.put(request,r.clone()).catch(()=>{});
    return r
  }catch{
    return await cache.match(request)||await cache.match(ADDON)||Response.error()
  }
}

async function asset(request){
  const cache=await caches.open(CACHE_NAME),stored=await cache.match(request);
  if(stored)return stored;
  try{
    const r=await fetch(request);
    if(r.ok)await cache.put(request,r.clone()).catch(()=>{});
    return r
  }catch{
    return Response.error()
  }
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/version.json'))event.respondWith(versionRequest(req));
  else if(url.pathname.endsWith('/cost-receipts.js'))event.respondWith(addonRequest(req));
  else if(req.mode==='navigate'||/\/index\.html$/.test(url.pathname))event.respondWith(navigation(req));
  else event.respondWith(asset(req));
});
