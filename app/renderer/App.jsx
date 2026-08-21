import { useEffect, useState } from "react";
import { ThemeProvider } from "./ThemeContext.jsx";
import TitleBar from "./components/TitleBar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Chat from "./components/Chat.jsx";
import Settings from "./components/Settings.jsx";
import system from "../../core/prompts.js";

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const rest = list.filter(item => item && item.role !== "system");
  return [system, ...rest];
}

function createThread(number) {
  return {
    id: createId(),
    title: `Chat ${number}`,
    messages: [system]
  };
}

function normalizeThreads(raw) {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];
  return raw.map((thread, index) => {
    const safe = thread && typeof thread === "object" ? thread : {};
    const title =
      typeof safe.title === "string" && safe.title.trim()
        ? safe.title
        : `Chat ${index + 1}`;
    return {
      id: typeof safe.id === "string" ? safe.id : createId(),
      title,
      messages: ensureMessages(safe.messages)
    };
  });
}

function getNextChatNumber(threads) {
  let max = 0;
  threads.forEach(thread => {
    const match = /^Chat\s+(\d+)/i.exec(thread.title);
    if (match) {
      const value = Number(match[1]);
      if (!Number.isNaN(value)) {
        max = Math.max(max, value);
      }
    }
  });
  return max ? max + 1 : threads.length + 1;
}

const initialThreads = [createThread(1), createThread(2)];

function AppInner() {
  const [threads, setThreads] = useState(initialThreads);
  const [activeId, setActiveId] = useState(initialThreads[0].id);
  const [nextChatNumber, setNextChatNumber] = useState(3);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [keyStatus, setKeyStatus] = useState("unknown");
  const [hasLoaded, setHasLoaded] = useState(false);

  const activeThread = threads.find(thread => thread.id === activeId) || threads[0];
  const visibleMessages = activeThread
    ? activeThread.messages.filter(m => m.role !== "system")
    : [];

  async function refreshKeyStatus() {
    if (!window.wormgpt || !window.wormgpt.keyStatus) return;
    try {
      const hasKey = await window.wormgpt.keyStatus();
      setKeyStatus(hasKey ? "saved" : "missing");
    } catch {
      setKeyStatus("missing");
    }
  }

  useEffect(() => {
    refreshKeyStatus();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadChats() {
      if (!window.wormgpt || !window.wormgpt.loadChats) {
        setHasLoaded(true);
        return;
      }
      try {
        const stored = await window.wormgpt.loadChats();
        if (cancelled) return;
        if (stored && stored.threads !== undefined) {
          const normalized = normalizeThreads(stored.threads);
          if (normalized !== null) {
            setThreads(normalized);
            const nextNumber =
              typeof stored.nextChatNumber === "number" && stored.nextChatNumber > 0
                ? stored.nextChatNumber
                : getNextChatNumber(normalized);
            setNextChatNumber(nextNumber);
            const active =
              normalized.find(thread => thread.id === stored.activeId)?.id ||
              (normalized[0] ? normalized[0].id : null);
            setActiveId(active);
          }
        }
      } catch {
        // Ignore load failures and keep defaults.
      } finally {
        if (!cancelled) {
          setHasLoaded(true);
        }
      }
    }

    loadChats();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded || !window.wormgpt || !window.wormgpt.saveChats) return;
    window.wormgpt.saveChats({
      threads,
      activeId,
      nextChatNumber
    });
  }, [threads, activeId, nextChatNumber, hasLoaded]);

  function handleNew() {
    const next = createThread(nextChatNumber);
    setThreads(prev => [next, ...prev]);
    setActiveId(next.id);
    setNextChatNumber(prev => prev + 1);
    setError("");
  }

  function handleClear() {
    setThreads([]);
    setActiveId(null);
    setNextChatNumber(1);
    setError("");
  }

  function handleSelect(id) {
    setActiveId(id);
    setError("");
  }

  async function send(text) {
    if (isSending) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    let thread = activeThread;
    let nextMessages = [];
    let threadId = null;

    if (!thread) {
      const created = createThread(nextChatNumber);
      thread = created;
      threadId = created.id;
      nextMessages = [...created.messages, { role: "user", content: trimmed }];
      setThreads(prev => [{ ...created, messages: nextMessages }, ...prev]);
      setActiveId(created.id);
      setNextChatNumber(prev => prev + 1);
      setError("");
    } else {
      threadId = thread.id;
      nextMessages = [...thread.messages, { role: "user", content: trimmed }];
      setThreads(prev =>
        prev.map(current =>
          current.id === threadId ? { ...current, messages: nextMessages } : current
        )
      );
    }

    setIsSending(true);
    setError("");

    try {
      const reply = await window.wormgpt.chat(nextMessages);
      setThreads(prev =>
        prev.map(thread =>
          thread.id === threadId
            ? {
                ...thread,
                messages: [...nextMessages, { role: "assistant", content: reply }]
              }
            : thread
        )
      );
    } catch (err) {
      setError(err && err.message ? err.message : "Request failed");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="shell">
      <TitleBar />
      <div className="app">
        <Sidebar
          threads={threads}
          activeId={activeId}
          onSelect={handleSelect}
          onNew={handleNew}
          onClear={handleClear}
          onOpenSettings={() => setShowSettings(true)}
          keyStatus={keyStatus}
        />
        <Chat
          messages={visibleMessages}
          onSend={send}
          isSending={isSending}
          error={error}
        />
      </div>
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onKeySaved={refreshKeyStatus}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
