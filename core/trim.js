exports.trim = (messages, max = 6) => {
  const system = messages.find(m => m.role === "system");
  const rest = messages.filter(m => m.role !== "system");
  const tail = rest.slice(-max);
  return system ? [system, ...tail] : tail;
};
