import { useEffect, useRef, memo } from "react";
import Input from "./Input.jsx";
import CodeBlock from "./CodeBlock.jsx";

const Msg = memo(function Msg({ msg }) {
  const u = msg.role === "user";
  return (
    <div className={`msg ${u ? "msg--user" : "msg--assistant"}`}>
      <div className="msg__av">{u ? "U" : "A"}</div>
      <div className="msg__body">
        <div className="msg__name">{u ? "You" : "Assistant"}</div>
        <div className="msg__text">
          {msg.pending ? <div className="dots"><span /><span /><span /></div> : <Render content={msg.content} />}
        </div>
      </div>
    </div>
  );
});

const Render = memo(function Render({ content }) {
  if (!content) return null;
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((p, i) => {
    const m = p.match(/^```(\w*)\n?([\s\S]*?)```$/);
    if (m) return <CodeBlock key={i} language={m[1] || "text"} code={m[2]} />;
    return <span key={i}>{p}</span>;
  });
});

export default function Chat({ msgs, onSend, sending, error, provider, model, onModel }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
    }
  }, [msgs, sending]);

  return (
    <div className="chat">
      {msgs.length === 0 ? (
        <div className="chat__empty"><span className="chat__empty-text">What can I help with?</span></div>
      ) : (
        <div className="chat__msgs" ref={ref}>{msgs.map((m, i) => <Msg key={i} msg={m} />)}</div>
      )}
      <div className="chat__in">
        <Input onSend={onSend} off={sending} provider={provider} model={model} onModel={onModel} />
        {error && <div className="in__err">{error}</div>}
      </div>
    </div>
  );
}
