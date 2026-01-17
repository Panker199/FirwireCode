export default function TitleBar() {
  return (
    <div className="titlebar">
      <div className="titlebar__brand">
        <span className="titlebar__dot" />
        <span className="titlebar__title">
          WormGPT — Unleashed and Uncensored
        </span>
      </div>
      <div className="titlebar__controls">
        <button type="button" onClick={window.wormgpt.minimize} aria-label="Minimize">
          -
        </button>
        <button type="button" onClick={window.wormgpt.close} aria-label="Close">
          x
        </button>
      </div>
    </div>
  );
}
