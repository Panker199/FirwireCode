import { useState } from "react";
import { useTheme } from "../ThemeContext.jsx";

const TABS = [
  { id: "appearance", label: "Appearance" },
  { id: "api", label: "API Key" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "about", label: "About" }
];

function AppearanceTab() {
  const { mode, setMode } = useTheme();

  return (
    <div className="settings-section">
      <div>
        <div className="settings-section__title">Theme</div>
        <div className="settings-section__desc">Select your preferred appearance</div>
      </div>
      <div className="theme-picker">
        <button
          type="button"
          className={`theme-picker__option ${mode === "dark" ? "is-active" : ""}`}
          onClick={() => setMode("dark")}
        >
          <div className="theme-picker__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
          <span className="theme-picker__label">Dark</span>
        </button>
        <button
          type="button"
          className={`theme-picker__option ${mode === "light" ? "is-active" : ""}`}
          onClick={() => setMode("light")}
        >
          <div className="theme-picker__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </div>
          <span className="theme-picker__label">Light</span>
        </button>
        <button
          type="button"
          className={`theme-picker__option ${mode === "system" ? "is-active" : ""}`}
          onClick={() => setMode("system")}
        >
          <div className="theme-picker__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <span className="theme-picker__label">System</span>
        </button>
      </div>

      <div>
        <div className="settings-section__title" style={{ marginTop: 8 }}>Accent Color</div>
        <div className="settings-section__desc">Choose your accent color</div>
      </div>
      <div className="settings-row">
        <div className="settings-row__info">
          <span className="settings-row__label">Red (Default)</span>
          <span className="settings-row__hint">Current accent color</span>
        </div>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--accent)" }} />
      </div>
    </div>
  );
}

function ApiKeyTab({ onKeySaved }) {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState({ message: "", tone: "info" });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const isBusy = isSaving || isTesting || isRevoking;

  async function save() {
    const trimmed = key.trim();
    if (!trimmed) {
      setStatus({ message: "Enter your API key first.", tone: "error" });
      return;
    }
    setIsSaving(true);
    setStatus({ message: "", tone: "info" });
    try {
      await window.wormgpt.saveKey(trimmed);
      setStatus({ message: "API key saved successfully.", tone: "ok" });
      setKey("");
      if (onKeySaved) await onKeySaved();
    } catch {
      setStatus({ message: "Failed to save key.", tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  async function test() {
    setIsTesting(true);
    setStatus({ message: "", tone: "info" });
    try {
      const result = await window.wormgpt.testKey(key.trim());
      if (result && result.ok) {
        setStatus({ message: "API key is valid.", tone: "ok" });
      } else {
        setStatus({
          message: result && result.message ? result.message : "Key test failed.",
          tone: "error"
        });
      }
    } catch (err) {
      setStatus({
        message: err && err.message ? err.message : "Key test failed.",
        tone: "error"
      });
    } finally {
      setIsTesting(false);
    }
  }

  async function revoke() {
    setIsRevoking(true);
    setStatus({ message: "", tone: "info" });
    try {
      await window.wormgpt.revokeKey();
      setStatus({ message: "API key has been removed.", tone: "ok" });
      setKey("");
      if (onKeySaved) await onKeySaved();
    } catch {
      setStatus({ message: "Failed to revoke key.", tone: "error" });
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div className="settings-section">
      <div>
        <div className="settings-section__title">Groq API Key</div>
        <div className="settings-section__desc">Manage your API key for Groq Cloud</div>
      </div>
      <div className="settings-group">
        <input
          type="password"
          className="settings-input"
          placeholder="Enter your Groq API key"
          value={key}
          onChange={e => setKey(e.target.value)}
          disabled={isBusy}
        />
        <div className="btn-group">
          <button type="button" className="btn btn--primary" onClick={save} disabled={isBusy}>
            {isSaving ? "Saving..." : "Save Key"}
          </button>
          <button type="button" className="btn" onClick={test} disabled={isBusy}>
            {isTesting ? "Testing..." : "Test Key"}
          </button>
        </div>
        <button type="button" className="btn btn--danger" onClick={revoke} disabled={isBusy}>
          {isRevoking ? "Revoking..." : "Revoke Key"}
        </button>
        {status.message && (
          <div className={`settings-status is-${status.tone}`}>{status.message}</div>
        )}
      </div>
    </div>
  );
}

function ShortcutsTab() {
  const shortcuts = [
    { label: "Send message", keys: ["Enter"] },
    { label: "New chat", keys: ["Ctrl", "N"] },
    { label: "Toggle sidebar", keys: ["Ctrl", "B"] },
    { label: "Open settings", keys: ["Ctrl", ","] },
    { label: "Close panel", keys: ["Esc"] }
  ];

  return (
    <div className="settings-section">
      <div>
        <div className="settings-section__title">Keyboard Shortcuts</div>
        <div className="settings-section__desc">Quick actions you can perform</div>
      </div>
      <div className="shortcut-list">
        {shortcuts.map(s => (
          <div key={s.label} className="shortcut-item">
            <span className="shortcut-item__label">{s.label}</span>
            <div className="shortcut-item__keys">
              {s.keys.map(k => <span key={k} className="kbd">{k}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="settings-section">
      <div className="about-card">
        <div className="about-card__logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div className="about-card__name">WormGPT</div>
        <div className="about-card__version">v1.2.0</div>
        <div className="about-card__desc">
          Unleashed and Uncensored AI assistant powered by Groq.
        </div>
      </div>

      <div>
        <div className="settings-section__title">Information</div>
      </div>
      <div className="about-info">
        <div className="about-info__row">
          <span className="about-info__label">Version</span>
          <span className="about-info__value">1.2.0</span>
        </div>
        <div className="about-info__row">
          <span className="about-info__label">Model</span>
          <span className="about-info__value">openai/gpt-oss-20b</span>
        </div>
        <div className="about-info__row">
          <span className="about-info__label">Provider</span>
          <span className="about-info__value">Groq Cloud</span>
        </div>
        <div className="about-info__row">
          <span className="about-info__label">Framework</span>
          <span className="about-info__value">Electron + React</span>
        </div>
        <div className="about-info__row">
          <span className="about-info__label">Author</span>
          <span className="about-info__value">Lahiru Sanjika</span>
        </div>
      </div>
    </div>
  );
}

export default function Settings({ onClose, onKeySaved }) {
  const [activeTab, setActiveTab] = useState("appearance");

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-panel__header">
          <span className="settings-panel__title">Settings</span>
          <button type="button" className="settings-panel__close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="settings-panel__body">
          <div className="settings-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`settings-nav__item ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "api" && <ApiKeyTab onKeySaved={onKeySaved} />}
          {activeTab === "shortcuts" && <ShortcutsTab />}
          {activeTab === "about" && <AboutTab />}
        </div>
      </div>
    </div>
  );
}
