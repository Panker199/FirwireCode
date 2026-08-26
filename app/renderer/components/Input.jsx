import { useRef, useState } from "react";

const MODELS = {
  groq: [
    { id: "qwen/qwen3.6-27b", label: "Qwen 3.6 27B" },
    { id: "openai/gpt-oss-120b", label: "GPT OSS 120B" },
    { id: "allam-2-7b", label: "Allam 2 7B" },
  ],
  gemini: [
    { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
    { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
  ],
  ollama: [
    { id: "llama3.2", label: "Llama 3.2" },
    { id: "codellama", label: "CodeLlama" },
    { id: "mistral", label: "Mistral" },
  ],
};

export default function Input({ onSend, off, provider, model, onModel }) {
  const [text, setText] = useState("");
  const [det, setDet] = useState(false);
  const ref = useRef(null);
  const list = MODELS[provider] || MODELS.groq;
  const cur = list.find(m => m.id === model) || list[0];
  const idx = list.findIndex(m => m.id === model);

  function cycle(e) {
    e.stopPropagation();
    onModel(model === "auto" ? list[0].id : list[(idx + 1) % list.length].id);
  }

  async function detect(e) {
    e.stopPropagation();
    setDet(true);
    try { const r = await window.wormgpt?.detectBest(); if (r?.best) onModel(r.best.model); } catch {}
    setDet(false);
  }

  function go() {
    const t = text.trim();
    if (!t || off) return;
    onSend(t);
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function key(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } }
  function resize(e) {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  return (
    <div className={`in ${off ? "is-off" : ""}`}>
      <div className="in__row">
        <textarea ref={ref} value={text} onChange={resize} onKeyDown={key} placeholder="Type a message..." rows={1} disabled={off} />
      </div>
      <div className="in__bar">
        <div className="in__left">
          <button className="in__model" onClick={cycle} title="Switch model">{model === "auto" ? "AUTO" : cur?.label || model}</button>
          {model === "auto" && (
            <button className={`in__btn ${det ? "" : ""}`} onClick={detect} disabled={det} title="Detect best model">
              {det ? <span className="detect-spin" /> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}
            </button>
          )}
        </div>
        <button className="in__send" onClick={go} disabled={off || !text.trim()}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}
