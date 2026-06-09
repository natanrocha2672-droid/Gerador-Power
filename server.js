const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const RAW = 'https://raw.githubusercontent.com/natanrocha2672-droid/Gerador-Power/main/data/curso-extraido.json';
let cache = null;
let source = 'not-loaded';

const TITLES = [
  'Arqueologia Têxtil e as Origens do Bordado',
  'Opus Anglicanum e Sacralidade Medieval',
  'Renascimento, Modelbooks e Blackwork',
  'Era Industrial e Máquinas de Bordar',
  'Fibras Naturais e Sintéticas',
  'Ergonomia e Bastidor Profissional',
  'Morfologia dos Pontos',
  'Needle Painting e Degradê',
  'Bordado Branco e Hardanger',
  'Crewel e Estilo Jacobino',
  'Goldwork I: Couching e Or Nué',
  'Goldwork II: Relevo e Purl',
  'Shisha e Espelhamento',
  'Sashiko e Kogin',
  'Zardosi Imperial',
  'Lunéville e Tambour',
  'Pedrarias e Paetês',
  'Stumpwork e Bordado em Relevo',
  'Bordado Brasileiro',
  'Rendas de Agulha e Ponto de Veneza',
  'Conservação e Restauro Têxtil',
  'Design de Padrões',
  'Digitalização e Bordado Computadorizado',
  'Gestão de Ateliê',
  'Curadoria e Exposição',
  'Bordado na Arte Contemporânea',
  'Materiais Não Convencionais',
  'Alfaiataria e Bordado',
  'Fotografia e Documentação Técnica',
  'Projeto Final: Coleção Autoral'
];

