import { useState } from "react";

export default function Input({ onSend, disabled }) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className={`input ${disabled ? "is-disabled" : ""}`}>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder="Ask a question..."
        disabled={disabled}
      />
      <button
        type="button"
        className="input__send"
        onClick={submit}
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </div>
  );
}
