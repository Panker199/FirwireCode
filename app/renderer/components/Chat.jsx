import Message from "./Message.jsx";
import Input from "./Input.jsx";

export default function Chat({ messages, onSend, isSending, error }) {
  const showEmpty = messages.length === 0 && !isSending;

  return (
    <section className="chat">
      <div className="chat__stage">
        {showEmpty ? (
          <div className="chat__empty">
            <div className="chat__empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="chat__empty-text">WormGPT</div>
            <div className="chat__empty-hint">Unleashed and Uncensored</div>
          </div>
        ) : (
          <div className="chat__messages">
            <div className="chat__messages-inner">
              {messages.map((m, i) => (
                <Message key={i} role={m.role} text={m.content} />
              ))}
              {isSending && (
                <Message role="assistant" pending>
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                </Message>
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="chat__error">
          <div className="chat__error-inner">{error}</div>
        </div>
      )}
      <div className="input-area">
        <div className="input-area__inner">
          <Input onSend={onSend} disabled={isSending} />
        </div>
      </div>
    </section>
  );
}
