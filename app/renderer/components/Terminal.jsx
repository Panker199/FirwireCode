import { useState, useRef, useEffect } from "react";

let cmdCounter = 0;

export default function Terminal({ isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function execute() {
    const cmd = input.trim();
    if (!cmd || isRunning) return;

    const id = `cmd-${++cmdCounter}`;
    setInput("");
    setIsRunning(true);
    setCmdHistory(prev => [cmd, ...prev]);
    setHistoryIndex(-1);

    setHistory(prev => [...prev, { type: "input", text: cmd }]);

    try {
      const result = await window.wormgpt.execCommand(id, cmd);
      setHistory(prev => [...prev, {
        type: "output",
        text: result.output,
        ok: result.ok,
        exitCode: result.exitCode
      }]);
    } catch (err) {
      setHistory(prev => [...prev, {
        type: "output",
        text: err.message || "Command failed",
        ok: false,
        exitCode: -1
      }]);
    } finally {
      setIsRunning(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      execute();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, cmdHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(cmdHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(cmdHistory[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  }

  function clearHistory() {
    setHistory([]);
  }

  if (!isOpen) return null;

  return (
    <div className="terminal">
      <div className="terminal__header">
        <div className="terminal__title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          <span>Terminal</span>
        </div>
        <div className="terminal__actions">
          <button type="button" className="terminal__btn" onClick={clearHistory} title="Clear">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          <button type="button" className="terminal__btn terminal__close" onClick={onClose} title="Close terminal">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="terminal__body">
        {history.length === 0 && (
          <div className="terminal__welcome">
            <span className="terminal__welcome-icon">&gt;_</span>
            <span>Firewire Terminal</span>
            <span className="terminal__welcome-hint">Type a command and press Enter. Ctrl+L to clear.</span>
          </div>
        )}

        {history.map((entry, i) => (
          <div key={i} className="terminal__entry">
            {entry.type === "input" ? (
              <div className="terminal__cmd">
                <span className="terminal__prompt">&gt;</span>
                <span>{entry.text}</span>
              </div>
            ) : (
              <pre className={`terminal__output ${entry.ok ? "is-ok" : "is-err"}`}>{entry.text}</pre>
            )}
          </div>
        ))}

        {isRunning && (
          <div className="terminal__running">
            <div className="terminal__spinner" />
            <span>Running...</span>
          </div>
        )}

        <div className="terminal__input-row">
          <span className="terminal__prompt">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal__input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? "Running..." : "Enter command..."}
            disabled={isRunning}
            autoFocus
          />
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}