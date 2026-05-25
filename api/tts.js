const BUILT_IN_VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse", "marin", "cedar"
]);

function sanitizeText(value, max = 4096) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, max);
}

function sanitizeVoice(value) {
  const voice = sanitizeText(value, 40).toLowerCase();
  return BUILT_IN_VOICES.has(voice) ? voice : "marin";
}

function sanitizeSpeed(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1.6, Math.max(0.8, n));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY não foi configurada no ambiente do deploy." });
  }

  const body = req.body || {};
  const input = sanitizeText(body.text);
  const voice = sanitizeVoice(body.voice);
  const speed = sanitizeSpeed(body.speed);

  if (!input) {
    return res.status(400).json({ error: "Texto vazio para narração." });
  }

  try {
    const apiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        input,
        voice,
        response_format: "mp3",
        speed,
        instructions: "Narre em português brasileiro padrão, com dicção clara, ritmo didático, acolhedor e natural. Pronuncie termos técnicos de bordado com calma."
      })
    });

    if (!apiRes.ok) {
      let message = `Erro OpenAI TTS HTTP ${apiRes.status}`;
      try {
        const data = await apiRes.json();
        message = data?.error?.message || message;
      } catch (_) {}
      return res.status(apiRes.status).json({ error: message });
    }

    const audio = Buffer.from(await apiRes.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audio);
  } catch (error) {
    return res.status(500).json({ error: `Falha ao gerar narração OpenAI: ${error.message}` });
  }
};
