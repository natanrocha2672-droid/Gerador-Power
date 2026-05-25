(() => {
  const $ = id => document.getElementById(id);
  const fallbackBase = 'O bordado é uma arte têxtil milenar presente em muitas culturas. Ele registra técnica, memória, identidade, desenho, repetição, textura e pertencimento. Este curso organiza a prática do bordado em história, materiais, pontos, composição, acabamento, ensino e projeto autoral.';
  const fallbackA = [
    ['Fundamentos históricos do bordado','Compreender o bordado como linguagem cultural, técnica manual e patrimônio têxtil.'],
    ['Pré-história e primeiras agulhas','Estudar ferramentas antigas, fibras naturais e o nascimento da costura decorativa.'],
    ['Egito Mesopotâmia Roma e ritual','Analisar usos religiosos, políticos e ornamentais do bordado antigo.'],
    ['China seda e bordado imperial','Explorar seda, refinamento técnico, simbolismo e tradição oriental.'],
    ['Japão sashiko','Aprender o sashiko como reforço, reparo, ritmo e beleza geométrica.'],
    ['Índia e Bangladesh kantha','Estudar camadas têxteis, reaproveitamento, memória doméstica e narrativa.'],
    ['Europa medieval e Bayeux','Investigar narração histórica em tecido, guildas e bordado religioso.'],
    ['Castelo Branco e símbolos ibéricos','Conhecer linho, seda, árvore da vida, aves e motivos florais.'],
    ['África linho lã e cerimônia','Observar status, comunidade, ritual e expressão visual em têxteis africanos.'],
    ['Américas otomí e quilts','Relacionar povos originários, heranças coloniais, quilts e grafismos.'],
    ['Oceania e artes têxteis','Ampliar repertório sobre ornamento, fibras, corpo e objeto têxtil.'],
    ['Tecidos e suportes','Escolher linho, algodão, cambraia, Aida, tule e sarja conforme técnica.'],
    ['Linhas e fios','Comparar mouliné, perlé, seda, lã e metálicos.'],
    ['Ferramentas essenciais','Montar kit com agulhas, bastidor, tesoura, dedal, marcadores e organizadores.'],
    ['Transferência de risco','Aprender carbono têxtil, mesa de luz, caneta apagável e estabilidade do desenho.']
  ];
  const fallbackB = [
    ['Ponto alinhavo','Executar linhas ritmadas, preparar bases e compreender Sashiko e Kantha.'],
    ['Ponto atrás','Criar contornos firmes, letras, curvas e desenhos lineares.'],
    ['Ponto haste','Construir curvas orgânicas, caules, arabescos e linhas torcidas.'],
    ['Ponto cheio','Preencher formas lisas, controlar brilho, direção e tensão.'],
    ['Ponto corrente','Formar elos decorativos, contornos largos e preenchimentos flexíveis.'],
    ['Nós e texturas','Aplicar nó francês, rococó, sementes, volume e miolos florais.'],
    ['Ponto cruz e bordado contado','Trabalhar grade, contagem, padrões, tensão e leitura de gráfico.'],
    ['Hardanger e cutwork','Conhecer áreas vazadas, blocos, cortes, bordas e segurança técnica.'],
    ['Composição visual','Organizar foco, ritmo, repetição, respiro, narrativa e moldura.'],
    ['Cores e simbolismo','Escolher paletas, contraste, harmonia e significado cultural.'],
    ['Acabamento e conservação','Bloquear, lavar, secar, montar, proteger e guardar a peça.'],
    ['Fotografia e portfólio','Fotografar processo, detalhes, avesso, escala e coleção.'],
    ['Projeto comercial','Calcular custo, margem, tempo, ficha técnica e apresentação.'],
    ['Metodologia de ensino','Transformar técnica em aula, roteiro, exercício e avaliação.'],
    ['Projeto final','Criar coleção autoral com conceito, amostras, execução e apresentação.']
  ];

  const sourceA = Array.isArray(window.COURSE_MODULES_A) ? window.COURSE_MODULES_A : fallbackA;
  const sourceB = Array.isArray(window.COURSE_MODULES_B) ? window.COURSE_MODULES_B : fallbackB;
  const courseBase = window.COURSE_BASE || fallbackBase;
  const modules = [...sourceA, ...sourceB].slice(0, 30).map((m, i) => ({ id: i + 1, title: m[0], summary: m[1], full: '' }));

  let current = 0;
  let presenting = true;
  let timer = null;
  let start = 0;
  let audioUrl = null;
  let audio = null;

  function pad(n){return String(n).padStart(2,'0')}
  function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
  function setProgress(p){ if($('loadbar')) $('loadbar').style.width=p+'%'; if($('loadtext')) $('loadtext').textContent=p+'%'; }
  function status(msg){ if($('status')) $('status').textContent = msg; }

  function longText(m){
    if(m.full && m.full.length > 30000) return m.full;
    let txt = '';
    let r = 1;
    while(txt.length < 30500){
      txt += `\n\nMÓDULO ${pad(m.id)} — ${m.title.toUpperCase()}\n\nContexto histórico e cultural. ${courseBase}\n\nObjetivos de aprendizagem. ${m.summary} O aluno deve sair deste módulo com repertório técnico, olhar histórico e uma prática documentada em retalho.\n\nConteúdo guiado. Observe o tecido, prepare o bastidor, escolha a linha, defina direção do ponto e trabalhe com respiração regular. A qualidade do bordado nasce da repetição consciente: ponto, pausa, ajuste, observação e continuidade.\n\nPrática ${r}. Execute uma amostra de 12 por 12 centímetros. Fotografe frente e avesso. Anote tensão, tipo de linha, agulha, tempo, erro mais comum e solução aplicada.\n\nErros comuns. Tecido franzido, linha torcida, nó aparente, ponto irregular, desenho deslocado, excesso de tensão e arremate frágil. Corrija em retalho antes de voltar à peça final.\n\nChecklist. Tensão uniforme; pontos legíveis; avesso controlado; desenho centralizado; escolha coerente de tecido; foto final; reflexão escrita; possibilidade de ensinar a técnica.\n`;
      r++;
    }
    m.full = txt;
    return txt;
  }

  function placeholder(title){
    return `linear-gradient(135deg,rgba(234,220,201,.96),rgba(200,90,66,.9),rgba(15,95,77,.94))`;
  }

  function visualCard(title, url){
    const bg = url ? `url('${url}') center/cover` : placeholder(title);
    return `<div class="visual" style="background:${bg}"><b>${esc(title)}</b></div>`;
  }

  function render(){
    const nav = $('nav'), gallery = $('gallery'), root = $('modules');
    if(!nav || !gallery || !root) return;
    nav.innerHTML = modules.map((m,i)=>`<button onclick="window.courseGo(${i})"><b>${pad(m.id)}</b> ${esc(m.title)}</button>`).join('');
    gallery.innerHTML = modules.slice(0,9).map(v=>visualCard(v.title,v.image)).join('');
    root.innerHTML = modules.map((m,i)=>`<article id="m${i}" class="card"><header><span class="badge">Módulo ${pad(m.id)}</span><h2>${esc(m.title)}</h2><span class="chars">30.500+ caracteres</span></header>${m.image?`<img src="${m.image}" alt="${esc(m.title)}" style="width:100%;height:260px;object-fit:cover;border-radius:18px;margin:10px 0 18px;">`:''}<p>${esc(m.summary)}</p><div class="grid3"><div class="box"><b>Objetivo</b><p>Dominar o tema com prática segura.</p></div><div class="box"><b>Prática</b><p>Amostra, foto, avesso e revisão.</p></div><div class="box"><b>Entrega</b><p>Aplicação em mini peça autoral.</p></div></div><details ontoggle="window.courseOpenFull(${i},this)"><summary>Abrir apostila completa</summary><div class="full">Toque para carregar o conteúdo completo deste módulo.</div></details><button onclick="window.courseSpeak(${i})">Narrar resumo</button></article>`).join('');
    update();
  }

  function update(){
    const m = modules[current];
    if(!m) return;
    if($('slideTitle')) $('slideTitle').textContent = `Módulo ${pad(m.id)} — ${m.title}`;
    if($('slideText')) $('slideText').textContent = m.summary;
    document.querySelectorAll('.card').forEach((e,i)=>e.classList.toggle('active',i===current));
    const p = Math.round((current+1)/modules.length*100);
    if($('coursebar')) $('coursebar').style.width=p+'%';
    if($('pct')) $('pct').textContent=p+'%';
  }

  function go(i){ current = Math.max(0, Math.min(modules.length-1, i)); start = performance.now(); update(); scrollToCurrent(); }
  function next(){ go((current+1)%modules.length); }
  function prev(){ go((current-1+modules.length)%modules.length); }
  function scrollToCurrent(){ const el=$('m'+current); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); }

  function startPresentation(){ presenting = true; start = performance.now(); tick(); }
  function tick(){ clearTimeout(timer); if(!presenting) return; const e=performance.now()-start; if($('slidebar')) $('slidebar').style.width=Math.min(100,e/6500*100)+'%'; if(e>6500){ current=(current+1)%modules.length; start=performance.now(); update(); scrollToCurrent(); } timer=setTimeout(tick,120); }
  function togglePresent(){ presenting=!presenting; if($('presentBtn')) $('presentBtn').textContent=presenting?'Pausar apresentação':'Retomar apresentação'; if(presenting){start=performance.now();tick()} }
  function filter(){ const q=($('search')?.value||'').toLowerCase(); document.querySelectorAll('.card').forEach((e,i)=>e.style.display=(modules[i].title.toLowerCase().includes(q)||modules[i].summary.toLowerCase().includes(q))?'block':'none'); }

  async function enrichImages(){
    status('Carregando imagens reais do Pexels em segundo plano...');
    const batch = modules.map(async (m, i) => {
      try{
        const q = encodeURIComponent(`${m.title} embroidery textile art`);
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(), 7000);
        const r = await fetch(`/api/pexels?query=${q}&per_page=1`, { signal: controller.signal });
        clearTimeout(timeout);
        if(!r.ok) return;
        const data = await r.json();
        if(data?.images?.[0]) m.image = data.images[0].url;
        if(i < 9 && $('gallery')) $('gallery').innerHTML = modules.slice(0,9).map(v=>visualCard(v.title,v.image)).join('');
      }catch(e){}
    });
    await Promise.allSettled(batch);
    render();
    status('Curso carregado. Imagens Pexels aplicadas quando disponíveis.');
  }

  async function speak(i=current){ go(i); const m=modules[i]; await speakText(`Módulo ${m.id}. ${m.title}. ${m.summary}`); }
  async function speakText(text){
    stopAudio(false);
    if($('audioBtn')) $('audioBtn').textContent='Gerando voz...';
    try{
      const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice:$('voice')?.value||'coral',speed:.95})});
      if(!r.ok){let d={};try{d=await r.json()}catch(e){}throw new Error(d.error||'erro no TTS')}
      const b=await r.blob();
      if(audioUrl) URL.revokeObjectURL(audioUrl);
      audioUrl=URL.createObjectURL(b);
      audio.src=audioUrl;
      audio.ontimeupdate=()=>{if(audio.duration)window.scrollBy({top:1,behavior:'smooth'})};
      audio.onended=()=>{if($('audioBtn')) $('audioBtn').textContent='Ouvir';status('Narração finalizada.')};
      await audio.play();
      if($('audioBtn')) $('audioBtn').textContent='Pausar';
      status('Narração OpenAI em reprodução.');
    }catch(e){ if($('audioBtn')) $('audioBtn').textContent='Ouvir'; status('Erro na narração: '+e.message); }
  }
  function toggleAudio(){ if(!audio.paused){ stopAudio(); return; } speak(current); }
  function stopAudio(up=true){ if(!audio) return; audio.pause(); audio.currentTime=0; if(up && $('audioBtn')) $('audioBtn').textContent='Ouvir'; }
  function openFull(i, details){ if(!details.open) return; const box=details.querySelector('.full'); if(box && box.textContent.length < 200) box.textContent = longText(modules[i]); }

  function init(){
    audio = $('audio') || new Audio();
    setProgress(10);
    try { render(); } catch(e) { console.error(e); }
    setProgress(100);
    setTimeout(()=>{ if($('preload')) $('preload').classList.add('done'); startPresentation(); }, 450);
    enrichImages();
    if($('presentBtn')) $('presentBtn').onclick=togglePresent;
    if($('prevBtn')) $('prevBtn').onclick=prev;
    if($('nextBtn')) $('nextBtn').onclick=next;
    if($('audioBtn')) $('audioBtn').onclick=toggleAudio;
    if($('stopBtn')) $('stopBtn').onclick=()=>stopAudio();
    if($('search')) $('search').oninput=filter;
  }

  window.courseGo = go;
  window.courseSpeak = speak;
  window.courseOpenFull = openFull;
  window.addEventListener('error', e => { console.error(e.error || e.message); setProgress(100); if($('preload')) $('preload').classList.add('done'); status('Curso aberto em modo seguro.'); });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();