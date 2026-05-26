const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const ROOT = path.join(__dirname, '..');
const PDF_PATH = path.join(ROOT, 'public', 'curso-completo.pdf');
const OUT_DIR = path.join(ROOT, 'data');
const OUT_PATH = path.join(OUT_DIR, 'curso-extraido.json');

function limparTexto(texto) {
  return String(texto || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizarTitulo(titulo, fallback) {
  return String(titulo || fallback || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

function dividirEmModulos(texto) {
  const partes = texto
    .split(/(?=(?:^|\n)\s*(?:m[oó]dulo|aula)\s+\d{1,2}\b[^\n]*)/gi)
    .map((parte) => parte.trim())
    .filter(Boolean);

  const candidatos = partes.length > 1 ? partes : texto
    .split(/(?=(?:^|\n)\s*\d{1,2}\s*[\-–—.]\s+[^\n]{8,})/g)
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (candidatos.length <= 1) {
    return [{
      id: 1,
      title: 'Conteúdo completo do curso',
      summary: texto.split(/\n+/).find(Boolean) || 'Conteúdo extraído do PDF completo.',
      content: texto,
      imageDescription: 'curso de bordado completo',
      imageQueries: ['embroidery textile craft', 'hand embroidery'],
      charCount: texto.length,
      source: 'pdf-extraido'
    }];
  }

  return candidatos.map((conteudo, index) => {
    const linhas = conteudo.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const titulo = normalizarTitulo(linhas[0], `Módulo ${index + 1}`);
    const resumo = normalizarTitulo(linhas.slice(1).find((l) => l.length > 30), titulo);
    return {
      id: index + 1,
      title: titulo,
      summary: resumo || titulo,
      content: conteudo,
      imageDescription: titulo,
      imageQueries: [titulo, 'embroidery textile craft', 'hand embroidery'],
      charCount: conteudo.length,
      source: 'pdf-extraido'
    };
  });
}

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error('Arquivo public/curso-completo.pdf não encontrado. Envie o PDF completo para essa pasta.');
  }

  const buffer = fs.readFileSync(PDF_PATH);
  const resultado = await pdf(buffer);
  const texto = limparTexto(resultado.text);

  if (!texto || texto.length < 100) {
    throw new Error('O PDF foi lido, mas quase nenhum texto foi extraído. Verifique se o PDF não é apenas imagem escaneada.');
  }

  const modules = dividirEmModulos(texto);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify({
    fonte: 'public/curso-completo.pdf',
    atualizadoEm: new Date().toISOString(),
    paginas: resultado.numpages,
    totalCaracteres: texto.length,
    totalModulos: modules.length,
    texto,
    modules
  }, null, 2), 'utf8');

  console.log(`Curso extraído com sucesso: ${resultado.numpages} páginas, ${modules.length} módulos.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
