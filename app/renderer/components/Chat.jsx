import Message from "./Message.jsx";
import Input from "./Input.jsx";

export default function Chat({ messages, onSend, isSending, error }) {
  const showIntro = messages.length === 0 && !isSending;

  return (
    <section className="chat">
      <div className="chat__stage">
        {showIntro && <div className="chat__logo" aria-hidden="true" />}
        <div className="chat__messages">
          {messages.map((m, i) => (
            <Message key={i} role={m.role} text={m.content} />
          ))}
          {isSending && <Message role="assistant" text="Thinking..." pending />}
        </div>
      </div>
      {error && <div className="chat__error">{error}</div>}
      <Input onSend={onSend} disabled={isSending} />
    </section>
  );
}
