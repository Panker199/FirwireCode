import { useEffect, useState, useCallback, useMemo } from "react";
import { ThemeProvider } from "./ThemeContext.jsx";
import Chat from "./components/Chat.jsx";
import CodeEditor from "./components/CodeEditor.jsx";
import Settings from "./components/Settings.jsx";
import system from "../../core/prompts.js";

function createId() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function ensureMessages(m) { return [system, ...(Array.isArray(m) ? m : []).filter(x => x && x.role !== "system")]; }
function createThread(n) { return { id: createId(), title: `Chat ${n}`, messages: [system] }; }
function normalizeThreads(raw) {
  if (!Array.isArray(raw)) return null;
  return raw.map((t, i) => { const s = t && typeof t === "object" ? t : {}; return { id: s.id || createId(), title: s.title || `Chat ${i + 1}`, messages: ensureMessages(s.messages) }; });
}
function nextNum(threads) { let m = 0; threads.forEach(t => { const x = /^Chat\s+(\d+)/i.exec(t.title); if (x) { const v = Number(x[1]); if (!Number.isNaN(v)) m = Math.max(m, v); } }); return m ? m + 1 : threads.length + 1; }

const init = [createThread(1), createThread(2)];

function App() {
  const [threads, setThreads] = useState(init);
  const [active, setActive] = useState(init[0].id);
  const [num, setNum] = useState(3);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [notebooksOpen, setNotebooksOpen] = useState(true);
  const [recentsOpen, setRecentsOpen] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [provider, setProvider] = useState("groq");
  const [model, setModel] = useState("auto");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function handleKey(e) {
      if (e.ctrlKey && e.key === "n") { e.preventDefault(); newChat(); }
      if (e.ctrlKey && e.key === "b") { e.preventDefault(); setShowSidebar(s => !s); }
      if (e.ctrlKey && e.key === ",") { e.preventDefault(); setShowSettings(true); }
      if (e.ctrlKey && e.key === "e") { e.preventDefault(); setShowEditor(s => !s); }
      if (e.key === "Escape") { setShowSettings(false); setShowSidebar(false); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  const isElectron = navigator.userAgent.indexOf("Electron") !== -1;

  const thread = useMemo(() => threads.find(t => t.id === active) || threads[0], [threads, active]);
  const msgs = useMemo(() => thread ? thread.messages.filter(m => m.role !== "system") : [], [thread]);

  useEffect(() => {
    window.wormgpt?.getProvider()?.then(p => setProvider(p.provider || "groq")).catch(() => {});
  }, []);

  useEffect(() => {
    let done = false;
    window.wormgpt?.loadChats()?.then(d => {
      if (done || !d?.threads) return;
      const n = normalizeThreads(d.threads);
      if (n) { setThreads(n); setNum(d.nextChatNumber > 0 ? d.nextChatNumber : nextNum(n)); setActive(d.activeId || n[0]?.id); }
    }).catch(() => {}).finally(() => { if (!done) setLoaded(true); });
    return () => { done = true; };
  }, []);

  useEffect(() => {
    if (loaded) window.wormgpt?.saveChats({ threads, activeId: active, nextChatNumber: num });
  }, [threads, active, num, loaded]);

  const newChat = useCallback(() => {
    const t = createThread(num);
    setThreads(p => [t, ...p]); setActive(t.id); setNum(n => n + 1); setError("");
    setShowSidebar(false);
  }, [num]);

  const selectChat = useCallback((id) => { setActive(id); setError(""); if (innerWidth < 768) setShowSidebar(false); }, []);

  const deleteChat = useCallback((id) => {
    setThreads(p => { const n = p.filter(t => t.id !== id); if (active === id) setActive(n[0]?.id); return n; });
    window.wormgpt?.deleteThread(id);
  }, [active]);

  const switchModel = useCallback((m) => {
    setModel(m);
    if (m !== "auto") { if (provider === "gemini") window.wormgpt?.setGeminiModel(m); else window.wormgpt?.setGroqModel(m); }
  }, [provider]);

  const send = useCallback(async (text) => {
    if (sending) return;
    const t = text.trim();
    if (!t) return;
    let m = model;
    if (m === "auto") {
      try { const r = await window.wormgpt?.detectBest(); if (r?.best) m = r.best.model; else { setError("No models available."); return; } }
      catch (e) { setError(e.message); return; }
    }
    let tid, next;
    if (!thread) {
      const c = createThread(num); tid = c.id;
      next = [...c.messages, { role: "user", content: t }];
      setThreads(p => [{ ...c, messages: next }, ...p]); setActive(c.id); setNum(n => n + 1);
    } else {
      tid = thread.id;
      next = [...thread.messages, { role: "user", content: t }];
      setThreads(p => p.map(c => c.id === tid ? { ...c, messages: next } : c));
    }
    setSending(true); setError("");
    try {
      const reply = await window.wormgpt.chat(next);
      setThreads(p => p.map(x => x.id === tid ? { ...x, messages: [...next, { role: "assistant", content: reply }] } : x));
    } catch (e) { setError(e.message || "Failed"); } finally { setSending(false); }
  }, [sending, model, thread, num]);

  return (
    <div className="app">
      <button className={`sidebar-open ${showSidebar ? "" : "show"}`} onClick={() => setShowSidebar(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <aside className={`sidebar ${showSidebar ? "" : "hidden-mobile"}`}>
        <div className="sidebar__top">
          <button className="sidebar__toggle" onClick={() => setShowSidebar(s => !s)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <button className="sidebar__new-btn" onClick={newChat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New
          </button>
        </div>
        <div className="sidebar__nav">
          <div className="sidebar__nav-item is-active">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>Chats</span>
          </div>
          <div className="sidebar__nav-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>Search</span>
          </div>
          <div className="sidebar__nav-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Images</span>
          </div>
          <div className="sidebar__nav-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            <span>Videos</span>
          </div>
          <div className="sidebar__nav-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            <span>Library</span>
          </div>
        </div>
        <div className="sidebar__section">
          <button className="sidebar__section-header" onClick={() => setNotebooksOpen(o => !o)}>
            <span>Skills</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform: notebooksOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {notebooksOpen && (
            <div className="sidebar__section-body">
              {["/think — Deep reasoning", "/fix — Debug code", "/tests — Generate tests", "/doc — Documentation", "/refactor — Improve code", "/explain — Explain code", "/write — Generate code", "/plan — Implementation plan", "/review — Code review", "/security — Security audit", "/perf — Performance analysis"].map((s, i) => (
                <div key={i} className="sidebar__skill">
                  <span className="sidebar__skill-cmd">{s.split(" — ")[0]}</span>
                  <span className="sidebar__skill-desc">{s.split(" — ")[1]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="sidebar__divider" />
        <div className="sidebar__section">
          <button className="sidebar__section-header" onClick={() => setRecentsOpen(o => !o)}>
            <span>Recents</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform: recentsOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {recentsOpen && (
            <div className="sidebar__section-body">
              <div className="sidebar__list">
                {threads.map(t => (
                  <div key={t.id} className={`sidebar__item ${t.id === active ? "is-active" : ""}`} onClick={() => selectChat(t.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    <span className="sidebar__item-text">{t.title}</span>
                    <button className="sidebar__item-x" onClick={e => { e.stopPropagation(); deleteChat(t.id); }}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="sidebar__bottom">
          <div className="sidebar__user">
            <div className="sidebar__avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c-1.5 4-4 6-4 10a4 4 0 008 0c0-4-2.5-6-4-10z"/><path d="M12 18a2 2 0 002-2c0-1.5-1-2.5-2-4-1 1.5-2 2.5-2 4a2 2 0 002 2z"/></svg></div>
            <span className="sidebar__username">User</span>
          </div>
          <button className="sidebar__gear" onClick={() => setShowSettings(true)} title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
        </div>
      </aside>

      <div className={`main ${showEditor ? "main--split" : ""}`}>
        <div className="main__bar">
          <div className="main__left">
            <span className="main__title">{thread?.title || "New Chat"}</span>
          </div>
          <div className="main__right">
            <button className={`main__win ${showEditor ? "is-active" : ""}`} onClick={() => setShowEditor(s => !s)} title="Code Editor (Ctrl+E)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </button>
            <button className="main__win" onClick={() => {
              if (!thread) return;
              const md = thread.messages.filter(m => m.role !== "system").map(m => `**${m.role === "user" ? "You" : "Firewire"}:**\n\n${m.content}`).join("\n\n---\n\n");
              const blob = new Blob([md], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `${thread.title || "chat"}.md`; a.click();
              URL.revokeObjectURL(url);
            }} title="Export">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button className="main__win" onClick={() => { const n = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"; document.documentElement.setAttribute("data-theme", n); localStorage.setItem("wormgpt-theme", n); }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></button>
            {isElectron && <>
            <button className="main__win" onClick={() => window.wormgpt?.minimize()}><svg width="8" height="1" viewBox="0 0 8 1"><path d="M0 0.5h8" stroke="currentColor" strokeWidth="1"/></svg></button>
            <button className="main__win" onClick={() => window.wormgpt?.maximize()}><svg width="8" height="8" viewBox="0 0 8 8" fill="none"><rect x="0.5" y="0.5" width="7" height="7" rx="0.5" stroke="currentColor"/></svg></button>
            <button className="main__win main__win--x" onClick={() => window.wormgpt?.close()}><svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" strokeWidth="1"/></svg></button>
            </>}
          </div>
        </div>
        <div className="main__content">
          <div className="main__chat">
            <Chat msgs={msgs} onSend={send} sending={sending} error={error} provider={provider} model={model} onModel={switchModel} />
          </div>
          {showEditor && (
            <div className="main__editor">
              <CodeEditor onClose={() => setShowEditor(false)} />
            </div>
          )}
        </div>
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default function Root() {
  return <ThemeProvider><App /></ThemeProvider>;
}
