const CACHE='mestre-bordado-cache-v1';
const CORE=['/','/curso','/curso-completo.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.pathname.startsWith('/api/pexels')||url.pathname==='/'||url.pathname==='/curso'||url.pathname.endsWith('.html')||url.pathname.endsWith('.js')||url.hostname.includes('pexels.com')||url.hostname.includes('images.pexels.com')){
    e.respondWith(caches.open(CACHE).then(async cache=>{
      const cached=await cache.match(req);
      const network=fetch(req).then(res=>{try{cache.put(req,res.clone())}catch(e){}return res}).catch(()=>cached);
      return cached||network;
    }));
  }
});
