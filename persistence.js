(()=>{
  const APP='mestre-bordado-v1';
  const safeSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const safeGet=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
  function addNotice(text){
    if(document.getElementById('saveNotice'))return;
    const n=document.createElement('div');
    n.id='saveNotice';
    n.style.cssText='max-width:1160px;margin:10px auto 0;padding:10px 16px;background:#e8f7ff;border:1px solid #9ed8f2;border-radius:14px;color:#17435a;font-weight:700';
    n.textContent=text;
    const ref=document.querySelector('.notice')||document.querySelector('.hero');
    if(ref&&ref.parentNode)ref.parentNode.insertBefore(n,ref.nextSibling);
  }
  function imgHtml(img,title){return `<img src="${img.url}" alt="${String(img.alt||title||'Imagem do curso').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}">`}
  function applyImage(i,img){
    if(!img||!img.url)return;
    const m=(window.modules||[])[i]||{};
    const html=imgHtml(img,m.title);
    const box=document.getElementById('img'+i); if(box)box.innerHTML=html;
    const cr=document.getElementById('cr'+i); if(cr)cr.textContent='Foto salva: '+(img.photographer||'Pexels/cache');
    if(i<6){const g=document.getElementById('gal'+i); if(g)g.innerHTML=html+`<span>${m.title||''}</span>`}
    if(i===0){const hero=document.getElementById('heroImage'); if(hero)hero.innerHTML=html;}
  }
  async function persistCourse(){
    const mods=Array.isArray(window.modules)?window.modules:[];
    if(!mods.length)return;
    safeSet(APP+':modules',mods.map(m=>({id:m.id,title:m.title,summary:m.summary,content:m.content,query:m.query,imageDescription:m.imageDescription})));
    safeSet(APP+':savedAt',new Date().toISOString());
    addNotice('💾 Curso salvo neste navegador. Depois da primeira abertura, módulos e imagens já carregadas ficam guardados localmente.');
    const cachedImages=safeGet(APP+':images')||{};
    mods.forEach((m,i)=>{if(cachedImages[m.query])applyImage(i,cachedImages[m.query])});
    for(let i=0;i<mods.length;i++){
      const m=mods[i]; if(!m||!m.query)continue;
      if(cachedImages[m.query])continue;
      try{
        const r=await fetch('/api/pexels?query='+encodeURIComponent(m.query)+'&per_page=1',{cache:'force-cache'});
        if(!r.ok)continue;
        const j=await r.json();
        const img=j&&j.images&&j.images[0];
        if(img&&img.url){
          cachedImages[m.query]=img;
          safeSet(APP+':images',cachedImages);
          applyImage(i,img);
          try{ await fetch(img.url,{mode:'no-cors',cache:'force-cache'}); }catch(e){}
        }
      }catch(e){}
    }
  }
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw-cache.js?v=1').catch(()=>{});
  }
  const oldGo=window.go;
  if(typeof oldGo==='function'){
    window.go=function(i){safeSet(APP+':lastModule',i);return oldGo(i)};
  }
  setTimeout(persistCourse,500);
})();
