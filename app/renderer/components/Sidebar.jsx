import Settings from "./Settings.jsx";

export default function Sidebar({
  threads,
  activeId,
  onSelect,
  onNew,
  onClear,
  showSettings,
  onToggleSettings,
  keyStatus,
  onKeySaved
}) {
  const statusLabel =
    keyStatus === "saved"
      ? "API key saved"
      : keyStatus === "missing"
        ? "API key missing"
        : "Checking key";
  const statusClass =
    keyStatus === "saved"
      ? "is-ok"
      : keyStatus === "missing"
        ? "is-missing"
        : "is-unknown";

  return (
    <aside className="sidebar">
      <button type="button" className="sidebar__new" onClick={onNew}>
        + New Chat
      </button>
      <div className="sidebar__section">
        <div className="sidebar__label">Chats</div>
        <div className="sidebar__list">
          {threads.map(thread => (
            <button
              key={thread.id}
              type="button"
              className={`sidebar__item ${
                thread.id === activeId ? "is-active" : ""
              }`}
              onClick={() => onSelect(thread.id)}
            >
              <span className="sidebar__title">{thread.title}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="sidebar__status">
        <span className={`status-dot ${statusClass}`} />
        <span>{statusLabel}</span>
      </div>
      <div className="sidebar__actions">
        <button type="button" className="ghost" onClick={onClear}>
          Clear Conversations
        </button>
        <button type="button" className="ghost" onClick={onToggleSettings}>
          {showSettings ? "Hide Settings" : "Settings"}
        </button>
      </div>
      {showSettings && <Settings onKeySaved={onKeySaved} />}
    </aside>
  );
}
