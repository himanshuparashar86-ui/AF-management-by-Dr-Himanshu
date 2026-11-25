const CACHE='heartline-af-v19';
const ASSETS=['./','./index.html','./styles.css','./app.js','./core.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
const NETWORK_TIMEOUT_MS=4500;
async function fetchWithTimeout(request){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),NETWORK_TIMEOUT_MS);
  try{return await fetch(new Request(request,{signal:controller.signal}));}
  finally{clearTimeout(timeout);}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached){
      event.waitUntil(fetchWithTimeout(event.request).then(async response=>{
        if(response&&response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}
      }).catch(()=>{}));
      return cached;
    }
    try{
      const response=await fetchWithTimeout(event.request);
      if(response&&response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}
      return response;
    }catch(error){
      if(event.request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
      return Response.error();
    }
  })());
});
