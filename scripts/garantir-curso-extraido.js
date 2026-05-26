const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data');
const OUT_PATH = path.join(OUT_DIR, 'curso-extraido.json');
const CHUNK_PREFIX = 'curso-extraido.json.gz.b64.';

function readChunkedCourse() {
  if (!fs.existsSync(OUT_DIR)) return null;
  const files = fs.readdirSync(OUT_DIR)
    .filter((file) => file.startsWith(CHUNK_PREFIX))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!files.length) return null;

  const encoded = files
    .map((file) => fs.readFileSync(path.join(OUT_DIR, file), 'utf8'))
    .join('')
    .replace(/\s+/g, '');

  const json = zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
  const parsed = JSON.parse(json);

  if (!Array.isArray(parsed.modules) || parsed.modules.length < 30) {
    throw new Error(`Curso compactado incompleto: ${parsed.modules?.length || 0}/30 módulos.`);
  }

  return json;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

try {
  const chunked = readChunkedCourse();
  if (chunked) {
    fs.writeFileSync(OUT_PATH, chunked, 'utf8');
    console.log('data/curso-extraido.json reconstruído a partir dos chunks compactados.');
    process.exit(0);
  }
} catch (error) {
  console.error('Falha ao reconstruir curso compactado:', error.message || error);
  process.exit(1);
}

if (fs.existsSync(OUT_PATH)) {
  console.log('data/curso-extraido.json já existe.');
  process.exit(0);
}

fs.writeFileSync(OUT_PATH, JSON.stringify({
  fonte: 'aguardando public/curso-completo.pdf',
  atualizadoEm: new Date().toISOString(),
  paginas: 0,
  totalCaracteres: 0,
  totalModulos: 0,
  texto: '',
  modules: []
}, null, 2), 'utf8');

console.log('PDF/chunks ainda não enviados. Criado data/curso-extraido.json vazio para não quebrar o build.');
