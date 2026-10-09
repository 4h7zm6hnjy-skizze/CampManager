'use strict';
/* CampManager v65 Service Worker
   - keine HTML-/Script-Injektion mehr
   - Navigation und version.json immer zuerst aus dem Netz
   - alte CampManager-Caches werden beim Aktivieren entfernt
*/
const VERSION='v65';
const CACHE=`campmanager-${VERSION}-20261009`;
const CORE=['./','./index.html','./manifest.webmanifest','./version.json','./logo.jpg','./logo-fallback.jpg','./top-banner.jpg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(CORE.map(url=>cache.add(new Request(url,{cache:'reload'}))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('campmanager-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

async function networkFirst(request,fallback='./index.html'){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(new Request(request,{cache:'no-store'}));
    if(response&&response.ok)await cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(err){
    return await cache.match(request)||await cache.match(fallback)||Response.error();
  }
}

async function versionNetworkFirst(request){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(new Request(request,{cache:'no-store'}));
    if(response&&response.ok)await cache.put('./version.json',response.clone()).catch(()=>{});
    return response;
  }catch(err){
    return await cache.match('./version.json')||Response.error();
  }
}

async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  const update=fetch(request).then(async response=>{
    if(response&&response.ok)await cache.put(request,response.clone()).catch(()=>{});
    return response;
  }).catch(()=>null);
  return cached||await update||Response.error();
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/version.json')){event.respondWith(versionNetworkFirst(request));return;}
  if(request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/')){event.respondWith(networkFirst(request));return;}
  event.respondWith(staleWhileRevalidate(request));
});
