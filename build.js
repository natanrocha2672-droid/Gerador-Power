const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const input = path.join(__dirname, 'data', 'curso-extraido.json');
const output = path.join(__dirname, 'course-data.generated.js');

if (!fs.existsSync(input)) {
  throw new Error('Arquivo data/curso-extraido.json não encontrado para gerar course-data.generated.js');
}

const raw = fs.readFileSync(input);
const encoded = zlib.gzipSync(raw, { level: 9 }).toString('base64');
fs.writeFileSync(output, `module.exports='${encoded}';\n`);
console.log(`course-data.generated.js criado com ${encoded.length} caracteres base64.`);
