import CodeBlock from "./CodeBlock.jsx";

const LANG_MAP = { js: "javascript", ts: "typescript", py: "python", rb: "ruby", sh: "bash", bash: "bash", html: "html", css: "css", json: "json", yaml: "yaml", md: "markdown", java: "java", go: "go", rust: "rust" };

function extractParts(text) {
  if (!text) return [{ type: "text", value: "" }];
  const parts = [];
  const regex = /```(\w*)\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    const lang = match[1]?.trim();
    const body = (match[2] || "").replace(/\n$/, "");
    if (lang === "execute") parts.push({ type: "execute", value: body });
    else if (lang === "result") parts.push({ type: "result", value: body });
    else { const k = lang?.toLowerCase(); parts.push({ type: "code", value: body, lang: k ? (LANG_MAP[k] || k) : null }); }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: "text", value: text.slice(lastIndex) });
  if (parts.length === 0) parts.push({ type: "text", value: text });
  return parts;
}

export default function Message({ role, text, pending, children }) {
  const parts = extractParts(text);
  return (
    <div className={`message message--${role}${pending ? " message--pending" : ""}`}>
      <div className="message__avatar">
        {role === "user"
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        }
      </div>
      <div className="message__body">
        <div className="message__meta">{role === "user" ? "You" : "Firewire"}</div>
        <div className="message__bubble">
          {pending ? children : parts.map((p, i) => {
            if (p.type === "code") return <CodeBlock key={i} code={p.value} lang={p.lang} />;
            if (p.type === "execute") return <CodeBlock key={i} code={p.value} execute />;
            if (p.type === "result") return <div key={i} className="code-block"><div className="code-block__header"><span className="code-block__lang">output</span></div><div className="code-block__output"><pre className="code-block__output-text">{p.value}</pre></div></div>;
            return <div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{p.value}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
