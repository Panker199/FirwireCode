import { useRef, useState, useEffect, useCallback } from "react";

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

export default function Input({ onSend, off, provider, model, onModel, onSettings }) {
  const [text, setText] = useState("");
  const [det, setDet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const list = MODELS[provider] || MODELS.groq;
  const cur = list.find(m => m.id === model) || list[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

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
        <textarea ref={ref} id="chat-input" name="chat-input" value={text} onChange={resize} onKeyDown={key} placeholder="Type a message..." rows={1} disabled={off} />
      </div>
      <div className="in__bar">
        <div className="in__left">
          <div className="in__model-wrap" ref={menuRef}>
            <button className="in__model" onClick={() => setShowMenu(s => !s)} title="Manage model">
              <span>{model === "auto" ? "AUTO" : cur?.label || model}</span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform: showMenu ? "rotate(180deg)" : "none", transition: "transform 0.15s ease"}}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showMenu && (
              <div className="in__model-menu">
                <div className="in__model-menu-header">Select Model</div>
                <div className="in__model-menu-list">
                  <div
                    className={`in__model-menu-item ${model === "auto" ? "is-active" : ""}`}
                    onClick={() => { onModel("auto"); setShowMenu(false); }}
                  >
                    <div className="in__model-menu-item-icon">
                      {det ? <span className="detect-spin" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}
                    </div>
                    <div className="in__model-menu-item-info">
                      <span className="in__model-menu-item-name">Auto Detect</span>
                      <span className="in__model-menu-item-desc">Best available model</span>
                    </div>
                    {model === "auto" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="in__model-menu-check"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  {list.map(m => (
                    <div
                      key={m.id}
                      className={`in__model-menu-item ${model === m.id ? "is-active" : ""}`}
                      onClick={() => { onModel(m.id); setShowMenu(false); }}
                    >
                      <div className="in__model-menu-item-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>
                      </div>
                      <div className="in__model-menu-item-info">
                        <span className="in__model-menu-item-name">{m.label}</span>
                        <span className="in__model-menu-item-desc">{m.id}</span>
                      </div>
                      {model === m.id && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="in__model-menu-check"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  ))}
                </div>
                <div className="in__model-menu-divider" />
                <div className="in__model-menu-item in__model-menu-manage" onClick={() => { setShowMenu(false); onSettings?.(); }}>
                  <div className="in__model-menu-item-icon">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                  </div>
                  <div className="in__model-menu-item-info">
                    <span className="in__model-menu-item-name">Manage Models</span>
                    <span className="in__model-menu-item-desc">Configure API keys & settings</span>
                  </div>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            )}
          </div>
        </div>
        <button className="in__send" onClick={go} disabled={off || !text.trim()}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}
