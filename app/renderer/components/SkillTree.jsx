import { useState, useRef } from "react";

const SKILL_DATA = [
  {
    id: "think",
    name: "Thinking",
    desc: "Chain of thought reasoning",
    color: "#a78bfa",
    x: 50, y: 10,
    commands: ["think", "reason", "evaluate", "compare"],
    icon: (
      <>
        <path d="M9.5 2A5.5 5.5 0 0 0 5 12h1.5a3 3 0 0 1 3 3V18a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4v-3a3 3 0 0 1 3-3H19A5.5 5.5 0 0 0 14.5 2h-5z"/>
        <line x1="12" y1="2" x2="12" y2="6"/>
      </>
    )
  },
  {
    id: "edit",
    name: "Editing",
    desc: "Refactor & modify code",
    color: "#34d399",
    x: 88, y: 32,
    commands: ["edit", "refactor", "modify", "fix"],
    icon: (
      <>
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        <path d="M15 5l4 4"/>
      </>
    )
  },
  {
    id: "explore",
    name: "Exploring",
    desc: "Search & discover code",
    color: "#60a5fa",
    x: 12, y: 32,
    commands: ["explore", "find", "search", "discover"],
    icon: (
      <>
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </>
    )
  },
  {
    id: "analyze",
    name: "Analyzing",
    desc: "Deep code analysis",
    color: "#fbbf24",
    x: 28, y: 82,
    commands: ["analyze", "review", "audit", "debug"],
    icon: (
      <>
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </>
    )
  },
  {
    id: "write",
    name: "Writing",
    desc: "Generate code & docs",
    color: "#f472b6",
    x: 72, y: 82,
    commands: ["write", "create", "generate", "build"],
    icon: (
      <>
        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
        <line x1="16" y1="8" x2="2" y2="22"/>
        <line x1="17.5" y1="15" x2="9" y2="15"/>
      </>
    )
  },
  {
    id: "plan",
    name: "Planning",
    desc: "Architecture & roadmaps",
    color: "#fb923c",
    x: 50, y: 56,
    commands: ["plan", "design", "architect", "roadmap"],
    icon: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </>
    )
  }
];

const CENTER = { x: 50, y: 42 };

