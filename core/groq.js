const fetch = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function askGroq(messages, apiKey) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.5
    })
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data && data.error && data.error.message;
    throw new Error(detail || `Groq API error (${res.status})`);
  }

  const content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : null;
  if (!content) throw new Error("Groq API returned no content");

  return content;
}

async function testGroqKey(apiKey) {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`
    }
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data && data.error && data.error.message;
    return {
      ok: false,
      status: res.status,
      message: detail || `Groq API error (${res.status})`
    };
  }

  return { ok: true, status: res.status };
}

module.exports = { askGroq, testGroqKey };
