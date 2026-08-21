export default function Sidebar({
  threads,
  activeId,
  onSelect,
  onNew,
  onClear,
  onOpenSettings,
  keyStatus
}) {
  const statusLabel =
    keyStatus === "saved"
      ? "API connected"
      : keyStatus === "missing"
        ? "No API key"
        : "Checking...";
  const statusClass =
    keyStatus === "saved"
      ? "is-ok"
      : keyStatus === "missing"
        ? "is-missing"
        : "is-unknown";

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <button type="button" className="sidebar__new" onClick={onNew}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          New Chat
        </button>
      </div>
      <div className="sidebar__section">
        <div className="sidebar__label">Conversations</div>
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
              <svg className="sidebar__item-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 4h10M3 8h7M3 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Clear All
        </button>
        <button type="button" className="ghost" onClick={onOpenSettings}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.8 2.8l.7.7M10.5 10.5l.7.7M2.8 11.2l.7-.7M10.5 3.5l.7-.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}