function clean(value, max = 4000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function slug(value) {
  return clean(value, 120)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'curso';
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function sendJson(res, status, data, cacheControl = 'no-store') {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(text);
}

function readBody(req, limit = 2_000_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (Buffer.byteLength(data) > limit) {
        reject(new Error('Payload muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function get(url, redirect = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: { 'User-Agent': 'gerador-power', 'Accept': 'application/json,*/*' }
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location && redirect < 5) {
        response.resume();
        return resolve(get(new URL(response.headers.location, url).toString(), redirect + 1));
      }
      let data = '';
      response.setEncoding('utf8');
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) return resolve(data);
        reject(new Error('HTTP ' + response.statusCode));
      });
    });
    request.setTimeout(12000, () => request.destroy(new Error('timeout')));
    request.on('error', reject);
  });
}

function fallbackImage(title) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760"><rect width="1200" height="760" fill="#205646"/><text x="70" y="590" font-family="Georgia" font-size="42" font-weight="700" fill="white">${escapeHtml(title).slice(0, 90)}</text><text x="70" y="650" font-family="Arial" font-size="24" fill="white">Referência visual fiel</text></svg>`
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

function decorate(module) {
  module.imageQueries = module.imageQueries || [module.title, 'hand embroidery macro needle thread fabric'];
  module.fallbackImage = module.fallbackImage || fallbackImage(module.title);
  module.visualKit = visualKit(module);
  return module;
}

function titleFromContent(content, fallback) {
  const lines = String(content || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const title = lines.find(line => /^m\s*[oó]\s*d\s*u\s*l\s*o\s+(?:[ivxlcdm]+|\d+)/i.test(line) && line.length > 10)
    || lines.find(line => line.length > 18 && !/^c\s*u\s*r\s*s\s*o\s+d\s*e\s+b\s*o\s*r\s*d\s*a\s*d\s*o/i.test(line))
    || fallback;
  return clean(title, 160).replace(/^m\s*[oó]\s*d\s*u\s*l\s*o\s+[ivxlcdm\d]+\s*[:\-]?\s*/i, '').trim();
}

function summaryFromContent(content) {
  const lines = String(content || '').split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^c\s*u\s*r\s*s\s*o\s+d\s*e\s+b\s*o\s*r\s*d\s*a\s*d\s*o/i.test(line))
    .filter(line => !/^m\s*[oó]\s*d\s*u\s*l\s*o\s+(?:[ivxlcdm]+|\d+)/i.test(line))
    .filter(line => !/^[-—]{3,}$/.test(line));
  return clean(lines.slice(0, 3).join(' '), 360);
}

function markerMatches(raw) {
  const text = String(raw || '');
  const strict = [...text.matchAll(/CURSO\s+DE\s+BORDADO\s*[-–—]\s*M[ÓO]DULO\s+(\d+)/gi)]
    .map(match => ({ id: Number(match[1]), index: match.index }));
  if (strict.length >= 25) return strict;

  return [...text.matchAll(/C\s*U\s*R\s*S\s*O\s+D\s*E\s+B\s*O\s*R\s*D\s*A\s*D\s*O\s*[-–—]\s*M\s*[ÓO]\s*D\s*U\s*L\s*O\s+(\d+)/gi)]
    .map(match => ({ id: Number(match[1]), index: match.index }));
}

function headingMatches(raw) {
  const text = String(raw || '');
  const start = Math.max(0, text.search(/C\s*U\s*R\s*S\s*O\s+D\s*E\s+B\s*O\s*R\s*D\s*A\s*D\s*O/i));
  const slice = text.slice(start);
  return [...slice.matchAll(/(?:^|\n)\s*M\s*[ÓO]\s*D\s*U\s*L\s*O\s+(?:[IVXLCDM]+|\d+)\s*:/gi)]
    .map((match, index) => ({ id: index + 1, index: start + match.index }));
}

function modulesFromText(text, sourceName) {
  const raw = String(text || '');
  let marks = markerMatches(raw);
  if (marks.length < 25) marks = headingMatches(raw);
  if (marks.length < 25) throw new Error(`Texto incompleto: ${marks.length}/30 marcadores`);

  const modules = marks.map((mark, index) => {
    const id = Number(mark.id || index + 1);
    const start = mark.index;
    const end = index + 1 < marks.length ? marks[index + 1].index : raw.length;
    const content = raw.slice(start, end).trim();
    return decorate({
      id,
      title: titleFromContent(content, TITLES[id - 1] || `Módulo ${id}`),
      summary: summaryFromContent(content),
      content,
      charCount: content.length,
      source: `${sourceName}-texto`
    });
  }).filter(module => module.id && module.content);

  if (modules.length < 30) throw new Error(`Texto incompleto: ${modules.length}/30 módulos`);
  return modules.slice(0, 30);
}

function normalizeCoursePayload(payload, sourceName) {
  if (payload && typeof payload.texto === 'string') return modulesFromText(payload.texto, sourceName);
  if (payload && typeof payload.text === 'string') return modulesFromText(payload.text, sourceName);

  const items = payload?.modules || payload?.modulos || payload;
  if (!Array.isArray(items)) throw new Error('Formato de curso inválido');

  const modules = items.map((item, index) => {
    const content = String(item.content || item.conteudo || '');
    const id = Number(item.id || index + 1);
    return decorate({
      id,
      title: titleFromContent(content, item.title || item.titulo || TITLES[id - 1] || `Módulo ${id}`),
      summary: clean(item.summary || item.resumo || summaryFromContent(content), 360),
      content,
      charCount: Number(item.charCount || item.totalCaracteres || content.length),
      source: item.source || sourceName,
      imageQueries: item.imageQueries,
      fallbackImage: item.fallbackImage
    });
  }).filter(module => module.id && module.content);

  if (modules.length < 30) throw new Error(`Curso incompleto: ${modules.length}/30 módulos`);
  return modules.slice(0, 30);
}

function fallbackCourse() {
  source = 'fallback';
  return TITLES.map((title, index) => decorate({
    id: index + 1,
    title,
    summary: 'Módulo do curso de bordado.',
    content: `${title}\n\nConteúdo real ainda não carregado.`,
    charCount: title.length,
    source: 'fallback'
  }));
}

function localJsonCourse() {
  const file = path.join(ROOT, 'data', 'curso-extraido.json');
  if (!fs.existsSync(file)) throw new Error('data/curso-extraido.json não encontrado');
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const modules = normalizeCoursePayload(payload, 'pdf-extraido');
  source = 'pdf-extraido-local';
  return modules;
}

async function remoteJsonCourse() {
  const payload = JSON.parse(await get(RAW));
  const modules = normalizeCoursePayload(payload, 'pdf-extraido-remote');
  source = 'pdf-extraido-remote';
  return modules;
}

async function loadCourse() {
  if (cache) return cache;
  try {
    cache = localJsonCourse();
    return cache;
  } catch (error) {
    console.warn('local json:', error.message);
  }
  try {
    cache = await remoteJsonCourse();
    return cache;
  } catch (error) {
    console.error('remote json:', error.message);
  }
  cache = fallbackCourse();
  return cache;
}

async function apiCourse(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const course = await loadCourse();

  if (url.pathname === '/api/course/index') {
    return sendJson(res, 200, {
      count: course.length,
      source,
      modules: course.map(module => ({
        id: module.id,
        title: module.title,
        summary: module.summary,
        charCount: module.charCount,
        source: module.source,
        visualKit: module.visualKit,
        imageEndpoint: `/api/course/module?id=${module.id}`
      }))
    });
  }

  if (url.pathname === '/api/course/module') {
    const id = Number(url.searchParams.get('id') || 1);
    const module = course.find(item => item.id === id) || course[id - 1];
    return module
      ? sendJson(res, 200, { ...module, imageEndpoint: `/api/course/image?id=${module.id}` })
      : sendJson(res, 404, { error: 'Módulo não encontrado' });
  }

  if (url.pathname === '/api/course/image') {
    const id = Number(url.searchParams.get('id') || 1);
    const module = course.find(item => item.id === id) || course[0];
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

  return sendJson(res, 404, { error: 'Endpoint não encontrado' });
}

function courseOutline(payload = {}) {
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
    modules,
    source: 'local-fallback'
  };
}

function moduleText(payload = {}) {
  const outline = payload.outline || courseOutline(payload);
  const module = payload.module || outline.modules?.[Number(payload.moduleId || 1) - 1] || outline.modules?.[0] || {};
  return {
    moduleId: module.id || 1,
    title: module.title || 'Módulo',
    summary: module.summary || '',
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

function quiz(payload = {}) {
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
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(course.title || 'Curso')}</title><style>body{font-family:Arial;margin:0;background:#f6eddf;color:#21160f}.hero{padding:48px 22px;background:#21160f;color:white}.wrap{max-width:980px;margin:auto;padding:28px 22px}.card{background:#fffaf1;border-radius:24px;padding:22px;margin:16px 0}h1,h2{font-family:Georgia}</style><section class="hero"><div class="wrap"><h1>${escapeHtml(course.title || 'Curso')}</h1><p>${escapeHtml(course.promise || '')}</p></div></section><main class="wrap">${(course.modules || []).map(module => `<article class="card"><h2>Módulo ${module.id}: ${escapeHtml(module.title)}</h2><p>${escapeHtml(module.summary || '')}</p></article>`).join('')}</main></html>`;
}

async function apiGenerate(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });
  let payload = {};
  try { payload = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: 'JSON inválido' }); }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/course/generate-outline') return sendJson(res, 200, courseOutline(payload));
  if (url.pathname === '/api/course/generate-module') return sendJson(res, 200, moduleText(payload));
  if (url.pathname === '/api/course/generate-quiz') return sendJson(res, 200, quiz(payload));
  if (url.pathname === '/api/course/generate-pdf') {
    const course = payload.course || payload.outline || courseOutline(payload);
    return sendJson(res, 200, { fileName: slug(course.title || 'curso') + '.html', html: courseHtml(course), note: 'MVP exporta HTML visual imprimível.' });
  }
  if (url.pathname === '/api/course/publish') {
    const course = payload.course || payload.outline;
    const id = course?.courseId || 'published-' + hash(JSON.stringify(course || payload)).slice(0, 12);
    return sendJson(res, 200, { id, url: `/curso.html?id=${id}`, status: 'published-local', course });
  }
  return sendJson(res, 404, { error: 'Endpoint não encontrado' });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/curso') pathname = '/index.html';
  const filePath = path.join(ROOT, pathname.replace(/^\/+/, ''));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return sendText(res, 404, 'Not found');
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === '.html' ? 'text/html; charset=utf-8'
    : ext === '.css' ? 'text/css; charset=utf-8'
    : ext === '.js' ? 'application/javascript; charset=utf-8'
    : ext === '.json' ? 'application/json; charset=utf-8'
    : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/course/generate') || url.pathname === '/api/course/publish') return apiGenerate(req, res);
    if (url.pathname.startsWith('/api/course/')) return apiCourse(req, res);
    return serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || 'Erro interno' });
  }
});

server.listen(PORT, () => console.log('Gerador Power on :' + PORT));
