const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const FALLBACK_TITLES = [
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

function svgData(title) {
  const safe = String(title || 'Imagem do módulo').replace(/[<>&]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760"><rect width="1200" height="760" fill="#c85a42"/><text x="70" y="590" font-family="Georgia" font-size="46" font-weight="700" fill="white">${safe.slice(0, 70)}</text><text x="70" y="655" font-family="Arial" font-size="26" fill="#fff3e8">Imagem ilustrativa do curso de bordado</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function normalizeModule(m, i, source) {
  const title = m.title || m.titulo || FALLBACK_TITLES[i] || `Módulo ${i + 1}`;
  const content = String(m.content || m.conteudo || '');
  return {
    id: Number(m.id || i + 1),
    title,
    summary: m.summary || m.resumo || content.split(/\n+/).find(Boolean) || '',
    content,
    imageDescription: m.imageDescription || m.descricaoImagem || title,
    imageQueries: m.imageQueries && m.imageQueries.length ? m.imageQueries : [title, 'embroidery textile craft'],
    fallbackImage: m.fallbackImage || svgData(title),
    charCount: Number(m.charCount || m.totalCaracteres || content.length),
    source: m.source || source
  };
}

function fallbackCourse() {
  return FALLBACK_TITLES.map((title, i) => ({
    id: i + 1,
    title,
    summary: 'Módulo do curso de bordado.',
    content: `${title}\n\nConteúdo real do curso ainda não carregado no backend.`,
    imageDescription: title,
    imageQueries: [title, 'embroidery textile craft'],
    fallbackImage: svgData(title),
    charCount: title.length,
    source: 'fallback'
  }));
}

function readPdfExtractedCourse(root) {
  const file = path.join(root, 'data', 'curso-extraido.json');
  if (!fs.existsSync(file)) throw new Error('data/curso-extraido.json não encontrado');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rawModules = Array.isArray(parsed.modules) ? parsed.modules : (Array.isArray(parsed.modulos) ? parsed.modulos : []);

  if (rawModules.length) {
    const modules = rawModules.map((m, i) => normalizeModule(m, i, 'pdf-extraido')).filter((m) => m.id && m.content);
    if (modules.length) return modules;
  }

  const texto = String(parsed.texto || parsed.text || '').trim();
  if (texto) return [normalizeModule({ id: 1, title: 'Conteúdo completo do curso', summary: 'Conteúdo extraído do PDF completo.', content: texto, source: 'pdf-extraido' }, 0, 'pdf-extraido')];

  throw new Error('curso-extraido.json vazio');
}

function readCourseB64(root) {
  const dir = path.join(root, 'data');
  if (!fs.existsSync(dir)) throw new Error('Diretório data não encontrado');
  const neutralKeys = {
    'c08_0003.txt': '08.00.02.05.00.01.00.00.00.03',
    'c08_0006.txt': '08.00.02.05.00.01.00.00.00.04',
    'c08_0007.txt': '08.00.02.05.00.01.00.00.00.05'
  };
  const files = fs.readdirSync(dir)
    .map((f) => {
      if (/^course-data\.b64\.\d+(?:\.\d+)*$/.test(f)) return { f, key: f.replace(/^course-data\.b64\./, '') };
      if (neutralKeys[f]) return { f, key: neutralKeys[f] };
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  if (!files.length) throw new Error('Chunks course-data.b64.* não encontrados');
  return files.map((x) => fs.readFileSync(path.join(dir, x.f), 'utf8')).join('').replace(/\s+/g, '');
}

function loadCourseFromFiles(root) {
  try {
    return readPdfExtractedCourse(root);
  } catch (e) {
    console.error('Falha ao carregar curso extraído do PDF:', e.message);
  }

  try {
    const raw = zlib.gunzipSync(Buffer.from(readCourseB64(root), 'base64')).toString('utf8');
    const parsed = JSON.parse(raw);
    const modules = (parsed.modules || parsed).map((m, i) => normalizeModule(m, i, 'uploaded-course-data')).filter((m) => m.id && m.content);
    if (modules.length < 1) throw new Error('Curso vazio');
    return modules;
  } catch (e) {
    console.error('Falha ao carregar course-data:', e.message);
    return fallbackCourse();
  }
}

module.exports = { loadCourseFromFiles };
