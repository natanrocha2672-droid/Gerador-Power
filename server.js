const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const TTS_VOICES = new Set(["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse"]);

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
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
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

function sanitizeText(value, max = 4000) {
  return String(value || "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function sanitizeVoice(value) {
  const voice = sanitizeText(value, 40).toLowerCase();
  return TTS_VOICES.has(voice) ? voice : "coral";
}

function sanitizeSpeed(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.95;
  return Math.min(1.15, Math.max(0.85, n));
}

function buildPrompt(payload) {
  const mode = sanitizeText(payload.mode, 80);
  const level = sanitizeText(payload.level, 120);
  const prompt = sanitizeText(payload.prompt, 4000);
  const mod = payload.module || {};
  const moduleTitle = sanitizeText(mod.title, 200);
  const moduleSummary = sanitizeText(mod.summary, 800);
  const moduleTopics = Array.isArray(mod.topics) ? mod.topics.map(x => sanitizeText(x, 300)).join("; ") : "";
  const common = `\nContexto do curso:\n- Módulo selecionado: ${moduleTitle || "não informado"}\n- Resumo do módulo: ${moduleSummary || "não informado"}\n- Tópicos do módulo: ${moduleTopics || "não informado"}\n- Nível do aluno: ${level || "não informado"}\n- Pedido do usuário: ${prompt || "sem pedido adicional"}\n\nResponda em português do Brasil, com tom didático, direto e prático.\nNão apresente fatos históricos incertos como certeza absoluta.\nQuando sugerir prática manual, inclua segurança, teste em retalho e critérios de avaliação.\n`;
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
  for (const item of data.output || []) for (const content of item.content || []) {
    if (typeof content.text === "string") chunks.push(content.text);
    if (typeof content.output_text === "string") chunks.push(content.output_text);
  }
  return chunks.join("\n").trim();
}

async function handleAtelier(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Use POST." });
  if (!process.env.OPENAI_API_KEY) return json(res, 500, { error: "OPENAI_API_KEY não foi configurada no servidor." });
  let payload;
  try { payload = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "JSON inválido ou payload grande demais." }); }
  const input = buildPrompt(payload);
  const model = process.env.OPENAI_MODEL || "gpt-5.5";
  try {
    const apiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, instructions: "Você é uma mentora especialista em bordado, design têxtil e ensino para iniciantes. Seja útil, seguro e estruturado.", input })
    });
    const data = await apiRes.json();
    if (!apiRes.ok) return json(res, apiRes.status, { error: data?.error?.message || `Erro OpenAI HTTP ${apiRes.status}` });
    return json(res, 200, { text: extractText(data) || "A resposta veio vazia. Tente reformular o pedido.", model });
  } catch (error) { return json(res, 500, { error: `Falha ao consultar OpenAI: ${error.message}` }); }
}

async function handleTTS(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Use POST." });
  if (!process.env.OPENAI_API_KEY) return json(res, 500, { error: "OPENAI_API_KEY não foi configurada no servidor." });
  let payload;
  try { payload = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "JSON inválido ou payload grande demais." }); }
  const input = sanitizeText(payload.text, 4096);
  if (!input) return json(res, 400, { error: "Texto vazio para narração." });
  const voice = sanitizeVoice(payload.voice);
  const speed = sanitizeSpeed(payload.speed);
  try {
    const apiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts", input, voice, response_format: "mp3", speed, instructions: "Narre somente o texto recebido, sem ler estas instruções. Português do Brasil. Narração de aula artesanal, natural, acolhedora e humana. Evite voz robótica, metálica ou monocórdia. Use pausas naturais, variação leve de entonação e pronúncia brasileira clara." })
    });
    if (!apiRes.ok) {
      let message = `Erro OpenAI TTS HTTP ${apiRes.status}`;
      try { const data = await apiRes.json(); message = data?.error?.message || message; } catch {}
      return json(res, apiRes.status, { error: message });
    }
    const audio = Buffer.from(await apiRes.arrayBuffer());
    res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-OpenAI-TTS-Voice": voice });
    return res.end(audio);
  } catch (error) { return json(res, 500, { error: `Falha ao gerar narração OpenAI: ${error.message}` }); }
}

async function handlePexels(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Use GET." });
  if (!process.env.PEXELS_API_KEY) return json(res, 500, { error: "PEXELS_API_KEY não foi configurada na Vercel." });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = sanitizeText(url.searchParams.get("query") || "embroidery", 120);
  const perPage = Math.min(Math.max(Number(url.searchParams.get("per_page") || 1), 1), 12);
  if (!query) return json(res, 400, { error: "Parâmetro query é obrigatório." });

  try {
    const apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&locale=pt-BR`;
    const apiRes = await fetch(apiUrl, { headers: { Authorization: process.env.PEXELS_API_KEY } });
    const data = await apiRes.json().catch(() => ({}));
    if (!apiRes.ok) return json(res, apiRes.status, { error: data?.error || `Erro Pexels HTTP ${apiRes.status}` });
    const images = Array.isArray(data.photos) ? data.photos.map(photo => ({
      id: photo.id,
      url: photo.src?.large2x || photo.src?.large || photo.src?.medium || photo.src?.original,
      thumb: photo.src?.medium || photo.src?.small,
      photographer: photo.photographer,
      photographer_url: photo.photographer_url,
      pexels_url: photo.url,
      alt: photo.alt || query
    })).filter(img => img.url) : [];
    return json(res, 200, { images, query });
  } catch (error) {
    return json(res, 500, { error: `Falha ao buscar imagens no Pexels: ${error.message}` });
  }
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/" || pathname === "/curso") pathname = "/curso-completo.html";
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Arquivo não encontrado."); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith("/api/atelier")) return handleAtelier(req, res);
  if (req.url.startsWith("/api/tts")) return handleTTS(req, res);
  if (req.url.startsWith("/api/pexels")) return handlePexels(req, res);
  return serveStatic(req, res);
}).listen(PORT, () => console.log(`Site rodando em http://localhost:${PORT}`));
