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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY não foi configurada no ambiente do deploy." });
  }

  const payload = req.body || {};
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
      return res.status(apiRes.status).json({ error: message });
    }

    const text = extractText(data) || "A resposta veio vazia. Tente reformular o pedido.";
    return res.status(200).json({ text, model });
  } catch (error) {
    return res.status(500).json({ error: `Falha ao consultar OpenAI: ${error.message}` });
  }
};
