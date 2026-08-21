export default function Message({ role, text, pending = false, children }) {
  const isUser = role === "user";
  const classes = [
    "message",
    isUser ? "message--user" : "message--assistant",
    pending ? "message--pending" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="message__avatar">
        {isUser ? "U" : "W"}
      </div>
      <div className="message__body">
        <div className="message__meta">        {isUser ? "You" : "WormGPT"}</div>
        <div className="message__bubble">
          {children || <div className="message__text">{text}</div>}
        </div>
      </div>
    </div>
  );
}
