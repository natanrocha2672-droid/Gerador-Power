(()=>{
  const APP='mestre-bordado-v2';
  const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const get=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
  const ids=['nav','gallery','mods','heroImage','nowTitle','nowText','pct'];
  function addNotice(text){
    let n=document.getElementById('saveNotice');
    if(!n){
      n=document.createElement('div');
      n.id='saveNotice';
      n.style.cssText='max-width:1160px;margin:10px auto 0;padding:10px 16px;background:#e8f7ff;border:1px solid #9ed8f2;border-radius:14px;color:#17435a;font-weight:700';
      const ref=document.querySelector('.notice')||document.querySelector('.hero');
      if(ref&&ref.parentNode)ref.parentNode.insertBefore(n,ref.nextSibling);
    }
    n.textContent=text;
  }
  function snapshot(){
    const data={time:new Date().toISOString(),html:{},lastScroll:window.scrollY};
    ids.forEach(id=>{const el=document.getElementById(id);if(el)data.html[id]=el.innerHTML});
    data.cards=[...document.querySelectorAll('.card')].map(card=>card.outerHTML);
    set(APP+':snapshot',data);
    addNotice('💾 Curso salvo neste navegador. Na próxima abertura, o conteúdo e as imagens já carregadas serão restaurados automaticamente.');
  }
  function restore(){
    const data=get(APP+':snapshot');
    if(!data||!data.html)return false;
    ids.forEach(id=>{const el=document.getElementById(id);if(el&&data.html[id])el.innerHTML=data.html[id]});
    addNotice('✅ Conteúdo restaurado do armazenamento local deste navegador.');
    return true;
  }
  function savePeriodically(){
    setTimeout(snapshot,2500);
    setTimeout(snapshot,7000);
    setInterval(snapshot,30000);
  }
  if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw-cache.js?v=2').catch(()=>{});}
  window.addEventListener('load',()=>{setTimeout(restore,200);savePeriodically();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')snapshot();});
})();
