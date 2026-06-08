const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "..", "data", "curso-extraido.json");
const outputPath = path.join(__dirname, "..", "data", "course.js");

if (!fs.existsSync(inputPath)) {
  console.error("Arquivo não encontrado:", inputPath);
  process.exit(1);
}

const course = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (!course.modules || !Array.isArray(course.modules)) {
  console.error("O JSON precisa ter o formato: { title, description, modules: [] }");
  process.exit(1);
}

const output = "window.COURSE_DATA = " + JSON.stringify(course, null, 2) + ";\n";

fs.writeFileSync(outputPath, output, "utf8");

console.log("Curso gerado em data/course.js com " + course.modules.length + " módulos.");
