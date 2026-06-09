const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const COURSE_FILE = path.join(ROOT, 'data', 'curso-extraido.json');
let courseCache = null;

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
  'Projeto Final: Coleção Autoral',
];

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), 'application/json; charset=utf-8');
}

function clean(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function staticType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/curso') pathname = '/index.html';

  const safePath = path.normalize(pathname).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, 'Acesso negado');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, 'Arquivo não encontrado');
  }

  send(res, 200, fs.readFileSync(filePath), staticType(filePath));
}

function titleFromContent(content, fallback) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const heading = lines.find(line => /^M[óo]dulo\s+(?:[IVXLCDM]+|\d+)/i.test(line) && line.length > 10);
  if (heading) {
    return clean(heading.replace(/^M[óo]dulo\s+(?:[IVXLCDM]+|\d+)\s*[:\-]?\s*/i, ''), 160);
  }

  return clean(lines.find(line => line.length > 20) || fallback, 160);
}

function summaryFromContent(content) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^CURSO\s+DE\s+BORDADO/i.test(line))
    .filter(line => !/^M[óo]dulo\s+(?:[IVXLCDM]+|\d+)/i.test(line))
    .filter(line => !/^[-—]{3,}$/.test(line));

  return clean(lines.slice(0, 4).join(' '), 420);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findTitlePositions(raw) {
  const normalizedRaw = normalizeText(raw);
  const positions = [];

  for (const [index, title] of TITLES.entries()) {
    const normalizedTitle = normalizeText(title);
    const normalizedPosition = normalizedRaw.indexOf(normalizedTitle);

    if (normalizedPosition < 0) continue;

    const excerpt = raw.slice(Math.max(0, normalizedPosition - 300), normalizedPosition + title.length + 300);
    const directPosition = raw.indexOf(title);
    positions.push({
      id: index + 1,
      title,
      index: directPosition >= 0 ? directPosition : Math.max(0, normalizedPosition - 120),
      excerpt,
    });
  }

  return positions
    .filter(item => Number.isFinite(item.index))
    .sort((a, b) => a.index - b.index)
    .filter((item, index, list) => index === 0 || item.id !== list[index - 1].id);
}

function modulesFromPositions(raw, positions) {
  return positions.slice(0, 30).map((item, index) => {
    const start = item.index;
    const end = index + 1 < positions.length ? positions[index + 1].index : raw.length;
    const content = raw.slice(start, end).trim();
    return {
      id: item.id || index + 1,
      title: item.title || titleFromContent(content, `Módulo ${index + 1}`),
      summary: summaryFromContent(content),
      content,
      charCount: content.length,
      source: 'data/curso-extraido.json',
    };
  });
}

function splitModules(text) {
  const raw = String(text || '');
  const marker = /CURSO\s+DE\s+B\s*O\s*R\s*D\s*A\s*D\s*O\s*[-–—]\s*M\s*[ÓO]\s*D\s*U\s*L\s*O\s+(\d+)/gi;
  const matches = [...raw.matchAll(marker)].map(match => ({
    id: Number(match[1]),
    index: match.index,
  }));

  if (matches.length >= 30) {
    return matches.slice(0, 30).map((match, index) => {
      const start = match.index;
      const end = index + 1 < matches.length ? matches[index + 1].index : raw.length;
      const content = raw.slice(start, end).trim();
      const id = match.id || index + 1;
      return {
        id,
        title: titleFromContent(content, TITLES[id - 1] || `Módulo ${id}`),
        summary: summaryFromContent(content),
        content,
        charCount: content.length,
        source: 'data/curso-extraido.json',
      };
    });
  }

  const titlePositions = findTitlePositions(raw);
  if (titlePositions.length < 30) {
    throw new Error(`Marcadores: ${matches.length}; títulos oficiais encontrados: ${titlePositions.length}/30.`);
  }

  return modulesFromPositions(raw, titlePositions);
}

function loadCourse() {
  if (courseCache) return courseCache;
  if (!fs.existsSync(COURSE_FILE)) {
    throw new Error('Arquivo data/curso-extraido.json não encontrado no deploy.');
  }

  const data = JSON.parse(fs.readFileSync(COURSE_FILE, 'utf8'));
  const modules = splitModules(data.texto || data.text || '');
  courseCache = {
    fonte: data.fonte,
    paginas: data.paginas,
    totalCaracteres: data.totalCaracteres,
    totalModulos: modules.length,
    modules,
  };
  return courseCache;
}

function apiCourse(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const course = loadCourse();

    if (url.pathname === '/api/course/index') {
      return sendJson(res, 200, {
        count: course.modules.length,
        source: 'real-json',
        fonte: course.fonte,
        paginas: course.paginas,
        totalCaracteres: course.totalCaracteres,
        modules: course.modules.map(module => ({
          id: module.id,
          title: module.title,
          summary: module.summary,
          charCount: module.charCount,
          source: module.source,
          imageEndpoint: `/api/course/module?id=${module.id}`,
        })),
      });
    }

    if (url.pathname === '/api/course/module') {
      const id = Number(url.searchParams.get('id') || 1);
      const module = course.modules.find(item => item.id === id) || course.modules[id - 1];
      if (!module) return sendJson(res, 404, { error: 'Módulo não encontrado' });
      return sendJson(res, 200, module);
    }

    return sendJson(res, 404, { error: 'Endpoint não encontrado' });
  } catch (error) {
    return sendJson(res, 500, {
      error: 'Falha ao carregar curso real',
      detail: error.message,
    });
  }
}

function generateFallbackResponse(req, res) {
  return sendJson(res, 200, {
    error: 'Gerador em modo mínimo',
    message: 'O curso real fica disponível em /api/course/index e /api/course/module?id=1.',
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/course/index') || req.url.startsWith('/api/course/module')) {
    return apiCourse(req, res);
  }

  if (req.url.startsWith('/api/')) {
    return generateFallbackResponse(req, res);
  }

  return serveStatic(req, res);
}).listen(PORT, () => console.log('Gerador Power rodando em http://localhost:' + PORT));
