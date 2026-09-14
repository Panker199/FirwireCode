import { useState, useRef, useEffect, useCallback } from "react";

function formatUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return "https://" + trimmed;
  return "https://www.google.com/search?q=" + encodeURIComponent(trimmed);
}

export default function Browser({ onClose, defaultUrl, previewHtml }) {
  const webviewRef = useRef(null);
  const inputRef = useRef(null);
  const [url, setUrl] = useState(defaultUrl || "https://www.google.com");
  const [displayUrl, setDisplayUrl] = useState(defaultUrl || "https://www.google.com");
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [title, setTitle] = useState("New Tab");
  const [isPreview, setIsPreview] = useState(false);

  const navigate = useCallback((target) => {
    const formatted = formatUrl(target);
    if (formatted) {
      setUrl(formatted);
      setDisplayUrl(formatted);
      setIsPreview(false);
    }
  }, []);

  const loadPreview = useCallback((html) => {
    if (!webviewRef.current || !html) return;
    setIsPreview(true);
    setTitle("Live Preview");
    setDisplayUrl("preview://localhost");
    webviewRef.current.loadURL(`data:text/html,${encodeURIComponent(html)}`);
  }, []);

  useEffect(() => {
    if (previewHtml) loadPreview(previewHtml);
  }, [previewHtml, loadPreview]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      navigate(displayUrl);
    }
    if (e.key === "Escape") {
      e.target.blur();
    }
  }, [displayUrl, navigate]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const handleDidNavigate = (e) => {
      if (!isPreview) {
        setDisplayUrl(e.url);
      }
      setCanGoBack(wv.canGoBack());
      setCanGoForward(wv.canGoForward());
    };

    const handleDidStartLoading = () => setLoading(true);
    const handleDidStopLoading = () => setLoading(false);
    const handlePageTitleUpdated = (e) => {
      if (!isPreview) setTitle(e.title || "Untitled");
    };

    wv.addEventListener("did-navigate", handleDidNavigate);
    wv.addEventListener("did-navigate-in-page", handleDidNavigate);
    wv.addEventListener("did-start-loading", handleDidStartLoading);
    wv.addEventListener("did-stop-loading", handleDidStopLoading);
    wv.addEventListener("page-title-updated", handlePageTitleUpdated);

    return () => {
      wv.removeEventListener("did-navigate", handleDidNavigate);
      wv.removeEventListener("did-navigate-in-page", handleDidNavigate);
      wv.removeEventListener("did-start-loading", handleDidStartLoading);
      wv.removeEventListener("did-stop-loading", handleDidStopLoading);
      wv.removeEventListener("page-title-updated", handlePageTitleUpdated);
    };
  }, [isPreview]);

  const goBack = useCallback(() => {
    const wv = webviewRef.current;
    if (wv && wv.canGoBack()) wv.goBack();
  }, []);

  const goForward = useCallback(() => {
    const wv = webviewRef.current;
    if (wv && wv.canGoForward()) wv.goForward();
  }, []);

  const reload = useCallback(() => {
    const wv = webviewRef.current;
    if (wv) wv.reload();
  }, []);

  return (
    <div className="browser">
      <div className="browser__toolbar">
        <div className="browser__nav">
          <button className="browser__btn" onClick={goBack} disabled={!canGoBack} title="Back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button className="browser__btn" onClick={goForward} disabled={!canGoForward} title="Forward">
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
            placeholder={isPreview ? "Live Preview" : "Search or enter URL"}
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
        <webview
          ref={webviewRef}
          src={url}
          className="browser__webview"
          partition="persist:browser"
          allowpopups
        />
      </div>
      <div className="browser__status">
        <span className="browser__status-title">{title}</span>
        <span className="browser__status-url">{isPreview ? "Live Preview" : url}</span>
      </div>
    </div>
  );
}
