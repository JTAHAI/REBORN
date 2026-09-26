/* Browser-only cache. This is NOT a server-side Cloudflare Worker. */
'use strict';
const PREFIX='995-reborn-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'pass04-__BUILD_ID__';
const SHELL=__SHELL__;
const SCOPE=new URL(self.registration.scope),ENTRY=new URL('./index.html',SCOPE).href;
const URLS=new Set(SHELL.map(p=>new URL(p,SCOPE).href));
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // Activation fails on any missing asset; never install a half-updated town.
 await cache.addAll(SHELL.map(p=>new Request(new URL(p,SCOPE),{cache:'reload'})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 // Own-scope legacy caches only. Never remove other apps' or root-site caches.
 await Promise.all((await caches.keys()).filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 const entry=request.mode==='navigate'&&(url.pathname===SCOPE.pathname||url.pathname===SCOPE.pathname+'index.html');
 url.search='';url.hash='';if(!entry&&!URLS.has(url.href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),key=entry?ENTRY:url.href,cached=await cache.match(key);
  // The HTML and model/world come from ONE completed version, even mid-deployment.
  if(cached)return cached;
  const response=await fetch(request);if(response.ok&&response.type!=='opaque')await cache.put(key,response.clone());return response;
 })());
});
