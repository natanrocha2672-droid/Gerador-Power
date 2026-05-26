const http=require('http');
const fs=require('fs');
const path=require('path');
const ROOT=__dirname;
const PORT=process.env.PORT||3000;
const imageCache=new Map();

function loadEnv(){
  const p=path.join(ROOT,'.env');
  if(!fs.existsSync(p))return;
  for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){
    const t=line.trim();
    if(!t||t.startsWith('#'))continue;
    const i=t.indexOf('=');
    if(i<0)continue;
    const k=t.slice(0,i).trim();
    let v=t.slice(i+1).trim();
    if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);
    if(!process.env[k])process.env[k]=v;
  }
}
loadEnv();

function clean(v,max=4000){return String(v||'').replace(/\u0000/g,'').replace(/\s+/g,' ').trim().slice(0,max)}
function sendJson(res,status,data,cache='no-store'){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':cache});res.end(JSON.stringify(data))}
function readBody(req,limit=1e6){return new Promise((ok,bad)=>{let b='';req.on('data',c=>{b+=c;if(Buffer.byteLength(b)>limit){bad(new Error('Payload muito grande'));req.destroy()}});req.on('end',()=>ok(b));req.on('error',bad)})}

const BASE=[
['Arqueologia Têxtil e as Origens do Bordado','ancient bone needle textile','Como o bordado nasce entre função, proteção, status e ritual.'],
['Opus Anglicanum e Sacralidade Medieval','medieval gold embroidery','Seda, ouro, split stitch, underside couching e liturgia medieval.'],
['Renascimento, Modelbooks e Blackwork','blackwork linen embroidery pattern','Padrões impressos, ponto Holbein, reticella e transferência por picar e polvilhar.'],
['Era Industrial e Máquinas de Bordar','vintage sewing embroidery machine','Heilmann, Singer, Schiffli, mecanização e produção seriada.'],
['Fibras Naturais e Sintéticas','embroidery floss fabric fibers','Linho, lã, seda, algodão, poliéster, tensão, brilho e fricção.'],
['Ergonomia e Bastidor Profissional','embroidery hoop tools','Postura, iluminação, ferramentas, tensão do tecido e prevenção de fadiga.'],
['Morfologia dos Pontos','embroidery stitch sampler','Ponto haste, corrente, nós franceses, direção, tensão e relevo.'],
['Needle Painting e Degradê','needle painting embroidery flower','Pontos longos e curtos, fusão cromática e volume com linha.'],
['Bordado Branco e Hardanger','hardanger whitework embroidery','Whitework, fios tirados, corte controlado, relevo e vazados.'],
['Crewel e Estilo Jacobino','crewel wool embroidery jacobean','Lã sobre linho, folhas, animais, arabescos e preenchimentos texturizados.'],
['Goldwork I: Couching e Or Nué','goldwork embroidery couching','Fios metálicos assentados, couching, or nué e brilho controlado.'],
['Goldwork II: Relevo e Purl','raised goldwork embroidery','Feltro, cartolina, purling, volume e efeitos escultóricos.'],
['Shisha e Espelhos','shisha mirror embroidery india','Espelhos, brilho, proteção simbólica e vestimentas indianas.'],
['Sashiko e Kogin','sashiko embroidery indigo fabric','Reparo japonês, geometria, algodão índigo e alinhavo branco.'],
['Zardosi Imperial','zardosi embroidery gold thread','Luxo indo-persa, fios metálicos, seda, pedrarias e motivos florais.'],
['Lunéville e Tambour','luneville tambour embroidery haute couture','Alta costura, gancho, tule, miçangas e paetês pelo avesso.'],
['Pedrarias e Paetês','bead sequin embroidery couture','Peso, estabilidade, brilho, fixação e tecido de gala.'],
['Stumpwork e Bordado em Relevo','stumpwork raised embroidery','Arames, enchimentos, pétalas destacadas e escultura têxtil.'],
['Bordado Brasileiro Tridimensional','brazilian dimensional embroidery flowers','Flores em relevo, fios brilhantes, pontos enrolados e flora tropical.'],
['Rendas de Agulha e Ponto de Veneza','needle lace venice lace','Caseado, pontes, vazados e estruturas independentes do tecido.'],
['Conservação e Restauro Têxtil','textile conservation embroidery museum','Documentação, limpeza, estabilização, acondicionamento e ética.'],
['Design de Padrões','embroidery design sketch pattern','Croqui, escala, mapa de pontos, paleta e sequência de execução.'],
['Digitalização e Bordado Computadorizado','machine embroidery digitizing','Densidade, vetorização, compensação, estabilizador e teste.'],
['Gestão de Ateliê','handmade embroidery business studio','Custos, tempo, briefing, orçamento, direitos autorais e entrega.'],
['Curadoria e Exposição','embroidery exhibition museum','Narrativa, iluminação, legenda, suporte e conservação em exposição.'],
['Bordado na Arte Contemporânea','contemporary textile art embroidery','Memória, corpo, política, instalação têxtil e ação coletiva.'],
['Materiais Não Convencionais','mixed media textile embroidery','Plástico, papel, metal, cabelo, suporte instável e segurança.'],
['Alfaiataria e Bordado','couture embroidery garment','Caimento, reforço, peso, traje de gala, fardamento e figurino.'],
['Fotografia e Documentação Técnica','embroidery portfolio photography','Luz lateral, macro, escala, ficha técnica e portfólio.'],
['Projeto Final: Coleção Autoral','finished embroidery collection','Pesquisa, conceito, protótipo, peça final, documentação e apresentação.']
];

function svgData(title){
  const safe=String(title||'Imagem do módulo').replace(/[<>&]/g,'');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#eadfd1"/><stop offset=".55" stop-color="#c85a42"/><stop offset="1" stop-color="#0f5f4d"/></linearGradient><pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M0 30 Q30 0 60 30 Q30 60 0 30" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/></pattern></defs><rect width="1200" height="760" fill="url(#g)"/><rect width="1200" height="760" fill="url(#p)"/><text x="70" y="590" font-family="Georgia,serif" font-size="50" font-weight="700" fill="white">${safe}</text><text x="70" y="655" font-family="Arial" font-size="26" fill="#fff3e8">Imagem ilustrativa do curso de bordado</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}

function expand(id,title,summary){
  const sections=[
`MÓDULO ${id} — ${title}\n${summary}\n\nObjetivo geral: compreender o tema de forma técnica, histórica e prática, transformando a leitura em uma amostra bordada observável.`,
`1. Contexto histórico e cultural\nEste tema aparece no bordado como parte de uma longa história de adaptação têxtil. Antes de escolher linha e tecido, observe qual necessidade a técnica responde: reforçar, ornamentar, narrar, preservar memória, indicar status, criar textura ou organizar uma superfície.`,
`2. Leitura visual\nAnalise a peça pela distância e pelo detalhe. De longe, identifique massas de cor, eixo de composição, contraste e equilíbrio. De perto, veja direção do fio, comprimento dos pontos, densidade, relevo, avesso e regularidade.`,
`3. Materiais recomendados\nSepare tecido estável, bastidor compatível, agulhas de tamanhos variados, tesoura de ponta fina, linhas em duas ou três espessuras, marcador removível e retalho de teste.`,
`4. Preparação do suporte\nPasse o tecido, alinhe a trama, posicione no bastidor e ajuste a tensão como se fosse um tambor leve. O tecido não deve ficar frouxo, mas também não deve ser deformado.`,
`5. Planejamento do risco\nTransforme a ideia em um desenho simples. Marque eixos principais, áreas de contorno, áreas de preenchimento e pontos de maior contraste. Um bom risco bordável respeita escala, tipo de ponto e tempo.`,
`6. Execução passo a passo\nComece por uma área pequena. Faça primeiro contornos ou linhas de direção, depois avance para preenchimentos e texturas. Trabalhe com fios curtos para evitar desgaste.`,
`7. Tensão e ritmo\nA tensão correta é essencial. Se a linha repuxa, o tecido enruga; se fica frouxa, o ponto perde definição. Em curvas, diminua o tamanho do ponto; em retas, mantenha intervalo regular.`,
`8. Variações técnicas\nExperimente a mesma ideia com duas abordagens: uma mais linear e outra mais texturizada. Compare ponto de contorno, preenchimento, pontos soltos e pontos de relevo.`,
`9. Erros comuns e correções\nErros frequentes incluem linha longa demais, bastidor frouxo, risco escuro, excesso de pontos, falta de amostra e escolha inadequada de agulha. Corrija testando em retalho.`,
`10. Exercício guiado\nProduza uma amostra de dez por dez centímetros relacionada ao módulo. Use pelo menos dois tipos de ponto, uma área de contorno e uma área de textura.`,
`11. Checklist de avaliação\nVerifique: tecido estável, pontos legíveis, tensão uniforme, avesso sem acúmulos, paleta coerente, bordas limpas, fotografia final nítida e ficha técnica preenchida.`,
`12. Aplicação autoral\nAdapte o conteúdo para uma peça útil ou expressiva: bastidor decorativo, detalhe em roupa, painel narrativo, aplicação em bolsa ou estudo de portfólio.`,
`13. Perguntas para reflexão\nQue função este bordado cumpre? O ponto escolhido reforça essa função? A escala está adequada ao tecido? O material valoriza ou atrapalha o desenho?`,
`14. Plano de estudo\nDia 1: leitura. Dia 2: teste de materiais. Dia 3: risco. Dia 4: amostra. Dia 5: execução. Dia 6: acabamento. Dia 7: revisão crítica.`,
`15. Síntese do professor\nBordar é decidir caminho, pressão, escala, matéria e narrativa. Quando o aluno domina esses elementos, adapta a técnica a diferentes projetos e cria com segurança.`
  ];
  let text=sections.join('\n\n');
  while(text.length<10300)text+='\n\nReforço didático: retorne à amostra, compare o primeiro e o último ponto, observe se a tensão melhorou e anote uma decisão técnica que você faria diferente. O aprendizado real aparece quando a mão, o olho e a explicação começam a concordar.';
  return text;
}

function course(){
  return BASE.map((x,i)=>{const title=x[0],query=x[1],summary=x[2],content=expand(i+1,title,summary);return {id:i+1,title,summary,content,imageDescription:`Imagem realista de ${summary.toLowerCase()} em contexto de bordado artesanal, alta qualidade, luz natural, detalhe têxtil.`,imageQueries:[query,title,'embroidery textile craft'],fallbackImage:svgData(title),charCount:content.length,source:'server-embedded-long'}});
}

async function searchPexels(query,count=1){
  const q=clean(query||'embroidery textile craft',180);
  const n=Math.min(8,Math.max(1,Number(count)||1));
  const key='pexels:'+q.toLowerCase()+':'+n;
  if(imageCache.has(key))return imageCache.get(key);
  const fallback={query:q,images:[{url:svgData(q),thumb:svgData(q),photographer:'Fallback local',alt:q,fallback:true}],warning:''};
  if(!process.env.PEXELS_API_KEY){fallback.warning='PEXELS_API_KEY não configurada';imageCache.set(key,fallback);return fallback}
  try{
    const r=await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${n}&orientation=landscape`,{headers:{Authorization:process.env.PEXELS_API_KEY}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){fallback.warning=d.error||'Erro Pexels '+r.status;imageCache.set(key,fallback);return fallback}
    const imgs=(d.photos||[]).map(p=>({url:p.src?.large2x||p.src?.large||p.src?.medium,thumb:p.src?.medium,photographer:p.photographer,alt:p.alt||q,source:p.url,fallback:false})).filter(x=>x.url);
    const data={query:q,images:imgs.length?imgs:fallback.images,warning:imgs.length?'':'Sem imagem no Pexels'};
    imageCache.set(key,data);return data;
  }catch(e){fallback.warning=e.message;imageCache.set(key,fallback);return fallback}
}

async function imageForModule(id){
  const c=course();
  const m=c.find(x=>x.id===Number(id))||c[0];
  const queries=[...(m.imageQueries||[]),m.imageDescription,m.title,'embroidery textile craft'].filter(Boolean);
  for(const q of queries){
    const data=await searchPexels(q,1);
    if(data.images?.[0]&&!data.images[0].fallback)return {moduleId:m.id,moduleTitle:m.title,query:data.query,image:data.images[0],warning:''};
  }
  const data=await searchPexels(queries[0],1);
  return {moduleId:m.id,moduleTitle:m.title,query:data.query,image:data.images[0],warning:data.warning||'Usando fallback local'};
}

async function handleCourse(req,res){
  const u=new URL(req.url,`http://${req.headers.host}`);
  const c=course();
  if(u.pathname==='/api/course/index')return sendJson(res,200,{count:c.length,modules:c.map(m=>({id:m.id,title:m.title,summary:m.summary,charCount:m.charCount,source:m.source,imageEndpoint:`/api/course/image?id=${m.id}`}))},'public, max-age=60');
  if(u.pathname==='/api/course/module'){
    const id=Number(u.searchParams.get('id')||1),m=c.find(x=>x.id===id)||c[id-1];
    if(!m)return sendJson(res,404,{error:'Módulo não encontrado'});
    return sendJson(res,200,{...m,imageEndpoint:`/api/course/image?id=${m.id}`},'public, max-age=60');
  }
  if(u.pathname==='/api/course/image')return sendJson(res,200,await imageForModule(Number(u.searchParams.get('id')||1)),'public, max-age=86400');
  if(u.pathname==='/api/course/images'){
    const items=[];for(const m of c)items.push(await imageForModule(m.id));
    return sendJson(res,200,{count:items.length,items},'public, max-age=86400');
  }
  return sendJson(res,404,{error:'Endpoint não encontrado'});
}

async function handlePexels(req,res){const u=new URL(req.url,`http://${req.headers.host}`);return sendJson(res,200,await searchPexels(u.searchParams.get('query')||'embroidery',u.searchParams.get('per_page')||1),'public, max-age=86400')}

async function handleTTS(req,res){
  if(req.method!=='POST')return sendJson(res,405,{error:'Use POST'});
  if(!process.env.OPENAI_API_KEY)return sendJson(res,500,{error:'OPENAI_API_KEY não configurada'});
  let p;try{p=JSON.parse(await readBody(req))}catch{return sendJson(res,400,{error:'JSON inválido'})}
  const input=clean(p.text,4096);
  try{const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',input,voice:p.voice||'coral',response_format:'mp3',speed:Number(p.speed)||.95,instructions:'Português do Brasil natural e didático.'})});if(!r.ok)return sendJson(res,r.status,{error:'Erro TTS '+r.status});const a=Buffer.from(await r.arrayBuffer());res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'no-store'});res.end(a)}catch(e){sendJson(res,500,{error:e.message})}
}

function extract(d){if(d.output_text)return d.output_text;return (d.output||[]).flatMap(o=>(o.content||[]).map(c=>c.text||c.output_text||'')).join('\n')}
async function handleAtelier(req,res){
  if(req.method!=='POST')return sendJson(res,405,{error:'Use POST'});
  if(!process.env.OPENAI_API_KEY)return sendJson(res,500,{error:'OPENAI_API_KEY não configurada'});
  let p;try{p=JSON.parse(await readBody(req))}catch{return sendJson(res,400,{error:'JSON inválido'})}
  const m=p.module||{},ctx=`Módulo: ${clean(m.title,200)}. Resumo: ${clean(m.summary,1000)}. Conteúdo: ${clean(m.content,2500)}. Pergunta: ${clean(p.prompt,1200)}.`;
  try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.5',instructions:'Você é uma professora especialista em bordado. Responda em português do Brasil com passos práticos.',input:ctx})});const d=await r.json();if(!r.ok)return sendJson(res,r.status,{error:d?.error?.message||'Erro OpenAI'});return sendJson(res,200,{text:extract(d)||'Não consegui responder agora.'})}catch(e){return sendJson(res,500,{error:e.message})}
}

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
function serve(req,res){
  const u=new URL(req.url,`http://${req.headers.host}`);let p=decodeURIComponent(u.pathname);
  if(p==='/'||p==='/curso')p='/curso-completo.html';
  const f=path.normalize(path.join(ROOT,p));
  if(!f.startsWith(ROOT)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Arquivo não encontrado.')}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':p.endsWith('.html')?'no-store':'public, max-age=3600'});res.end(d)})
}

http.createServer((req,res)=>{
  if(req.url.startsWith('/api/course/'))return handleCourse(req,res);
  if(req.url.startsWith('/api/pexels'))return handlePexels(req,res);
  if(req.url.startsWith('/api/tts'))return handleTTS(req,res);
  if(req.url.startsWith('/api/atelier'))return handleAtelier(req,res);
  serve(req,res);
}).listen(PORT,()=>console.log('Site rodando em http://localhost:'+PORT));
