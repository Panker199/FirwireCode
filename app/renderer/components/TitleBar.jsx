export default function TitleBar() {
  return (
    <div className="titlebar">
      <div className="titlebar__brand">
        <span className="titlebar__dot" />
        <span className="titlebar__title">WormGPT — Unleashed and Uncensored</span>
      </div>
      <div className="titlebar__controls">
        <button type="button" onClick={window.wormgpt.minimize} aria-label="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <button type="button" onClick={window.wormgpt.close} aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
