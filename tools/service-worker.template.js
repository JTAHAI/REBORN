/* Browser-only cache. This is NOT a server-side Cloudflare Worker. */
'use strict';
const SCOPE=new URL(self.registration.scope);
const PREFIX='995-reborn-'+encodeURIComponent(self.registration.scope)+'-';
const LEGACY_PREFIX='995-reborn-'+encodeURIComponent(SCOPE.pathname)+'-';
const CACHE=PREFIX+'pass07-navfix1-__BUILD_ID__';
const SHELL=__SHELL__;
const ENTRY=new URL('./index.html',SCOPE).href;
const URLS=new Set(SHELL.map(p=>new URL(p,SCOPE).href));

// Static hosts commonly redirect /play/index.html to /play/. A fetch/cache
// response keeps that redirect history. Chrome rejects it for a navigation
// whose redirect mode is "manual", producing ERR_FAILED before HTML loads.
// Rebuild only readable redirected responses; clone() retains the bad metadata.
function navigationResponse(response){
 return response.redirected ? new Response(response.body,{
  status:response.status,statusText:response.statusText,headers:response.headers
 }) : response;
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // Activation fails on any missing asset; never install a half-updated town.
 await cache.addAll(SHELL.map(p=>new Request(new URL(p,SCOPE),{cache:'reload'})));
 const entry=await cache.match(ENTRY);
 if(!entry||!entry.ok)throw new Error('The offline game entry is missing');
 if(entry.redirected)await cache.put(ENTRY,navigationResponse(entry));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 // Both historical naming formats, restricted to this exact game scope.
 // Never remove other apps' or root-site caches, localStorage or IndexedDB.
 await Promise.all((await caches.keys()).filter(k=>
  (k.startsWith(PREFIX)||k.startsWith(LEGACY_PREFIX))&&k!==CACHE
 ).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 const entry=request.mode==='navigate'&&(url.pathname===SCOPE.pathname||url.pathname===SCOPE.pathname+'index.html');
 url.search='';url.hash='';if(!entry&&!URLS.has(url.href))return;
 event.respondWith((async()=>{
  const key=entry?ENTRY:url.href;
  let cache,cached;
  try{cache=await caches.open(CACHE);cached=await cache.match(key);}catch(_error){/* Online loading must survive unavailable cache storage. */}
  // The HTML and model/world come from ONE completed version, even mid-deployment.
  // Defend on reads too, including old redirected responses recovered from disk.
  if(cached)return entry?navigationResponse(cached):cached;
  const response=await fetch(request);
  const result=entry?navigationResponse(response):response;
  if(cache&&result.ok&&result.type!=='opaque'){
   try{await cache.put(key,result.clone());}catch(_error){/* Quota/write failure must not discard a valid network response. */}
  }
  return result;
 })());
});
