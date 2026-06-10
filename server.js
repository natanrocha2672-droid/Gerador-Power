const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const COURSE_FILE = path.join(ROOT, 'data', 'curso-extraido.json');
let courseCache = null;

const TITLES = [
  'Arqueologia Têxtil e as Origens do Bordado na Antiguidade',
  'A Idade Média: Opus Anglicanum e a Sacralidade do Ponto',
  'Renascimento e a Codificação dos Padrões: O Surgimento dos Modelbooks',
  'O Bordado na Era Industrial e a Revolução das Máquinas de Costura',
  'Fibras Naturais e Sintéticas: Química e Morfologia dos Fios e Substratos',
  'Ergonomia, Ferramental e a Preparação Técnica do Bastidor Profissional',
  'Morfologia dos Pontos de Linha: Hastes, Cadeias e Nós Franceses',
  'Sombreado e Pintura com Agulha (Needle Painting): Teoria da Cor e Degradê',
  'Bordado Branco (Whitework): Hardanger, Mountmellick e Richelieu',
  'Técnica de Crewel: Lãs, Texturas e o Estilo Jacobino',
  'Bordado de Ouro (Goldwork) I: Técnicas de Couching e Or Nué',
  'Bordado de Ouro (Goldwork) II: Relevos, Cartolina e Purling',
  'Shisha e Espelhamento: Tradições da Ásia Central e Subcontinente Indiano',
  'Sashiko e Kogin: A Estética do Reparo e a Geometria Japonesa',
  'Zardosi: O Bordado Imperial Persa e Indo-Islâmico',
  'Alta Costura: A Técnica de Crochet de Luneville e Tambour',
  'Aplicação de Pedrarias e Paetês: Estruturas Tridimensionais e Peso',
  'Stumpwork e Bordado em Relevo: Escultura Têxtil e Aramagem',
  'Bordado Brasileiro: O Uso de Fios de Seda e a Flora Tridimensional',
  'Rendas de Agulha e Ponto de Veneza: A Transição do Bordado para a Renda',
  'Conservação e Restauro de Têxteis Históricos: Ética e Metodologia',
  'Design de Padrões e Cartografia do Ponto: Do Croquis ao Risco Final',
  'Digitalização e Bordado Computadorizado: Software e Vetorização',
  'Gestão de Ateliê: Orçamentação, Precificação e Direitos Autorais',
  'Curadoria e Exposição: A Narrativa do Bordado em Espaços Museológicos',
  'Bordado na Arte Contemporânea: Ativismo e Instalações Têxteis',
  'Engenharia de Materiais Não Convencionais no Bordado Experimental',
  'Alfaiataria e Bordado: Estruturação de Trajes de Gala e Fardamentos',
  'Fotografia e Documentação Técnica de Obras Têxteis',
  'Projeto Final: Dissertação Prática e Criação de Coleção Autoral',
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

  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Acesso negado');
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return send(res, 404, 'Arquivo não encontrado');

  send(res, 200, fs.readFileSync(filePath), staticType(filePath));
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

function titleFromContent(content, fallback) {
  const lines = String(content || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const heading = lines.find(line => /^M[óo]dulo\s+(?:[IVXLCDM]+|\d+)/i.test(line) && line.length > 10);
  if (heading) return clean(heading.replace(/^M[óo]dulo\s+(?:[IVXLCDM]+|\d+)\s*[:\-]?\s*/i, ''), 180);
  return clean(lines.find(line => line.length > 20) || fallback, 180);
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

function buildModule(raw, item, index, positions) {
  const start = item.index;
  const end = index + 1 < positions.length ? positions[index + 1].index : raw.length;
  const content = raw.slice(start, end).trim();
  const id = item.id || index + 1;
  return {
    id,
    title: item.title || titleFromContent(content, TITLES[id - 1] || `Módulo ${id}`),
    summary: summaryFromContent(content),
    content,
    charCount: content.length,
    source: item.source || 'data/curso-extraido.json',
  };
}

function modulesFromPositions(raw, positions) {
  return positions.slice(0, 30).map((item, index) => buildModule(raw, item, index, positions));
}

function markerPositions(raw) {
  const marker = /CURSO\s+DE\s+B\s*O\s*R\s*D\s*A\s*D\s*O\s*[-–—]\s*M\s*[ÓO]\s*D\s*U\s*L\s*O\s+(\d+)/gi;
  return [...raw.matchAll(marker)].map(match => ({
    id: Number(match[1]),
    index: match.index,
    source: 'marker',
  }));
}

function courseBodyStart(raw) {
  const markers = markerPositions(raw);
  if (markers.length) return markers[0].index;
  const markerText = raw.search(/CURSO\s+DE\s+B\s*O\s*R\s*D\s*A\s*D\s*O\s*[-–—]\s*M\s*[ÓO]\s*D\s*U\s*L\s*O\s*1/i);
  if (markerText >= 0) return markerText;
  const afterIndex = raw.search(/M[óo]dulo\s+I\s*:/i);
  if (afterIndex >= 0) return afterIndex;
  return 0;
}

function sectionHeadingPositions(raw) {
  const startAt = courseBodyStart(raw);
  const body = raw.slice(startAt);
  const heading = /(?:^|\n)\s*M[óo]dulo\s+(?:[IVXLCDM]+|\d+)\s*:/gi;
  return [...body.matchAll(heading)].map((match, index) => ({
    id: index + 1,
    index: startAt + match.index + (match[0].startsWith('\n') ? 1 : 0),
    source: 'section-heading',
  }));
}

function titlePositions(raw) {
  const startAt = courseBodyStart(raw);
  const body = raw.slice(startAt);
  const normalizedBody = normalizeText(body);
  const positions = [];

  for (const [index, title] of TITLES.entries()) {
    const normalizedTitle = normalizeText(title);
    const normalizedPosition = normalizedBody.indexOf(normalizedTitle);
    if (normalizedPosition < 0) continue;

    const directPosition = body.indexOf(title);
    positions.push({
      id: index + 1,
      title,
      index: startAt + (directPosition >= 0 ? directPosition : Math.max(0, normalizedPosition - 120)),
      source: 'official-title',
    });
  }

  return positions.sort((a, b) => a.index - b.index).filter((item, index, list) => index === 0 || item.id !== list[index - 1].id);
}

function fallbackChunkModules(raw) {
  const startAt = courseBodyStart(raw);
  const body = raw.slice(startAt).trim();
  const chunkSize = Math.ceil(body.length / 30);
  const positions = TITLES.map((title, index) => ({
    id: index + 1,
    title,
    index: startAt + index * chunkSize,
    source: 'balanced-chunk',
  }));
  return modulesFromPositions(raw, positions);
}

function validModules(modules) {
  return modules.length >= 30 && modules.slice(0, 30).every(module => module.charCount > 500);
}

function splitModules(text) {
  const raw = String(text || '');
  const strategies = [markerPositions(raw), sectionHeadingPositions(raw), titlePositions(raw)];

  for (const positions of strategies) {
    if (positions.length < 30) continue;
    const modules = modulesFromPositions(raw, positions);
    if (validModules(modules)) return modules;
  }

  const chunks = fallbackChunkModules(raw);
  if (validModules(chunks)) return chunks;

  throw new Error(`Marcadores: ${strategies[0].length}; cabeçalhos: ${strategies[1].length}; títulos oficiais pós-índice: ${strategies[2].length}/30.`);
}

function loadCourse() {
  if (courseCache) return courseCache;
  if (!fs.existsSync(COURSE_FILE)) throw new Error('Arquivo data/curso-extraido.json não encontrado no deploy.');

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
    return sendJson(res, 500, { error: 'Falha ao carregar curso real', detail: error.message });
  }
}

function generateFallbackResponse(req, res) {
  return sendJson(res, 200, {
    error: 'Gerador em modo mínimo',
    message: 'O curso real fica disponível em /api/course/index e /api/course/module?id=1.',
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/course/index') || req.url.startsWith('/api/course/module')) return apiCourse(req, res);
  if (req.url.startsWith('/api/')) return generateFallbackResponse(req, res);
  return serveStatic(req, res);
}).listen(PORT, () => console.log('Gerador Power rodando em http://localhost:' + PORT));
