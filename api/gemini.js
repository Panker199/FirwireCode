module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, model, apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "API key not set" });
  }

  const geminiModel = model || "gemini-3.6-flash";

  try {
    const contents = messages.filter(m => m.role !== "system").map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const body = { contents };
    const sys = messages.find(m => m.role === "system");
    if (sys) body.systemInstruction = { parts: [{ text: sys.content }] };
    body.generationConfig = { temperature: 0.7, topP: 0.95 };

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || `Gemini API error (${r.status})` });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to call Gemini API" });
  }
};
