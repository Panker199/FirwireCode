import { useState } from "react";

export default function Settings({ onKeySaved }) {
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
      setStatus({ message: "Saved.", tone: "ok" });
      setKey("");
      if (onKeySaved) {
        await onKeySaved();
      }
    } catch (err) {
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
        setStatus({ message: "Key OK.", tone: "ok" });
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
      setStatus({ message: "Key removed.", tone: "ok" });
      setKey("");
      if (onKeySaved) {
        await onKeySaved();
      }
    } catch (err) {
      setStatus({ message: "Failed to revoke key.", tone: "error" });
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div className="settings">
      <div className="settings__title">API Key</div>
      <input
        type="password"
        placeholder="Groq API key"
        value={key}
        onChange={e => setKey(e.target.value)}
        disabled={isBusy}
      />
      <div className="settings__actions">
        <button type="button" onClick={save} disabled={isBusy}>
          {isSaving ? "Saving..." : "Save Key"}
        </button>
        <button type="button" onClick={test} disabled={isBusy}>
          {isTesting ? "Testing..." : "Test Key"}
        </button>
      </div>
      <button
        type="button"
        className="settings__revoke"
        onClick={revoke}
        disabled={isBusy}
      >
        {isRevoking ? "Revoking..." : "Revoke Key"}
      </button>
      {status.message && (
        <div className={`settings__status is-${status.tone}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}
