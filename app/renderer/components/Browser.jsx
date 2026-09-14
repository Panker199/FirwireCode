import { useState, useRef, useEffect, useCallback } from "react";

const isElectron = typeof navigator !== "undefined" && navigator.userAgent.indexOf("Electron") !== -1;

function formatUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return "https://" + trimmed;
  return "https://duckduckgo.com/?q=" + encodeURIComponent(trimmed);
}

export default function Browser({ onClose, defaultUrl, previewHtml }) {
  const frameRef = useRef(null);
  const inputRef = useRef(null);
  const [url, setUrl] = useState(defaultUrl || "about:blank");
  const [displayUrl, setDisplayUrl] = useState(defaultUrl || "about:blank");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("New Tab");
  const [isPreview, setIsPreview] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isElectron && frameRef.current && !frameRef.current.tagName) {
      const wv = document.createElement("webview");
      wv.setAttribute("src", url);
      wv.setAttribute("class", "browser__webview");
      wv.setAttribute("partition", "persist:browser");
      wv.setAttribute("allowpopups", "");
      frameRef.current.appendChild(wv);
      frameRef.current._webview = wv;

      const handleLoad = () => { setLoading(false); try { setTitle(wv.getTitle() || "Untitled"); } catch {} };
      const handleStart = () => setLoading(true);
      const handleTitle = (e) => setTitle(e.title || "Untitled");

      wv.addEventListener("did-navigate", handleLoad);
      wv.addEventListener("did-navigate-in-page", handleLoad);
      wv.addEventListener("did-start-loading", handleStart);
      wv.addEventListener("did-stop-loading", handleLoad);
      wv.addEventListener("page-title-updated", handleTitle);
    }
    setReady(true);
  }, []);

  const getFrame = useCallback(() => {
    if (!frameRef.current) return null;
    return frameRef.current._webview || frameRef.current;
  }, []);

  const navigate = useCallback((target) => {
    const formatted = formatUrl(target);
    if (formatted) {
      setUrl(formatted);
      setDisplayUrl(formatted);
      setIsPreview(false);
      setLoading(true);
      const f = getFrame();
      if (f) {
        if (isElectron && f.loadURL) f.loadURL(formatted);
        else if (f.src !== undefined) f.src = formatted;
      }
    }
  }, [getFrame]);

  const loadPreview = useCallback((html) => {
    setIsPreview(true);
    setTitle("Live Preview");
    setDisplayUrl("preview://localhost");
    const f = getFrame();
    if (f) {
      if (isElectron && f.loadURL) f.loadURL(`data:text/html,${encodeURIComponent(html)}`);
      else if (f.srcdoc !== undefined) f.srcdoc = html;
    }
  }, [getFrame]);

  useEffect(() => {
    if (previewHtml) loadPreview(previewHtml);
  }, [previewHtml, loadPreview]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") { e.preventDefault(); navigate(displayUrl); }
    if (e.key === "Escape") { e.target.blur(); }
  }, [displayUrl, navigate]);

  const goBack = useCallback(() => {
    const f = getFrame();
    if (f && isElectron && f.canGoBack && f.canGoBack()) f.goBack();
  }, [getFrame]);

  const goForward = useCallback(() => {
    const f = getFrame();
    if (f && isElectron && f.canGoForward && f.canGoForward()) f.goForward();
  }, [getFrame]);

  const reload = useCallback(() => {
    const f = getFrame();
    if (f) {
      if (isElectron && f.reload) f.reload();
      else if (f.src !== undefined) f.src = f.src;
    }
  }, [getFrame]);

  if (!ready) return null;

  return (
    <div className="browser">
      <div className="browser__toolbar">
        <div className="browser__nav">
          <button className="browser__btn" onClick={goBack} title="Back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button className="browser__btn" onClick={goForward} title="Forward">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="browser__btn" onClick={reload} title="Refresh">
            {loading ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            )}
          </button>
        </div>
        <div className="browser__url-bar">
          {isPreview ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="browser__url-icon">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="browser__url-icon">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
          )}
          <input
            ref={inputRef}
            id="browser-url"
            name="browser-url"
            className="browser__url-input"
            type="text"
            value={displayUrl}
            onChange={(e) => setDisplayUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isPreview ? "Live Preview" : "Enter URL or search..."}
            spellCheck={false}
            readOnly={isPreview}
          />
          {loading && <div className="browser__loading-bar"><div className="browser__loading-fill" /></div>}
        </div>
        <div className="browser__nav">
          {isPreview && <span className="browser__preview-badge">LIVE</span>}
          <button className="browser__btn browser__btn--close" onClick={onClose} title="Close Browser">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div className="browser__content">
        {!isElectron ? (
          <iframe
            ref={frameRef}
            src={url}
            className="browser__webview"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            title="Browser"
            onError={() => setLoading(false)}
          />
        ) : (
          <div ref={frameRef} className="browser__webview" />
        )}
      </div>
      <div className="browser__status">
        <span className="browser__status-title">{title}</span>
        <span className="browser__status-url">{isPreview ? "Live Preview" : url}</span>
      </div>
    </div>
  );
}
