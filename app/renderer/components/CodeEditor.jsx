import { useState, useRef, useCallback, useEffect } from "react";
import Editor from "@monaco-editor/react";

const LANGUAGE_MAP = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
  c: "c", cpp: "cpp", cs: "csharp", php: "php", swift: "swift",
  kt: "kotlin", r: "r", lua: "lua", sh: "shell", bash: "shell",
  ps1: "powershell", html: "html", css: "css", scss: "scss",
  json: "json", yaml: "yaml", xml: "xml", sql: "sql", md: "markdown",
  toml: "ini", ini: "ini", env: "plaintext", gitignore: "plaintext"
};

function getLang(filename) {
  if (!filename) return "plaintext";
  const ext = filename.split(".").pop().toLowerCase();
  return LANGUAGE_MAP[ext] || "plaintext";
}

export default function CodeEditor({ onClose }) {
  const [files, setFiles] = useState({});
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [explorer, setExplorer] = useState([]);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [terminalCmd, setTerminalCmd] = useState("");
  const [modified, setModified] = useState({});
  const editorRef = useRef(null);

  const currentCode = activeTab ? (files[activeTab] || "") : "";
  const currentLang = getLang(activeTab);

  function openFile(name, content) {
    setFiles(prev => ({ ...prev, [name]: content || "" }));
    if (!openTabs.includes(name)) setOpenTabs(prev => [...prev, name]);
    setActiveTab(name);
  }

  function closeTab(name) {
    const next = openTabs.filter(t => t !== name);
    setOpenTabs(next);
    if (activeTab === name) setActiveTab(next[next.length - 1] || null);
  }

  function handleEditorChange(value) {
    if (!activeTab) return;
    setFiles(prev => ({ ...prev, [activeTab]: value }));
    setModified(prev => ({ ...prev, [activeTab]: true }));
  }

  function handleSave() {
    if (!activeTab) return;
    const content = files[activeTab] || "";
    if (window.wormgpt?.writeFile) {
      window.wormgpt.writeFile(activeTab, content);
    }
    setModified(prev => ({ ...prev, [activeTab]: false }));
  }

  async function handleRun() {
    if (!activeTab || !window.wormgpt?.executeCode) return;
    setTerminalOutput(prev => [...prev, { type: "cmd", text: `$ run ${activeTab}` }]);
    setShowTerminal(true);
    try {
      const lang = getLang(activeTab);
      const result = await window.wormgpt.executeCode(files[activeTab] || "", lang);
      setTerminalOutput(prev => [...prev, { type: result.ok ? "out" : "err", text: result.output }]);
    } catch (err) {
      setTerminalOutput(prev => [...prev, { type: "err", text: err.message }]);
    }
  }

  async function runTerminalCmd(e) {
    e.preventDefault();
    if (!terminalCmd.trim()) return;
    setTerminalOutput(prev => [...prev, { type: "cmd", text: `$ ${terminalCmd}` }]);
    if (window.wormgpt?.buildRun) {
      try {
        const result = await window.wormgpt.buildRun(terminalCmd);
        setTerminalOutput(prev => [...prev, { type: result.ok ? "out" : "err", text: result.output }]);
      } catch (err) {
        setTerminalOutput(prev => [...prev, { type: "err", text: err.message }]);
      }
    }
    setTerminalCmd("");
  }

  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "w") { e.preventDefault(); if (activeTab) closeTab(activeTab); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeTab, files]);

  const welcome = !activeTab;

  return (
    <div className="code-editor">
      <div className="code-editor__bar">
        <div className="code-editor__bar-left">
          <button className="code-editor__icon" onClick={() => setShowExplorer(e => !e)} title="Explorer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          </button>
          <span className="code-editor__title">Code Editor</span>
        </div>
        <div className="code-editor__bar-right">
          {activeTab && (
            <>
              <button className="code-editor__btn" onClick={handleSave} title="Save (Ctrl+S)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              </button>
              <button className="code-editor__btn code-editor__run" onClick={handleRun} title="Run">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
              </button>
            </>
          )}
          <button className="code-editor__btn" onClick={() => setShowTerminal(t => !t)} title="Terminal (Ctrl+`)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          </button>
          {onClose && (
            <button className="code-editor__btn" onClick={onClose} title="Close Editor">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="code-editor__body">
        {showExplorer && (
          <div className="code-editor__explorer">
            <div className="code-editor__explorer-header">
              <span>EXPLORER</span>
            </div>
            <div className="code-editor__explorer-list">
              {Object.keys(files).map(name => (
                <div key={name} className={`code-editor__file ${activeTab === name ? "is-active" : ""}`} onClick={() => openFile(name, files[name])}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="code-editor__file-name">{name.split("/").pop()}</span>
                  {modified[name] && <span className="code-editor__file-dot" />}
                </div>
              ))}
              {Object.keys(files).length === 0 && (
                <div className="code-editor__empty">
                  <span>No files open</span>
                  <span className="code-editor__empty-hint">Ask Firewire to create or read a file</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="code-editor__main">
          {openTabs.length > 0 && (
            <div className="code-editor__tabs">
              {openTabs.map(tab => (
                <div key={tab} className={`code-editor__tab ${activeTab === tab ? "is-active" : ""}`} onClick={() => setActiveTab(tab)}>
                  <span className="code-editor__tab-name">{tab.split("/").pop()}</span>
                  {modified[tab] && <span className="code-editor__tab-dot" />}
                  <button className="code-editor__tab-close" onClick={e => { e.stopPropagation(); closeTab(tab); }}>
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="code-editor__editor">
            {welcome ? (
              <div className="code-editor__welcome">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{opacity: 0.3}}>
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
                <div className="code-editor__welcome-title">Firewire Code Editor</div>
                <div className="code-editor__welcome-sub">Ask Firewire to create, read, or edit files</div>
                <div className="code-editor__welcome-shortcuts">
                  <div><kbd>Ctrl</kbd>+<kbd>S</kbd> Save</div>
                  <div><kbd>Ctrl</kbd>+<kbd>W</kbd> Close Tab</div>
                  <div><kbd>Ctrl</kbd>+<kbd>`</kbd> Terminal</div>
                </div>
              </div>
            ) : (
              <Editor
                height="100%"
                language={currentLang}
                value={currentCode}
                theme="vs-dark"
                onChange={handleEditorChange}
                onMount={(e) => { editorRef.current = e; }}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  fontLigatures: true,
                  minimap: { enabled: true, maxColumn: 80 },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  renderWhitespace: "selection",
                  bracketPairColorization: { enabled: true },
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  smoothScrolling: true,
                  tabSize: 2,
                  wordWrap: "off",
                  folding: true,
                  formatOnPaste: true,
                  formatOnType: true,
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                  parameterHints: { enabled: true },
                  scrollbar: { vertical: "auto", horizontal: "auto" }
                }}
              />
            )}
          </div>

          {showTerminal && (
            <div className="code-editor__terminal">
              <div className="code-editor__terminal-header">
                <span>TERMINAL</span>
                <button className="code-editor__btn" onClick={() => setTerminalOutput([])} title="Clear">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className="code-editor__terminal-output">
                {terminalOutput.map((line, i) => (
                  <div key={i} className={`code-editor__terminal-line code-editor__terminal-${line.type}`}>{line.text}</div>
                ))}
              </div>
              <form className="code-editor__terminal-input" onSubmit={runTerminalCmd}>
                <span className="code-editor__terminal-prompt">$</span>
                <input value={terminalCmd} onChange={e => setTerminalCmd(e.target.value)} placeholder="Enter command..." autoFocus />
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
