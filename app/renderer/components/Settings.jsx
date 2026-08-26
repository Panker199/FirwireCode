import { useState, useEffect } from "react";
import { useTheme } from "../ThemeContext.jsx";

export default function Settings({ onClose }) {
  const { mode: theme, setMode: setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("groq");
  const [groqKey, setGroqKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [groqModel, setGroqModel] = useState("qwen/qwen3.6-27b");
  const [geminiModel, setGeminiModel] = useState("gemini-3.6-flash");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true));
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await window.wormgpt?.getProvider();
      if (data) {
        setProvider(data.provider || "groq");
        setGroqModel(data.groqModel || "qwen/qwen3.6-27b");
        setGeminiModel(data.geminiModel || "gemini-3.6-flash");
      }
    } catch {}
  }

  function close() { setOpen(false); setTimeout(onClose, 250); }

  async function saveProvider(p) {
    setProvider(p);
    try { await window.wormgpt?.setProvider(p); } catch {}
  }

  async function saveKey(pk, key) {
    if (!key.trim()) { setMsg("Key cannot be empty"); return; }
    setSaving(true); setMsg("");
    try {
      await window.wormgpt?.saveKey(pk, key.trim());
      setMsg(pk === "groq" ? "Groq key saved" : "Gemini key saved");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) { setMsg(e.message || "Save failed"); }
    setSaving(false);
  }

  async function saveModel(pk, model) {
    try {
      if (pk === "groq") { setGroqModel(model); await window.wormgpt?.setGroqModel?.(model); }
      else { setGeminiModel(model); await window.wormgpt?.setGeminiModel?.(model); }
    } catch {}
  }

  return (
    <div className={`overlay ${open ? "active" : ""}`} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="panel">
        <div className="panel__top">
          <span className="panel__title">Settings</span>
          <button className="panel__x" onClick={close}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="panel__body">
          <div className="settings-group">
            <div className="settings-label">Models</div>
            <div className="model-section">
              <div className="model-row">
                <span className="model-label">Groq</span>
                <select className="model-select" value={groqModel} onChange={e => saveModel("groq", e.target.value)}>
                  <option value="qwen/qwen3.6-27b">Qwen 3.6 27B</option>
                  <option value="openai/gpt-oss-120b">GPT OSS 120B</option>
                  <option value="allam-2-7b">Allam 2 7B</option>
                </select>
              </div>
              <div className="model-row">
                <span className="model-label">Gemini</span>
                <select className="model-select" value={geminiModel} onChange={e => saveModel("gemini", e.target.value)}>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-label">Theme</div>
            <div className="theme-row">
              {[{ id: "dark", label: "Dark" }, { id: "light", label: "Light" }, { id: "system", label: "System" }].map(t => (
                <button key={t.id} className={`theme-opt ${theme === t.id ? "is-on" : ""}`} onClick={() => setTheme(t.id)}>
                  <div className="theme-dot" />
                  <span className="theme-name">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <div className="about">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2c-1.5 4-4 6-4 10a4 4 0 008 0c0-4-2.5-6-4-10z"/><path d="M12 18a2 2 0 002-2c0-1.5-1-2.5-2-4-1 1.5-2 2.5-2 4a2 2 0 002 2z"/></svg>
              <div className="about__name">Firewire</div>
              <div className="about__ver">v1.3.0</div>
              <div className="about__rows">
                <div className="about__row"><span className="about__k">Engine</span><span className="about__v">Electron 40</span></div>
                <div className="about__row"><span className="about__k">Runtime</span><span className="about__v">React 18</span></div>
                <div className="about__row"><span className="about__k">Providers</span><span className="about__v">Groq / Gemini</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
