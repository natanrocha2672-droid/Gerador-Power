(()=>{
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
  function pad(n){return String(n).padStart(2,'0')}
  function fallbackArt(title){return `<div style="height:100%;display:flex;align-items:end;padding:16px;color:white;font-weight:900;background:radial-gradient(circle at 70% 20%,#fff5,transparent 26%),linear-gradient(135deg,#e7d5bf,#c85a42,#0f5f4d);text-shadow:0 2px 8px #000">${esc(title)}</div>`}
  function apostila(m){return `${m.content}\n\nSugestão visual do módulo:\n${m.imageDescription||'Imagem de bordado relacionada ao tema.'}\n\nPrática guiada:\n1. Leia o resumo do módulo.\n2. Escolha uma amostra pequena.\n3. Separe materiais antes de começar.\n4. Teste em retalho.\n5. Fotografe frente, detalhe e avesso.\n\nPergunte ao Professor do Bordado se quiser uma explicação passo a passo deste módulo.`}
  function renderImportedCourse(){
    const data=window.COURSE_MODULES;
    if(!Array.isArray(data)||!data.length)return;
    window.IMPORTED_COURSE_MODULES=data;
    const nav=$('nav'), gallery=$('gallery'), mods=$('mods'), nowTitle=$('nowTitle'), nowText=$('nowText');
    if(!nav||!gallery||!mods)return;
    nav.innerHTML=data.map((m,i)=>`<button onclick="window.importGo(${i})"><b>${pad(m.id)}</b> ${esc(m.title)}</button>`).join('');
    gallery.innerHTML=data.slice(0,6).map((m,i)=>`<div class="gal" id="importGal${i}">${fallbackArt(m.title)}</div>`).join('');
    mods.innerHTML=data.map((m,i)=>`<article class="card" id="importM${i}"><header><span class="badge">Módulo ${pad(m.id)}</span><h2>${esc(m.title)}</h2></header><div class="moduleImage" id="importImg${i}">${fallbackArt(m.title)}</div><p>${esc(m.summary)}</p><button class="btn green" onclick="window.importSpeak(${i},this)">▶ Ouvir este módulo</button><button class="btn" style="margin-left:8px" onclick="window.importAsk(${i})">💬 Perguntar ao professor</button><div class="cards3"><div class="box"><b>Conteúdo do HTML</b><p>Este módulo foi importado do arquivo Mestre do Bordado.</p></div><div class="box"><b>Imagem Pexels</b><p>${esc((m.imageQueries||[])[0]||m.imageDescription)}</p></div><div class="box"><b>Professor</b><p>Use o chat para tirar dúvidas contextualizadas.</p></div></div><details><summary>Abrir apostila importada</summary><div class="apostila">${esc(apostila(m))}</div></details><div class="credit" id="importCr${i}"></div></article>`).join('');
    window.importCur=0;
    function update(i){const m=data[i];window.importCur=i;if(nowTitle)nowTitle.textContent=`Módulo ${pad(m.id)} — ${m.title}`;if(nowText)nowText.textContent=m.summary;const bar=$('bar'),pct=$('pct');if(bar)bar.style.width=Math.round((i+1)/data.length*100)+'%';if(pct)pct.textContent=Math.round((i+1)/data.length*100)+'%'}
    window.importGo=(i)=>{update(i);document.getElementById('importM'+i)?.scrollIntoView({behavior:'smooth',block:'start'})};
    window.importAsk=(i)=>{update(i);document.getElementById('teacherChatFab')?.click();setTimeout(()=>{const input=document.getElementById('teacherInput');if(input){input.value='Explique este módulo usando o conteúdo importado do HTML e me dê um exercício prático.';input.focus()}},250)};
    window.importSpeak=async(i,btn)=>{update(i);const m=data[i];if(window.stopCurrentAudio)window.stopCurrentAudio();try{if(btn)btn.textContent='Gerando áudio...';const text=`Módulo ${m.id}. ${m.title}. ${m.summary}. ${m.content}`.slice(0,3900);const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice:'coral',speed:.95})});if(!r.ok)throw new Error('tts');const b=await r.blob();const url=URL.createObjectURL(b);const audio=new Audio(url);window.importAudio&&window.importAudio.pause();window.importAudio=audio;audio.onended=()=>{URL.revokeObjectURL(url);if(btn)btn.textContent='▶ Ouvir este módulo'};await audio.play();if(btn)btn.textContent='Reproduzindo...'}catch(e){if(btn)btn.textContent='▶ Ouvir este módulo';alert('Narração indisponível agora.')}};
    update(0);
    loadImages(data);
  }
  async function loadImages(data){
    for(let i=0;i<data.length;i++){
      const m=data[i];
      const queries=[...(m.imageQueries||[]),m.imageDescription,m.title].filter(Boolean);
      (async()=>{
        for(const q of queries){
          try{
            const r=await fetch('/api/pexels?query='+encodeURIComponent(q)+'&per_page=1');
            if(!r.ok)continue;
            const j=await r.json();
            const img=j.images&&j.images[0];
            if(img&&img.url){
              const html=`<img src="${img.url}" alt="${esc(img.alt||m.title)}">`;
              const box=$('importImg'+i); if(box)box.innerHTML=html;
              const cr=$('importCr'+i); if(cr)cr.textContent='Foto: '+(img.photographer||'Pexels')+' • busca: '+q.slice(0,80);
              if(i<6){const g=$('importGal'+i); if(g)g.innerHTML=`<img src="${img.url}" alt=""><span>${esc(m.title)}</span>`}
              if(i===0){const hero=$('heroImage'); if(hero)hero.innerHTML=html;}
              return;
            }
          }catch(e){}
        }
      })();
    }
  }
  const s=document.createElement('script');
  s.src='/curso-html-data.js?v=html-import-1';
  s.onload=renderImportedCourse;
  document.head.appendChild(s);
})();
