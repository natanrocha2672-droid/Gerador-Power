const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data');
const OUT_PATH = path.join(OUT_DIR, 'curso-extraido.json');

if (fs.existsSync(OUT_PATH)) {
  console.log('data/curso-extraido.json já existe.');
  process.exit(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify({
  fonte: 'aguardando public/curso-completo.pdf',
  atualizadoEm: new Date().toISOString(),
  paginas: 0,
  totalCaracteres: 0,
  totalModulos: 0,
  texto: '',
  modules: []
}, null, 2), 'utf8');

console.log('PDF ainda não enviado. Criado data/curso-extraido.json vazio para não quebrar o build.');
