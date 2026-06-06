const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const RAW_COURSE_URL = 'https://raw.githubusercontent.com/natanrocha2672-droid/Gerador-Power/main/data/curso-extraido.json';
let cache = null;
let source = 'fallback';
let embeddedCourse = null;

try {
  embeddedCourse = require('./data/curso-extraido.json');
} catch (error) {
  embeddedCourse = null;
}

function sendJson(res, status, data, cacheControl = 'no-store') {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl
  });
  res.end(JSON.stringify(data));
}

function clean(value, max = 4000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function slug(value) {
  return clean(value, 120)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'curso';
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function readBody(req, limit = 2_000_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > limit) {
        reject(new Error('Payload muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function svg(title) {
  const safe = encodeURIComponent(String(title || 'Módulo').slice(0, 80));
  return `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='760'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1'%3E%3Cstop stop-color='%23eadfd1'/%3E%3Cstop offset='.55' stop-color='%23c85a42'/%3E%3Cstop offset='1' stop-color='%230f5f4d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='760' fill='url(%23g)'/%3E%3Ctext x='70' y='590' font-family='Georgia' font-size='46' font-weight='700' fill='white'%3E${safe}%3C/text%3E%3Ctext x='70' y='655' font-family='Arial' font-size='26' fill='white'%3EReferência visual fiel%3C/text%3E%3C/svg%3E`;
}

const TITLES = [
  'Arqueologia Têxtil e as Origens do Bordado', 'Opus Anglicanum e Sacralidade Medieval',
  'Renascimento, Modelbooks e Blackwork', 'Era Industrial e Máquinas de Bordar',
  'Fibras Naturais e Sintéticas', 'Ergonomia e Bastidor Profissional', 'Morfologia dos Pontos',
  'Needle Painting e Degradê', 'Bordado Branco e Hardanger', 'Crewel e Estilo Jacobino',
  'Goldwork I: Couching e Or Nué', 'Goldwork II: Relevo e Purl', 'Shisha e Espelhamento',
  'Sashiko e Kogin', 'Zardosi Imperial', 'Lunéville e Tambour', 'Pedrarias e Paetês',
  'Stumpwork e Bordado em Relevo', 'Bordado Brasileiro', 'Rendas de Agulha e Ponto de Veneza',
  'Conservação e Restauro Têxtil', 'Design de Padrões', 'Digitalização e Bordado Computadorizado',
  'Gestão de Ateliê', 'Curadoria e Exposição', 'Bordado na Arte Contemporânea',
  'Materiais Não Convencionais', 'Alfaiataria e Bordado', 'Fotografia e Documentação Técnica',
  'Projeto Final: Coleção Autoral'
];

function getTitle(content, fallback) {
  const lines = String(content || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return clean(
    lines.find(line => /^m[oó]dulo/i.test(line) && line.length > 10) ||
    lines.find(line => line.length > 18 && !/^curso\s+de\s+bordado/i.test(line)) ||
    fallback,
    140
  );
}

function visualKit(module) {
  return {
    moduleId: module.id,
    title: module.title,
    visualIntent: `Representar ${module.title} com técnica real, material têxtil e textura visível.`,
    searchQueries: [module.title, 'hand embroidery macro needle thread fabric', 'embroidery textile craft close up'],
    fallbackImage: module.fallbackImage,
    authenticityChecks: [
      'Mostrar tecido, fio, agulha, ponto, bastidor ou peça real.',
      'Evitar imagem genérica que não prove o conteúdo.',
      'Legendar por que a imagem representa o módulo.'
    ],
    storyboard: [
      { label: 'Material', text: 'fios, tecido e ferramentas' },
      { label: 'Técnica', text: 'ponto e movimento' },
      { label: 'Resultado', text: 'peça final' }
    ]
  };
}

function normalizeCourse(parsed, src) {
  const array = parsed?.modules || parsed?.modulos || parsed;
  if (!Array.isArray(array)) throw new Error('Formato de curso inválido');

  const modules = array.map((item, index) => {
    const content = String(item.content || item.conteudo || '');
    const fallbackTitle = TITLES[index] || `Módulo ${index + 1}`;
    const module = {
      id: Number(item.id || index + 1),
      title: getTitle(content, item.title || item.titulo || fallbackTitle),
      summary: clean(item.summary || item.resumo || content.split(/\n+/).find(line => line.trim()) || '', 260),
      content,
      charCount: Number(item.charCount || item.totalCaracteres || content.length),
      source: item.source || src
    };
    module.imageQueries = Array.isArray(item.imageQueries) ? item.imageQueries : [module.title, 'hand embroidery macro needle thread fabric'];
    module.fallbackImage = item.fallbackImage || svg(module.title);
    module.visualKit = visualKit(module);
    return module;
  }).filter(module => module.id && module.content);

  if (!modules.length) throw new Error('Curso vazio');
  return modules;
}

function fallbackCourse() {
  source = 'fallback';
  return TITLES.map((title, index) => {
    const module = {
      id: index + 1,
      title,
      summary: 'Módulo do curso de bordado.',
      content: `${title}\n\nConteúdo real ainda não carregado.`,
      charCount: title.length,
      source: 'fallback'
    };
    module.imageQueries = [title, 'embroidery textile craft'];
    module.fallbackImage = svg(title);
    module.visualKit = visualKit(module);
    return module;
  });
}

function readJsonLocal() {
  let parsed = embeddedCourse;
  let how = parsed ? 'require-start' : null;

  if (!parsed) {
    try {
      parsed = require('./data/curso-extraido.json');
      how = 'require-late';
    } catch (requireError) {
      const filePath = path.join(ROOT, 'data', 'curso-extraido.json');
      if (!fs.existsSync(filePath)) {
        throw new Error('data/curso-extraido.json não encontrado: ' + requireError.message);
      }
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      how = 'fs';
    }
  }

  const modules = normalizeCourse(parsed, 'pdf-extraido');
  if (modules.length < 30) throw new Error(`JSON do PDF incompleto: ${modules.length}/30 módulos`);
  source = 'pdf-extraido-' + how;
  return modules;
}

function readB64Local() {
  const dir = path.join(ROOT, 'data');
  if (!fs.existsSync(dir)) throw new Error('Diretório data não encontrado');

  const files = fs.readdirSync(dir).filter(file => /^course-data\.b64\./.test(file)).sort();
  if (!files.length) throw new Error('Chunks course-data.b64.* não encontrados');

  const raw = files.map(file => fs.readFileSync(path.join(dir, file), 'utf8')).join('').replace(/\s+/g, '');
  const parsed = JSON.parse(zlib.gunzipSync(Buffer.from(raw, 'base64')).toString('utf8'));
  const modules = normalizeCourse(parsed, 'uploaded-course-data');
  if (modules.length < 30) throw new Error(`course-data incompleto: ${modules.length}/30 módulos`);
  source = 'uploaded-course-data';
  return modules;
}

async function readRemoteJson() {
  const response = await fetch(RAW_COURSE_URL, { headers: { 'User-Agent': 'gerador-power-vercel' } });
  if (!response.ok) throw new Error(`GitHub raw respondeu ${response.status}`);

  const parsed = await response.json();
  const modules = normalizeCourse(parsed, 'pdf-extraido-remote');
  if (modules.length < 30) throw new Error(`JSON remoto incompleto: ${modules.length}/30 módulos`);
  source = 'pdf-extraido-remote';
  return modules;
}

async function course() {
  if (cache) return cache;

  try {
    cache = readJsonLocal();
    return cache;
  } catch (error) {
    console.warn('PDF local indisponível:', error.message);
  }

  try {
    cache = readB64Local();
    return cache;
  } catch (error) {
    console.warn('course-data local indisponível:', error.message);
  }

  try {
    cache = await readRemoteJson();
    return cache;
  } catch (error) {
    console.error('JSON remoto indisponível:', error.message);
  }

  cache = fallbackCourse();
  return cache;
}

async function courseApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const modules = await course();

  if (url.pathname === '/api/course/index') {
    return sendJson(res, 200, {
      count: modules.length,
      source,
      modules: modules.map(module => ({
        id: module.id,
        title: module.title,
        summary: module.summary,
        charCount: module.charCount,
        source: module.source,
        visualKit: module.visualKit,
        imageEndpoint: `/api/course/image?id=${module.id}`
      }))
    });
  }

  if (url.pathname === '/api/course/module') {
    const id = Number(url.searchParams.get('id') || 1);
    const module = modules.find(item => item.id === id) || modules[id - 1];
    return module ? sendJson(res, 200, { ...module, imageEndpoint: `/api/course/image?id=${module.id}` }) : sendJson(res, 404, { error: 'Módulo não encontrado' });
  }

  if (url.pathname === '/api/course/image') {
    const id = Number(url.searchParams.get('id') || 1);
    const module = modules.find(item => item.id === id) || modules[0];
    return sendJson(res, 200, {
      moduleId: module.id,
      moduleTitle: module.title,
      query: module.title,
      image: {
        url: module.fallbackImage,
        thumb: module.fallbackImage,
        photographer: 'Fallback local',
        alt: module.title,
        fallback: true
      },
      visualKit: module.visualKit,
      warning: 'Usando fallback local por fidelidade visual'
    }, 'public, max-age=86400');
  }

  if (url.pathname === '/api/course/images') {
    return sendJson(res, 200, {
      count: modules.length,
      items: modules.map(module => ({
        moduleId: module.id,
        moduleTitle: module.title,
        image: { url: module.fallbackImage, thumb: module.fallbackImage, fallback: true },
        visualKit: module.visualKit
      }))
    }, 'public, max-age=86400');
  }

  return sendJson(res, 404, { error: 'Endpoint não encontrado' });
}

function makeOutline(payload = {}) {
  const topic = clean(payload.topic || payload.tema || 'Novo curso profissional', 120);
  const audience = clean(payload.audience || payload.publico || 'alunos iniciantes', 220);
  const count = Math.min(30, Math.max(3, Number(payload.modulesCount || payload.modulos || 8)));
  const modules = Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: index ? `Etapa ${index + 1} de ${topic}` : `Fundamentos de ${topic}`,
    summary: `Etapa para ${audience} evoluir em ${topic} com prática e visual fiel.`,
    lessons: ['Contexto visual', 'Demonstração prática', 'Exercício guiado', 'Checklist de fidelidade'],
    deliverables: ['Resumo visual', 'Exercício prático', 'Checklist'],
    visualBrief: {
      scene: `Ateliê realista mostrando ${topic}`,
      mustShow: ['material correto', 'ferramenta em uso', 'resultado visível'],
      avoid: ['imagem genérica']
    },
    estimatedMinutes: 45
  }));

  return {
    courseId: 'local-' + hash(JSON.stringify({ topic, audience, count })).slice(0, 12),
    title: `Curso Completo de ${topic}`,
    slug: slug(topic),
    promise: `Ao final, ${audience} serão capazes de praticar ${topic}.`,
    metadata: {
      topic,
      audience,
      level: payload.level || 'Do zero ao avançado',
      tone: payload.tone || 'Professor acolhedor',
      objective: payload.objective || '',
      modulesCount: count,
      sourceMode: payload.sourceMode || 'Tema + busca confiável',
      visualFidelity: payload.visualFidelity || 'Alta fidelidade visual',
      referenceMaterial: payload.referenceMaterial || '',
      sourceConfidence: payload.referenceMaterial ? 'Média/alta: há material de referência informado' : 'Média: precisa validação humana'
    },
    visualLanguage: {
      mood: 'visual de ateliê, textura real e cartões de referência',
      imageRules: ['usar imagens que mostrem a técnica', 'legendar função de cada imagem'],
      fidelityChecklist: ['O material está correto?', 'A imagem prova a técnica?', 'O passo é verificável?']
    },
    modules,
    assets: ['Mini-site visual', 'Apostila HTML', 'Quizzes'],
    source: 'local-fallback'
  };
}

function makeModuleText(payload = {}) {
  const outline = payload.outline || makeOutline(payload);
  const module = payload.module || outline.modules?.[Number(payload.moduleId || 1) - 1] || outline.modules?.[0] || {};
  return {
    moduleId: module.id || 1,
    title: module.title || 'Módulo',
    summary: module.summary || '',
    visualBrief: module.visualBrief,
    content: [
      `# ${module.title || 'Módulo'}`,
      '## Objetivo',
      module.summary || '',
      '## Aula completa',
      'Mostre o material, explique a técnica, faça demonstração e peça uma prática curta.',
      '## Checklist',
      '- Material correto\n- Imagem fiel\n- Passo executável'
    ].join('\n\n'),
    exercise: 'Produza uma mini-entrega visual.',
    checklist: ['Material correto', 'Imagem alinhada', 'Resultado verificável'],
    source: 'local-fallback'
  };
}

function makeQuiz(payload = {}) {
  const module = payload.module || {};
  const title = module.title || 'Módulo';
  return {
    moduleId: module.id || payload.moduleId || 1,
    title: 'Quiz — ' + title,
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      type: 'multiple_choice',
      question: `Qual atitude aumenta a fidelidade visual no aprendizado de ${title}?`,
      options: ['Usar imagem que prove o conteúdo', 'Escolher foto bonita aleatória', 'Ignorar materiais reais', 'Trocar técnica por decoração'],
      answer: 0,
      explanation: 'A imagem deve confirmar material, técnica e resultado.'
    })),
    source: 'local-fallback'
  };
}

