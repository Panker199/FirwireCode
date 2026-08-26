let fetchFn = globalThis.fetch?.bind(globalThis);
if (!fetchFn) {
  try {
    fetchFn = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
  } catch {
    fetchFn = null;
  }
}
const fetch = fetchFn;

// ── Groq Provider ──

async function askGroq(messages, apiKey, model) {
  if (!fetch) throw new Error("No fetch available. Please restart the app.");
  if (!apiKey) throw new Error("No API key provided.");
  let res;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || "qwen/qwen3.6-27b",
        messages,
        temperature: 0.7,
        top_p: 0.95
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (err) {
    if (err.name === "TimeoutError") throw new Error("Request timed out after 30s. Check your internet connection.");
    if (err.cause?.code === "ECONNREFUSED") throw new Error("Connection refused. Check your internet connection.");
    if (err.cause?.code === "ENOTFOUND") throw new Error("Cannot resolve api.groq.com. Check your internet connection.");
    throw new Error(`Network error: ${err.message}`);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data && data.error && data.error.message;
    throw new Error(detail || `Groq API error (${res.status})`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq API returned no content");
  return content;
}

async function testGroqKey(apiKey) {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    method: "GET",
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, status: res.status, message: data?.error?.message || `Error ${res.status}` };
  }
  return { ok: true, status: res.status };
}

// ── Ollama Provider ──

async function askOllama(messages, baseUrl, model) {
  if (!fetch) throw new Error("No fetch available. Please restart the app.");
  const url = (baseUrl || "http://localhost:11434") + "/api/chat";
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "llama3.2",
        messages,
        stream: false
      }),
      signal: AbortSignal.timeout(60000)
    });
  } catch (err) {
    if (err.name === "TimeoutError") throw new Error("Request timed out after 60s. Ollama may be processing a large model.");
    if (err.cause?.code === "ECONNREFUSED") throw new Error(`Cannot connect to Ollama at ${url}. Is Ollama running?`);
    if (err.cause?.code === "ENOTFOUND") throw new Error(`Cannot resolve ${url}. Check the Ollama URL in Settings.`);
    throw new Error(`Network error: ${err.message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama error (${res.status}): ${text}`);
  }

  const data = await res.json().catch(() => null);
  const content = data?.message?.content;
  if (!content) throw new Error("Ollama returned no content");
  return content;
}

async function testOllamaConnection(baseUrl) {
  try {
    const res = await fetch((baseUrl || "http://localhost:11434") + "/api/tags", {
      method: "GET",
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { ok: false, message: `Ollama returned ${res.status}` };
    const data = await res.json().catch(() => null);
    const models = data?.models?.map(m => m.name) || [];
    return { ok: true, models };
  } catch (err) {
    return { ok: false, message: err.message || "Cannot connect to Ollama" };
  }
}

// ── Gemini Provider ──

async function askGemini(messages, apiKey, model) {
  if (!fetch) throw new Error("No fetch available. Please restart the app.");
  if (!apiKey) throw new Error("No API key provided.");

  const geminiModel = model || "gemini-3.6-flash";
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  const systemMsg = messages.find(m => m.role === "system");
  const body = { contents };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }
  body.generationConfig = { temperature: 0.7, topP: 0.95 };

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000)
      }
    );
  } catch (err) {
    if (err.name === "TimeoutError") throw new Error("Request timed out after 60s.");
    if (err.cause?.code === "ENOTFOUND") throw new Error("Cannot resolve generativelanguage.googleapis.com. Check your internet.");
    throw new Error(`Network error: ${err.message}`);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.error?.message;
    throw new Error(detail || `Gemini API error (${res.status})`);
  }

  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini API returned no content");
  return content;
}

async function testGeminiKey(apiKey) {
  if (!apiKey) return { ok: false, status: 0, message: "No key provided" };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: "GET", signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { ok: false, status: res.status, message: data?.error?.message || `Error ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, message: err.message || "Cannot reach Gemini API" };
  }
}

// ── Auto Model Detection ──

const GROQ_PRIORITY = ["qwen/qwen3.6-27b", "openai/gpt-oss-120b", "allam-2-7b"];
const GEMINI_PRIORITY = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];

async function testModel(apiKey, provider, model) {
  const testMessages = [{ role: "user", content: "Say OK" }];
  const start = Date.now();
  try {
    if (provider === "groq") {
      await askGroq(testMessages, apiKey, model);
    } else if (provider === "gemini") {
      await askGemini(testMessages, apiKey, model);
    } else {
      return { ok: false, model, latency: 0, error: "Unknown provider" };
    }
    return { ok: true, model, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, model, latency: Date.now() - start, error: err.message };
  }
}

async function detectGroqModels(apiKey) {
  if (!apiKey) return { ok: false, models: [], error: "No API key" };
  const results = [];
  for (const model of GROQ_PRIORITY) {
    const result = await testModel(apiKey, "groq", model);
    results.push(result);
  }
  return { ok: true, models: results };
}

async function detectGeminiModels(apiKey) {
  if (!apiKey) return { ok: false, models: [], error: "No API key" };
  const results = [];
  for (const model of GEMINI_PRIORITY) {
    const result = await testModel(apiKey, "gemini", model);
    results.push(result);
  }
  return { ok: true, models: results };
}

async function detectBestModel(providers) {
  const results = [];

  if (providers.groq) {
    for (const model of GROQ_PRIORITY) {
      const r = await testModel(providers.groq, "groq", model);
      if (r.ok) results.push({ provider: "groq", ...r });
    }
  }

  if (providers.gemini) {
    for (const model of GEMINI_PRIORITY) {
      const r = await testModel(providers.gemini, "gemini", model);
      if (r.ok) results.push({ provider: "gemini", ...r });
    }
  }

  if (results.length === 0) {
    return { ok: false, best: null, all: results, error: "No models available" };
  }

  results.sort((a, b) => a.latency - b.latency);
  return { ok: true, best: results[0], all: results };
}

module.exports = {
  askGroq, testGroqKey,
  askOllama, testOllamaConnection,
  askGemini, testGeminiKey,
  detectGroqModels, detectGeminiModels, detectBestModel,
  GROQ_PRIORITY, GEMINI_PRIORITY
};
