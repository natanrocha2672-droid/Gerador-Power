(()=>{
  const APP='mestre-bordado-full-v1';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  const raw=window.COURSE_MODULES_FULL||window.COURSE_MODULES||[];
  const fallbackTitles=[
    'Bordado Brasileiro: Fios de Seda e Flora Tridimensional','Rendas de Agulha e Ponto de Veneza','Conservação e Restauro de Têxteis Históricos','Design de Padrões e Cartografia do Ponto','Digitalização e Bordado Computadorizado'
  ];
  const modules=raw.map((m,i)=>({
    id:m.id||i+1,
    title:(m.title||fallbackTitles[i-18]||('Módulo '+(i+1))).replace(/^Curso de Bordado - /,''),
    summary:m.summary||String(m.content||'').slice(0,280),
    content:cleanContent(m.content||m.summary||''),
    imageDescription:m.imageDescription||'',
    imageQueries:Array.isArray(m.imageQueries)?m.imageQueries:[m.imageQueries||m.imageDescription||m.title||'embroidery']
  }));
  function cleanContent(t){
    t=String(t||'').replace(/<[^>]+>/g,' ').replace(/\s+\n/g,'\n').trim();
    if(/Ocorreu um erro ao gerar|Unexpected end/i.test(t)||t.length<500){
      return t+'\n\nEste módulo veio incompleto no HTML original. O chat professor pode expandir a aula a partir do título e da descrição visual, e a próxima versão pode substituir este bloco por conteúdo revisado manualmente.';
    }
    return t;
  }
  let cur=Number(localStorage.getItem(APP+':last')||0)||0;
  let audio=null,audioUrl=null;
  function fallback(t){return `<div class="fallbackLabel">${esc(t)}</div>`}
  function update(){
    const m=modules[cur]; if(!m)return;
    $('nowTitle').textContent=`Módulo ${pad(m.id)} — ${m.title}`;
    $('nowText').textContent=m.summary;
    $('bar').style.width=Math.round((cur+1)/modules.length*100)+'%';
    $('pct').textContent=Math.round((cur+1)/modules.length*100)+'%';
    localStorage.setItem(APP+':last',String(cur));
  }
  function render(){
    if(!modules.length){$('nowTitle').textContent='Curso não encontrado';$('nowText').textContent='O arquivo curso-html-data.js não carregou.';return;}
    $('status').textContent='Curso completo carregado do HTML enviado • '+modules.length+' módulos';
    $('nav').innerHTML=modules.map((m,i)=>`<button onclick="go(${i})"><b>${pad(m.id)}</b> ${esc(m.title)}</button>`).join('');
    $('gallery').innerHTML=modules.slice(0,6).map((m,i)=>`<div class="gal" id="gal${i}">${fallback(m.title)}</div>`).join('');
    $('mods').innerHTML=modules.map((m,i)=>`<article class="card" id="m${i}">
      <header><span class="badge">Módulo ${pad(m.id)}</span><h2>${esc(m.title)}</h2></header>
      <div class="moduleImage" id="img${i}">${fallback(m.title)}</div>
      <p>${esc(m.summary)}</p>
      <div class="moduleActions"><button class="btn green" onclick="speak(${i},this)">▶ Ouvir este módulo</button><button class="btn" onclick="askModule(${i})">💬 Perguntar ao professor</button><button class="btn dark" onclick="loadOneImage(${i},true)">↻ Buscar imagem</button></div>
      <div class="cards3"><div class="box"><b>Apostila completa</b><p>${m.content.length.toLocaleString('pt-BR')} caracteres importados do HTML.</p></div><div class="box"><b>Busca Pexels</b><p>${esc((m.imageQueries||[])[0]||m.imageDescription)}</p></div><div class="box"><b>Salvamento</b><p>Texto e imagens carregadas ficam salvos neste navegador.</p></div></div>
      <details open><summary>Abrir apostila completa</summary><div class="apostila">${esc(m.content)}</div></details>
      <details><summary>Descrições de imagem do HTML</summary><div class="apostila">${esc(m.imageDescription||m.imageQueries.join('\n'))}</div></details>
      <div class="credit" id="cr${i}"></div>
    </article>`).join('');
    update(); loadSavedImages(); loadImages();
  }
  window.go=i=>{cur=i;update();$('m'+i)?.scrollIntoView({behavior:'smooth',block:'start'});};
  $('search').oninput=()=>{const v=$('search').value.toLowerCase();document.querySelectorAll('.card').forEach((el,i)=>{const m=modules[i];el.style.display=(m.title+' '+m.content).toLowerCase().includes(v)?'block':'none';});};
  function stopAudio(){if(audio){audio.pause();audio.src='';audio=null}if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null}$('status').textContent='Áudio parado.';}
  window.speak=async(i,btn)=>{stopAudio();cur=i;update();try{btn.textContent='Gerando áudio...';$('status').textContent='Gerando narração...';const m=modules[i];const text=(m.title+'\n\n'+m.summary+'\n\n'+m.content).slice(0,3900);const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice:'coral',speed:.95})});if(!r.ok)throw new Error(await r.text());const b=await r.blob();audioUrl=URL.createObjectURL(b);audio=new Audio(audioUrl);audio.onended=()=>{btn.textContent='▶ Ouvir este módulo';$('status').textContent='Narração finalizada.'};await audio.play();btn.textContent='Reproduzindo...';$('status').textContent='Reproduzindo: módulo '+(i+1);}catch(e){btn.textContent='▶ Ouvir este módulo';$('status').textContent='Narração indisponível agora.';}};
  $('listenTop').onclick=()=>window.speak(cur,$('listenTop'));
  $('stopBtn').onclick=stopAudio;
  function imgCache(){try{return JSON.parse(localStorage.getItem(APP+':images')||'{}')}catch(e){return {}}}
  function saveImgCache(c){try{localStorage.setItem(APP+':images',JSON.stringify(c))}catch(e){}}
  function applyImage(i,img,query){const m=modules[i]; if(!img||!img.url)return;const html=`<img src="${img.url}" alt="${esc(img.alt||m.title)}">`;$('img'+i).innerHTML=html;$('cr'+i).textContent='Foto: '+(img.photographer||'Pexels')+(query?' • busca: '+query:'');if(i<6)$('gal'+i).innerHTML=html+`<span>${esc(m.title)}</span>`;if(i===0)$('heroImage').innerHTML=html;}
  function loadSavedImages(){const cache=imgCache();modules.forEach((m,i)=>{const k=m.imageQueries[0]||m.title;if(cache[k])applyImage(i,cache[k],k);});}
  window.loadOneImage=async(i,force=false)=>{const m=modules[i],cache=imgCache();for(const q of [...m.imageQueries,m.imageDescription,m.title].filter(Boolean)){if(!force&&cache[q]){applyImage(i,cache[q],q);return true;}try{const r=await fetch('/api/pexels?query='+encodeURIComponent(q)+'&per_page=1');if(!r.ok){$('cr'+i).textContent='Pexels: '+await r.text();continue;}const j=await r.json();const img=j.images&&j.images[0];if(img&&img.url){cache[q]=img;saveImgCache(cache);applyImage(i,img,q);return true;}}catch(e){$('cr'+i).textContent='Erro ao buscar imagem.';}}return false;};
  function loadImages(){modules.forEach((_,i)=>setTimeout(()=>loadOneImage(i),i*120));}
  $('chatFab').onclick=()=>{$('chatBox').classList.add('open');if(!$('chatMsgs').dataset.started){addBot('Olá! Sou o professor do curso. Pergunte sobre o módulo selecionado e eu respondo usando o conteúdo desta apostila.');$('chatMsgs').dataset.started=1;}};
  function addBot(t){let d=document.createElement('div');d.className='msg bot';d.textContent=t;$('chatMsgs').appendChild(d);$('chatMsgs').scrollTop=$('chatMsgs').scrollHeight;return d;}
  function addUser(t){let d=document.createElement('div');d.className='msg user';d.textContent=t;$('chatMsgs').appendChild(d);$('chatMsgs').scrollTop=$('chatMsgs').scrollHeight;}
  window.askModule=i=>{go(i);$('chatFab').click();$('chatInput').value='Explique este módulo e me dê um exercício prático.';$('chatInput').focus();};
  $('chatForm').onsubmit=async e=>{e.preventDefault();const q=$('chatInput').value.trim();if(!q)return;$('chatInput').value='';addUser(q);const wait=addBot('Pensando como professor...');const m=modules[cur];try{const r=await fetch('/api/atelier',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'tutor',level:'iniciante',prompt:q,module:{title:m.title,summary:m.summary,objective:m.content.slice(0,1200),exercise:'amostra em retalho'}})});const j=await r.json();wait.textContent=r.ok?(j.text||'Não consegui responder agora.'):(j.error||'Erro no professor.');}catch(err){wait.textContent='Não consegui conectar ao professor agora.';}};
  render();
})();
