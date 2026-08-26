const STORAGE_KEY = "wormgpt-data";

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function saveData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
function stripThinking(text) { return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim(); }

async function askGroq(messages, apiKey, model) {
  if (!apiKey) throw new Error("No Groq API key set.");
  const res = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, model: model || "qwen/qwen3.6-27b", apiKey }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Groq API error (${res.status})`);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned no content");
  return content;
}

async function askGemini(messages, apiKey, model) {
  if (!apiKey) throw new Error("No Gemini API key set.");
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, model: model || "gemini-3.6-flash", apiKey }),
    signal: AbortSignal.timeout(60000)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Gemini API error (${res.status})`);
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini returned no content");
  return content;
}

function noop() {}
function noopAsync() { return Promise.resolve(null); }

export function initBrowserWormgpt() {
  if (window.wormgpt) return;

  window.wormgpt = {
    async chat(messages) {
      const d = loadData();
      const provider = d.provider || "groq";
      if (provider === "gemini") {
        const key = d.geminiApiKey;
        if (!key) throw new Error("No Gemini API key. Open Settings to add one.");
        return stripThinking(await askGemini(messages, key, d.geminiModel || "gemini-3.6-flash"));
      }
      const key = d.apiKey;
      if (!key) throw new Error("No Groq API key. Open Settings to add one.");
      return stripThinking(await askGroq(messages, key, d.groqModel || "qwen/qwen3.6-27b"));
    },
    saveKey(provider, key) {
      const d = loadData();
      if (provider === "gemini") d.geminiApiKey = key; else d.apiKey = key;
      saveData(d);
    },
    revokeKey() { const d = loadData(); delete d.apiKey; delete d.geminiApiKey; saveData(d); },
    testKey(provider, key) {
      if (provider === "gemini") {
        return fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`).then(r => ({ ok: r.ok, status: r.status })).catch(() => ({ ok: false, status: 0 }));
      }
      return fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` } }).then(r => ({ ok: r.ok, status: r.status })).catch(() => ({ ok: false, status: 0 }));
    },
    keyStatus() { const d = loadData(); return { groq: Boolean(d.apiKey), gemini: Boolean(d.geminiApiKey) }; },
    loadChats() { const d = loadData(); return d.chats || null; },
    saveChats(chats) { const d = loadData(); d.chats = chats; saveData(d); },
    deleteThread() {},
    getProvider() {
      const d = loadData();
      return { provider: d.provider || "groq", groqModel: d.groqModel || "qwen/qwen3.6-27b", geminiModel: d.geminiModel || "gemini-3.6-flash" };
    },
    setProvider(p) { const d = loadData(); d.provider = p; saveData(d); },
    setGroqModel(m) { const d = loadData(); d.groqModel = m; saveData(d); },
    setGeminiModel(m) { const d = loadData(); d.geminiModel = m; saveData(d); },
    setOllamaUrl() {},
    setOllamaModel() {},
    async detectBest() {
      const d = loadData();
      const results = [];
      if (d.apiKey) {
        for (const m of ["qwen/qwen3.6-27b", "openai/gpt-oss-120b", "allam-2-7b"]) {
          try {
            const start = Date.now();
            await askGroq([{ role: "user", content: "Say OK" }], d.apiKey, m);
            results.push({ provider: "groq", model: m, latency: Date.now() - start });
            break;
          } catch {}
        }
      }
      if (d.geminiApiKey) {
        for (const m of ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash"]) {
          try {
            const start = Date.now();
            await askGemini([{ role: "user", content: "Say OK" }], d.geminiApiKey, m);
            results.push({ provider: "gemini", model: m, latency: Date.now() - start });
            break;
          } catch {}
        }
      }
      if (results.length === 0) return { ok: false, best: null, all: [] };
      results.sort((a, b) => a.latency - b.latency);
      return { ok: true, best: results[0], all: results };
    },
    minimize: noop,
    maximize: noop,
    close: noop,
    executeCode: noopAsync,
    completeCode: noopAsync,
    getSystemInfo: noopAsync,
    testOllama: noopAsync,
    getOllamaModels: noopAsync,
    listSkills: noopAsync,
    getSkill: noopAsync,
    executeSkill: noopAsync
  };
}

initBrowserWormgpt();