function courseHtml(course) {
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(course.title)}</title><style>body{font-family:Arial;margin:0;background:#f6eddf;color:#21160f}.hero{padding:48px 22px;background:#21160f;color:white}.wrap{max-width:980px;margin:auto;padding:28px 22px}.card{background:#fffaf1;border-radius:24px;padding:22px;margin:16px 0}h1,h2{font-family:Georgia}</style><section class="hero"><div class="wrap"><h1>${esc(course.title || 'Curso')}</h1><p>${esc(course.promise || '')}</p></div></section><main class="wrap">${(course.modules || []).map(module => `<article class="card"><h2>Módulo ${module.id}: ${esc(module.title)}</h2><p>${esc(module.summary || '')}</p></article>`).join('')}</main></html>`;
}

async function generatorApi(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });

  let payload = {};
  try {
    payload = JSON.parse(await readBody(req));
  } catch (error) {
    return sendJson(res, 400, { error: 'JSON inválido' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/course/generate-outline') return sendJson(res, 200, makeOutline(payload));
  if (url.pathname === '/api/course/generate-module') return sendJson(res, 200, makeModuleText(payload));
  if (url.pathname === '/api/course/generate-quiz') return sendJson(res, 200, makeQuiz(payload));
  if (url.pathname === '/api/course/generate-pdf') {
    const course = payload.course || payload.outline || makeOutline(payload);
    return sendJson(res, 200, { fileName: slug(course.title || 'curso') + '.html', html: courseHtml(course), note: 'MVP exporta HTML visual imprimível.' });
  }
  if (url.pathname === '/api/course/publish') {
    const course = payload.course || payload.outline;
    const id = course?.courseId || 'published-' + hash(JSON.stringify(course || payload)).slice(0, 12);
    return sendJson(res, 200, { published: true, courseId: id, url: '/gerador?course=' + encodeURIComponent(id), message: 'Curso salvo para prévia do MVP.' });
  }
  return sendJson(res, 404, { error: 'Endpoint não encontrado' });
}

function serve(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === '/curso') pathname = '/curso-completo.html';
  if (pathname === '/gerador') pathname = '/gerador.html';

  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo não encontrado.');
    }
    res.writeHead(200, {
      'Content-Type': pathname.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream',
      'Cache-Control': pathname.endsWith('.html') ? 'no-store' : 'public, max-age=3600'
    });
    res.end(data);
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/course/generate-') || req.url.startsWith('/api/course/publish')) return generatorApi(req, res);
  if (req.url.startsWith('/api/course/')) return courseApi(req, res);
  if (req.url.startsWith('/api/pexels')) return sendJson(res, 200, { query: 'fallback', images: [{ url: svg('Referência visual'), thumb: svg('Referência visual'), photographer: 'Fallback local', fallback: true }] });
  if (req.url.startsWith('/api/tts/status')) return sendJson(res, 200, { cached: 0, mode: 'disabled-minimal' });
  if (req.url.startsWith('/api/atelier')) return sendJson(res, 200, { text: 'Ateliê em modo mínimo: use o conteúdo do módulo e o checklist de fidelidade visual.' });
  return serve(req, res);
}).listen(PORT, () => console.log('Gerador Power rodando em http://localhost:' + PORT));
