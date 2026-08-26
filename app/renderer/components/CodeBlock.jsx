import { useState, useRef } from "react";
import Editor from "@monaco-editor/react";

const LANGUAGE_MAP = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
  c: "c", cpp: "cpp", cs: "csharp", php: "php", swift: "swift",
  kt: "kotlin", r: "r", lua: "lua", sh: "shell", bash: "shell",
  ps1: "powershell", html: "html", css: "css", scss: "scss",
  json: "json", yaml: "yaml", xml: "xml", sql: "sql", md: "markdown"
};

const EXEC_LANGS = ["javascript", "typescript", "python", "ruby", "shell", "powershell", "php", "lua"];

function detectLanguage(code) {
  if (/^<\?php/.test(code)) return "php";
  if (/^#!.*\b(bash|zsh|sh)\b/.test(code)) return "shell";
  if (/\bfunction\s+\w+\s*\(/.test(code) || /const\s+\w+\s*=/.test(code)) return "javascript";
  if (/\bdef\s+\w+\s*\(/.test(code)) return "python";
  if (/<\w+[\s>]/.test(code) && /<\/\w+>/.test(code)) return "html";
  return "plaintext";
}

export default function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef(null);

  const lang = language && LANGUAGE_MAP[language.toLowerCase()] ? LANGUAGE_MAP[language.toLowerCase()] : language ? language.toLowerCase() : detectLanguage(code);
  const displayName = language || detectLanguage(code);
  const canRun = EXEC_LANGS.includes(lang);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  async function handleRun() {
    if (isRunning || !window.wormgpt?.executeCode) return;
    setIsRunning(true);
    setOutput({ ok: true, output: "Running..." });
    try {
      const result = await window.wormgpt.executeCode(code, lang);
      setOutput(result);
    } catch (err) {
      setOutput({ ok: false, output: err.message || "Failed" });
    } finally {
      setIsRunning(false);
    }
  }

  const lineCount = code.split("\n").length;
  const height = collapsed ? 32 : Math.min(Math.max(lineCount * 18 + 16, 50), 400);

  return (
    <div className="code-block">
      <div className="code-block__header">
        <span className="code-block__lang">{displayName}</span>
        <div className="code-block__actions">
          {canRun && (
            <button type="button" className={`code-block__btn code-block__run ${isRunning ? "is-running" : ""}`} onClick={handleRun} disabled={isRunning} title="Run">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
            </button>
          )}
          <button type="button" className="code-block__btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 7.5l3.5-3.5 3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>
          <button type="button" className="code-block__btn" onClick={handleCopy} title="Copy">
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M8 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1"/></svg>
            )}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="code-block__editor">
          <Editor height={`${height}px`} language={lang} value={code} theme="vs-dark" onMount={(e) => { editorRef.current = e; }}
            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, fontFamily: "'Cascadia Code', 'Fira Code', monospace", lineNumbers: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, scrollbar: { vertical: "hidden", horizontal: "auto" }, overviewRulerLanes: 0, hideCursorInOverviewRuler: true, overviewRulerBorder: false, renderLineHighlight: "none", glyphMargin: false, folding: false, lineDecorationsWidth: 0, lineNumbersMinChars: 3 }} />
        </div>
      )}
      {output && !collapsed && (
        <div className={`code-block__output ${output.ok ? "" : "is-error"}`}>
          <div className="code-block__output-header">
            <span className="code-block__output-label">Output</span>
            <button type="button" className="code-block__btn" onClick={() => setOutput(null)}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
          </div>
          <pre className="code-block__output-text">{output.output}</pre>
        </div>
      )}
    </div>
  );
}
