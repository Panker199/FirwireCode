import { useState } from "react";
import Editor from "@monaco-editor/react";

const LANGUAGE_MAP = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
  c: "c", cpp: "cpp", h: "c", hpp: "cpp", cs: "csharp", php: "php",
  swift: "swift", kt: "kotlin", scala: "scala", r: "r", lua: "lua",
  sh: "shell", bash: "shell", zsh: "shell", ps1: "powershell",
  html: "html", htm: "html", css: "css", scss: "scss", less: "less",
  json: "json", yaml: "yaml", yml: "yaml", xml: "xml", sql: "sql",
  dockerfile: "dockerfile", makefile: "makefile", toml: "ini", ini: "ini"
};

export default function CopilotSuggestion({ code, language, onAccept, onDismiss }) {
  const [suggestion, setSuggestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasRequested, setHasRequested] = useState(false);

  const lang = language && LANGUAGE_MAP[language.toLowerCase()]
    ? LANGUAGE_MAP[language.toLowerCase()]
    : language ? language.toLowerCase() : "plaintext";

  async function requestCompletion() {
    if (isLoading || !window.wormgpt?.completeCode) return;
    setIsLoading(true);
    setError("");
    setHasRequested(true);

    try {
      const result = await window.wormgpt.completeCode(code, language, "");
      if (result.ok && result.suggestion) {
        setSuggestion(result.suggestion);
      } else if (result.ok && !result.suggestion) {
        setError("Code appears complete");
      } else {
        setError(result.error || "No suggestion available");
      }
    } catch (err) {
      setError(err.message || "Completion failed");
    } finally {
      setIsLoading(false);
    }
  }

  function handleAccept() {
    if (suggestion) onAccept(suggestion);
  }

  return (
    <div className="copilot">
      {!hasRequested && !suggestion && (
        <button
          type="button"
          className="copilot__trigger"
          onClick={requestCompletion}
          disabled={isLoading}
          title="AI Code Completion"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
          </svg>
          <span>Complete</span>
        </button>
      )}

      {isLoading && (
        <div className="copilot__loading">
          <div className="copilot__spinner" />
          <span>Generating suggestion...</span>
        </div>
      )}

      {error && hasRequested && !isLoading && !suggestion && (
        <div className="copilot__error">
          <span>{error}</span>
          <button type="button" className="copilot__retry" onClick={requestCompletion}>
            Retry
          </button>
        </div>
      )}

      {suggestion && (
        <div className="copilot__suggestion">
          <div className="copilot__header">
            <div className="copilot__badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
              </svg>
              <span>AI Suggestion</span>
            </div>
            <div className="copilot__actions">
              <button type="button" className="copilot__btn copilot__btn--accept" onClick={handleAccept} title="Accept suggestion (Tab)">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Accept
              </button>
              <button type="button" className="copilot__btn copilot__btn--dismiss" onClick={onDismiss} title="Dismiss suggestion (Esc)">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Dismiss
              </button>
              <button type="button" className="copilot__btn copilot__btn--retry" onClick={requestCompletion} title="Regenerate">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="copilot__preview">
            <Editor
              height={`${Math.min(Math.max(suggestion.split("\n").length * 19 + 20, 40), 200)}px`}
              language={lang}
              value={suggestion}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 8, bottom: 8 },
                scrollbar: { vertical: "hidden", horizontal: "auto" },
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                overviewRulerBorder: false,
                renderLineHighlight: "none",
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 3
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}