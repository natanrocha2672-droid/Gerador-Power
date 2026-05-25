const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
let COURSE_CACHE = null;
let IMAGE_CACHE = new Map();

function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

function clean(v, max = 4000) {
  return String(v || '').replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function json(res, status, data, cache = 'no-store') {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache });
  res.end(JSON.stringify(data));
}
function readBody(req, limit = 1_000_000) {
  return new Promise((ok, bad) => {
    let b = '';
    req.on('data', c => {
      b += c;
      if (Buffer.byteLength(b) > limit) {
        bad(new Error('Payload muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => ok(b));
    req.on('error', bad);
  });
}
function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|h1|h2|h3|li|div)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
function loadCourse() {
  if (COURSE_CACHE) return COURSE_CACHE;
  const candidates = ['curso-data-full.js', 'curso-html-data.js', 'curso-html-data-compact.js'];
  let text = '';
  for (const file of candidates) {
    const p = path.join(ROOT, file);
    if (fs.existsSync(p)) {
      text = fs.readFileSync(p, 'utf8');
      break;
    }
  }
  if (!text) {
    COURSE_CACHE = [];
    return COURSE_CACHE;
  }
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < 0) {
    COURSE_CACHE = [];
    return COURSE_CACHE;
  }
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    COURSE_CACHE = arr.map((m, i) => {
      const content = stripHtml(m.content || m.body || m.html || m.summary || '');
      const summary = stripHtml(m.summary || content.slice(0, 600));
      const imageDescription = stripHtml(m.imageDescription || (Array.isArray(m.imagePrompts) ? m.imagePrompts.join('\n') : '') || 'bordado artesanal detalhado');
      const imageQueries = Array.isArray(m.imageQueries) ? m.imageQueries : [m.imageQuery || imageDescription || m.title || 'embroidery'];
      return {
        id: Number(m.id || i + 1),
        title: stripHtml(m.title || `Módulo ${i + 1}`).replace(/^Curso de Bordado - /, ''),
        summary,
        content,
        imageDescription,
        imageQueries,
        charCount: content.length
      };
    });
  } catch (e) {
    console.error('Erro ao carregar curso:', e);
    COURSE_CACHE = [];
  }
  return COURSE_CACHE;
}
function extractText(d) {
  if (typeof d.output_text === 'string') return d.output_text;
  const a = [];
  for (const it of d.output || []) for (const c of it.content || []) {
    if (c.text) a.push(c.text);
    if (c.output_text) a.push(c.output_text);
  }
  return a.join('\n').trim();
}

async function handleCourse(req, res) {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const course = loadCourse();
  if (u.pathname === '/api/course/index') {
    return json(res, 200, {
      count: course.length,
      modules: course.map(m => ({ id: m.id, title: m.title, summary: m.summary.slice(0, 360), charCount: m.charCount }))
    }, 'public, max-age=300, s-maxage=3600');
  }
  if (u.pathname === '/api/course/module') {
    const id = Number(u.searchParams.get('id') || 1);
    const m = course.find(x => x.id === id) || course[id - 1];
    if (!m) return json(res, 404, { error: 'Módulo não encontrado.' });
    return json(res, 200, m, 'public, max-age=300, s-maxage=3600');
  }
  return json(res, 404, { error: 'Endpoint de curso não encontrado.' });
}

async function handlePexels(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Use GET.' });
  if (!process.env.PEXELS_API_KEY) return json(res, 500, { error: 'PEXELS_API_KEY não configurada.' });
  const u = new URL(req.url, `http://${req.headers.host}`);
  const q = clean(u.searchParams.get('query') || 'embroidery', 160);
  const n = Math.min(6, Math.max(1, Number(u.searchParams.get('per_page') || 1)));
  const key = `${q}:${n}`;
  if (IMAGE_CACHE.has(key)) return json(res, 200, IMAGE_CACHE.get(key), 'public, max-age=86400, s-maxage=86400');
  try {
    const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${n}&orientation=landscape`, { headers: { Authorization: process.env.PEXELS_API_KEY } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json(res, r.status, { error: d?.error || `Erro Pexels ${r.status}` });
    const data = { query: q, images: (d.photos || []).map(p => ({ url: p.src?.large2x || p.src?.large || p.src?.medium, thumb: p.src?.medium, photographer: p.photographer, alt: p.alt || q })).filter(x => x.url) };
    IMAGE_CACHE.set(key, data);
    return json(res, 200, data, 'public, max-age=86400, s-maxage=86400');
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}

async function handleTTS(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
  if (!process.env.OPENAI_API_KEY) return json(res, 500, { error: 'OPENAI_API_KEY não configurada.' });
  let p;
  try { p = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'JSON inválido.' }); }
  const input = clean(p.text, 4096);
  if (!input) return json(res, 400, { error: 'Texto vazio.' });
  const voices = new Set(['alloy','ash','ballad','coral','echo','fable','onyx','nova','sage','shimmer','verse']);
  const voice = voices.has(clean(p.voice, 40).toLowerCase()) ? clean(p.voice, 40).toLowerCase() : 'coral';
  const speed = Math.min(1.15, Math.max(.85, Number(p.speed) || .95));
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', input, voice, response_format: 'mp3', speed, instructions: 'Narre somente o texto recebido. Português do Brasil natural, humano e didático.' }) });
    if (!r.ok) return json(res, r.status, { error: `Erro TTS ${r.status}` });
    const a = Buffer.from(await r.arrayBuffer());
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
    res.end(a);
  } catch (e) { json(res, 500, { error: e.message }); }
}

async function handleAtelier(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
  if (!process.env.OPENAI_API_KEY) return json(res, 500, { error: 'OPENAI_API_KEY não configurada.' });
  let p;
  try { p = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'JSON inválido.' }); }
  const m = p.module || {};
  const ctx = `Módulo: ${clean(m.title, 200)}. Resumo: ${clean(m.summary, 1200)}. Conteúdo: ${clean(m.content || m.objective, 2500)}. Pergunta: ${clean(p.prompt, 1200)}.`;
  try {
    const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5.5', instructions: 'Você é uma professora especialista em bordado. Responda em português do Brasil, com didática, exemplos práticos e passos claros.', input: ctx }) });
    const d = await r.json();
    if (!r.ok) return json(res, r.status, { error: d?.error?.message || `Erro OpenAI ${r.status}` });
    return json(res, 200, { text: extractText(d) || 'Não consegui responder agora.' });
  } catch (e) { return json(res, 500, { error: e.message }); }
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
function serve(req, res) {
  const u = new URL(req.url, `http://${req.headers.host}`);
  let p = decodeURIComponent(u.pathname);
  if (p === '/' || p === '/curso') p = '/curso-completo.html';
  const f = path.normalize(path.join(ROOT, p));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Arquivo não encontrado.'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': p.endsWith('.html') ? 'no-store' : 'public, max-age=3600' });
    res.end(d);
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/course/')) return handleCourse(req, res);
  if (req.url.startsWith('/api/pexels')) return handlePexels(req, res);
  if (req.url.startsWith('/api/tts')) return handleTTS(req, res);
  if (req.url.startsWith('/api/atelier')) return handleAtelier(req, res);
  serve(req, res);
}).listen(PORT, () => console.log('Site rodando em http://localhost:' + PORT));