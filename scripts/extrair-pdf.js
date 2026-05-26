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
    .replace(/26\/05\/2026,\s*10:24\s*Mestre do Bordado - Curso Completo/gi, '')
    .replace(/file:\/\/\/[^\n]+/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizarTitulo(titulo, fallback) {
  return String(titulo || fallback || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function resumoDoConteudo(conteudo, titulo) {
  const linha = conteudo
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => l.length > 60 && !/^curso de bordado/i.test(l) && !/^m[oó]dulo/i.test(l));
  return normalizarTitulo(linha, titulo);
}

function tituloDoModulo(conteudo, index) {
  const linhas = conteudo.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const titulo = linhas.find((l) => /^m[oó]dulo\s+/i.test(l) && !/^m[oó]dulo\s+\d+:/i.test(l));
  return normalizarTitulo(titulo || linhas[1] || linhas[0], `Módulo ${index + 1}`);
}

function dividirEmModulos(texto) {
  const inicio = texto.search(/(?:^|\n)\s*CURSO DE BORDADO\s*-\s*M[ÓO]DULO\s+1\b/i);
  const corpo = inicio >= 0 ? texto.slice(inicio) : texto;

  const partes = corpo
    .split(/(?=(?:^|\n)\s*CURSO DE BORDADO\s*-\s*M[ÓO]DULO\s+\d{1,2}\b)/gi)
    .map((parte) => parte.trim())
    .filter((parte) => /^CURSO DE BORDADO\s*-\s*M[ÓO]DULO\s+\d{1,2}\b/i.test(parte));

  if (partes.length !== 30) {
    throw new Error(`Foram detectados ${partes.length} módulos reais no PDF; esperado: 30.`);
  }

  return partes.map((conteudo, index) => {
    const titulo = tituloDoModulo(conteudo, index);
    return {
      id: index + 1,
      title: titulo,
      summary: resumoDoConteudo(conteudo, titulo),
      content: conteudo,
      imageDescription: titulo,
      imageQueries: [titulo, 'bordado técnica têxtil', 'embroidery textile craft'],
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
