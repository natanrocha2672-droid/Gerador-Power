window.addEventListener('load',function(){
  try{
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw-cache.js?v=2');
    var saved=localStorage.getItem('cursoSnapshotHtml');
    setTimeout(function(){
      try{
        localStorage.setItem('cursoSnapshotHtml',document.documentElement.outerHTML);
        localStorage.setItem('cursoSnapshotAt',new Date().toISOString());
        var n=document.createElement('div');
        n.style.cssText='max-width:1160px;margin:10px auto;padding:10px 16px;background:#e8f7ff;border:1px solid #9ed8f2;border-radius:14px;color:#17435a;font-weight:700';
        n.textContent='💾 Curso salvo neste navegador após a primeira abertura.';
        var ref=document.querySelector('.notice')||document.body.firstChild;
        if(ref&&ref.parentNode&&!document.getElementById('saveNotice')){n.id='saveNotice';ref.parentNode.insertBefore(n,ref.nextSibling)}
      }catch(e){}
    },4000);
  }catch(e){}
});
