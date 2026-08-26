import { useState, useEffect } from "react";

const SKILL_ICONS = {
  brain: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 0 1 5 5c0 1.1-.4 2.1-1 2.9.6.8 1 1.8 1 2.9a5 5 0 0 1-2 4v.2a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V12.8a5 5 0 0 1-2-4c0-1.1.4-2.1 1-2.9A5 5 0 0 1 7 7a5 5 0 0 1 5-5z"/>
      <path d="M12 2v20"/>
    </svg>
  ),
  pencil: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  ),
  compass: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  ),
  chart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  feather: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
      <line x1="16" y1="8" x2="2" y2="22"/>
      <line x1="17.5" y1="15" x2="9" y2="15"/>
    </svg>
  ),
  layers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  )
};

export default function Skills({ onSelectSkill, onClose }) {
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    window.electron?.listSkills?.().then(setSkills).catch(() => {});
  }, []);

  return (
    <div className="skills-overlay" onClick={onClose}>
      <div className="skills-panel" onClick={e => e.stopPropagation()}>
        <div className="skills-header">
          <span className="skills-title">Skills</span>
          <button type="button" className="skills-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="skills-body">
          <div className="skills-hint">
            Type <code>/skillname</code> in chat or click a skill below
          </div>
          <div className="skills-grid">
            {skills.map(skill => (
              <button
                key={skill.id}
                type="button"
                className="skills-card"
                onClick={() => onSelectSkill(skill)}
                style={{ "--skill-color": skill.color }}
              >
                <div className="skills-card__icon" style={{ color: skill.color }}>
                  {SKILL_ICONS[skill.icon]}
                </div>
                <div className="skills-card__info">
                  <div className="skills-card__name">{skill.name}</div>
                  <div className="skills-card__desc">{skill.description}</div>
                  <div className="skills-card__cmd">/{skill.commands[0]}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}