const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

function readBody(req, limitBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > limitBytes) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function sanitizeText(value, max = 4000) {
  return String(value || "").replace(/\u0000/g, "").slice(0, max);
}

function buildPrompt(payload) {
  const mode = sanitizeText(payload.mode, 80);
  const level = sanitizeText(payload.level, 120);
  const prompt = sanitizeText(payload.prompt, 4000);
  const mod = payload.module || {};
  const moduleTitle = sanitizeText(mod.title, 200);
  const moduleSummary = sanitizeText(mod.summary, 800);
  const moduleTopics = Array.isArray(mod.topics) ? mod.topics.map(x => sanitizeText(x, 300)).join("; ") : "";

  const common = `
Contexto do curso:
- Módulo selecionado: ${moduleTitle || "não informado"}
- Resumo do módulo: ${moduleSummary || "não informado"}
- Tópicos do módulo: ${moduleTopics || "não informado"}
- Nível do aluno: ${level || "não informado"}
- Pedido do usuário: ${prompt || "sem pedido adicional"}

Responda em português do Brasil, com tom didático, direto e prático.
Não apresente fatos históricos incertos como certeza absoluta.
Quando sugerir prática manual, inclua segurança, teste em retalho e critérios de avaliação.
`;

  const byMode = {
    projeto: "Crie um projeto de bordado customizado com nome, objetivo, materiais, paleta, pontos, sequência de execução, tempo estimado, variações e checklist final.",
    diagnostico: "Diagnostique o problema técnico descrito. Liste causas prováveis, testes rápidos, correções passo a passo e como evitar recorrência.",
    plano: "Monte um plano de estudo progressivo, com rotina semanal, exercícios curtos, metas observáveis e revisão.",
    quiz: "Crie um quiz de fixação com 8 perguntas variadas, alternativas quando útil, gabarito comentado e uma atividade prática final.",
    expandir_modulo: "Expanda o módulo selecionado como uma apostila: explicação, passo a passo, erros comuns, exercício progressivo, avaliação e desafio extra.",
    roteiro: "Crie um roteiro de aula ou vídeo com abertura, materiais, demonstração, prática assistida, dúvidas comuns, encerramento e tarefa.",
    prompt_visual: "Crie prompts visuais para gerar referências de padrão de bordado. Não prometa imagem pronta; entregue prompts claros com composição, estilo, cores e restrições técnicas."
  };

  return `${byMode[mode] || byMode.projeto}\n\n${common}`;
}

function extractText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") chunks.push(content.text);
      if (typeof content.output_text === "string") chunks.push(content.output_text);
    }
  }
  return chunks.join("\n").trim();
}

async function handleAtelier(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Use POST." });
  if (!process.env.OPENAI_API_KEY) {
    return json(res, 500, { error: "OPENAI_API_KEY não foi configurada no servidor. Crie um arquivo .env com OPENAI_API_KEY=..." });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (error) {
    return json(res, 400, { error: "JSON inválido ou payload grande demais." });
  }

  const input = buildPrompt(payload);
  const model = process.env.OPENAI_MODEL || "gpt-5.5";

  try {
    const apiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions: "Você é uma mentora especialista em bordado, design têxtil e ensino para iniciantes. Seja útil, seguro e estruturado.",
        input
      })
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      const message = data?.error?.message || `Erro OpenAI HTTP ${apiRes.status}`;
      return json(res, apiRes.status, { error: message });
    }

    const text = extractText(data) || "A resposta veio vazia. Tente reformular o pedido.";
    return json(res, 200, { text, model });
  } catch (error) {
    return json(res, 500, { error: `Falha ao consultar OpenAI: ${error.message}` });
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml"
};

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Arquivo não encontrado.");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith("/api/atelier")) return handleAtelier(req, res);
  return serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`Site rodando em http://localhost:${PORT}`);
});