function SkillTree({ onSelectSkill, onClose }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  function handleNodeClick(skill) {
    setSelected(skill.id === selected ? null : skill.id);
  }

  function handleActivate() {
    const skill = SKILL_DATA.find(s => s.id === selected);
    if (skill) onSelectSkill(skill);
  }

  return (
    <div className="skilltree-overlay" onClick={onClose}>
      <div className="skilltree" onClick={e => e.stopPropagation()}>
        <div className="skilltree__header">
          <div className="skilltree__title-row">
            <svg className="skilltree__logo" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2d48" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span className="skilltree__title">SKILLS</span>
          </div>
          <button type="button" className="skilltree__close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="skilltree__canvas">
          <svg viewBox="0 0 100 92" className="skilltree__svg">
            {SKILL_DATA.map(skill => {
              const isH = hovered === skill.id;
              const isS = selected === skill.id;
              return (
                <line
                  key={`line-${skill.id}`}
                  x1={CENTER.x} y1={CENTER.y}
                  x2={skill.x} y2={skill.y}
                  stroke={isH || isS ? skill.color : "#1a1a24"}
                  strokeWidth={isH || isS ? "0.25" : "0.15"}
                  style={{ transition: "all 0.4s ease" }}
                />
              );
            })}

            <line x1={50} y1={10} x2={88} y2={32} stroke="#111118" strokeWidth="0.1"/>
            <line x1={50} y1={10} x2={12} y2={32} stroke="#111118" strokeWidth="0.1"/>
            <line x1={88} y1={32} x2={72} y2={82} stroke="#111118" strokeWidth="0.1"/>
            <line x1={12} y1={32} x2={28} y2={82} stroke="#111118" strokeWidth="0.1"/>
            <line x1={28} y1={82} x2={72} y2={82} stroke="#111118" strokeWidth="0.1"/>

            <g className="skilltree__center">
              <circle cx={CENTER.x} cy={CENTER.y} r="5.5" fill="#08080a" stroke="#ff2d48" strokeWidth="0.2"/>
              <circle cx={CENTER.x} cy={CENTER.y} r="3.5" fill="none" stroke="#ff2d48" strokeWidth="0.08" strokeDasharray="0.8 0.6" opacity="0.5">
                <animateTransform attributeName="transform" type="rotate" from={`0 ${CENTER.x} ${CENTER.y}`} to={`360 ${CENTER.x} ${CENTER.y}`} dur="20s" repeatCount="indefinite"/>
              </circle>
              <text x={CENTER.x} y={CENTER.y - 0.8} textAnchor="middle" fill="#ff2d48" fontSize="1.8" fontFamily="JetBrains Mono, monospace" fontWeight="700" letterSpacing="0.1">WG</text>
              <text x={CENTER.x} y={CENTER.y + 1.8} textAnchor="middle" fill="rgba(255,45,72,0.4)" fontSize="0.9" fontFamily="JetBrains Mono, monospace" fontWeight="500" letterSpacing="0.15">CORE</text>
            </g>

            {SKILL_DATA.map(skill => {
              const isH = hovered === skill.id;
              const isS = selected === skill.id;
              const r = isH ? 4.2 : 3.5;
              return (
                <g
                  key={skill.id}
                  className="skilltree__node"
                  onMouseEnter={() => setHovered(skill.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleNodeClick(skill)}
                  style={{ cursor: "pointer" }}
                >
                  <circle cx={skill.x} cy={skill.y} r={r + 1.2} fill={skill.color} opacity={isH || isS ? 0.1 : 0} style={{ transition: "opacity 0.3s" }}/>
                  <circle cx={skill.x} cy={skill.y} r={r} fill="#08080a" stroke={isH || isS ? skill.color : "#1e1e28"} strokeWidth={isH || isS ? "0.3" : "0.15"} style={{ transition: "all 0.3s" }}/>
                  <circle cx={skill.x} cy={skill.y} r={r - 1.5} fill={skill.color} opacity={isH || isS ? 0.2 : 0.08} style={{ transition: "opacity 0.3s" }}/>
                  <g transform={`translate(${skill.x - 2}, ${skill.y - 2})`} opacity={isH || isS ? 1 : 0.5} style={{ transition: "opacity 0.3s" }}>
                    <svg width="4" height="4" viewBox="0 0 24 24" fill="none" stroke={skill.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {skill.icon}
                    </svg>
                  </g>
                  <text x={skill.x} y={skill.y + r + 2.2} textAnchor="middle" fill={isH || isS ? skill.color : "#4a4a58"} fontSize="1.6" fontFamily="JetBrains Mono, monospace" fontWeight="600" letterSpacing="0.05" style={{ transition: "fill 0.3s" }}>
                    {skill.name}
                  </text>
                  {isS && (
                    <circle cx={skill.x} cy={skill.y} r={r + 2.8} fill="none" stroke={skill.color} strokeWidth="0.08" strokeDasharray="1 0.8" opacity="0.5">
                      <animateTransform attributeName="transform" type="rotate" from={`0 ${skill.x} ${skill.y}`} to={`360 ${skill.x} ${skill.y}`} dur="10s" repeatCount="indefinite"/>
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {selected && (
            <div className="skilltree__panel">
              <div className="skilltree__panel-line" style={{ background: SKILL_DATA.find(s => s.id === selected)?.color }}/>
              <div className="skilltree__panel-header">
                <span className="skilltree__panel-name">{SKILL_DATA.find(s => s.id === selected)?.name}</span>
                <span className="skilltree__panel-status">READY</span>
              </div>
              <p className="skilltree__panel-desc">{SKILL_DATA.find(s => s.id === selected)?.desc}</p>
              <div className="skilltree__panel-cmds">
                {SKILL_DATA.find(s => s.id === selected)?.commands.map(cmd => (
                  <span key={cmd} className="skilltree__panel-cmd">/{cmd}</span>
                ))}
              </div>
              <button type="button" className="skilltree__activate" onClick={handleActivate} style={{ "--btn-color": SKILL_DATA.find(s => s.id === selected)?.color }}>
                RUN
              </button>
            </div>
          )}
        </div>

        <div className="skilltree__footer">
          <span>select node // activate skill</span>
        </div>
      </div>
    </div>
  );
}

export default SkillTree;