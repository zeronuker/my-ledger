// Small presentational building blocks for the Settings modal — ported
// from eLogBook's SettingsModal.jsx (SmSectionHead, SmField, SmRow,
// SmSegmented, SmSlider, SmCloseIcon). See index.css's "Settings modal"
// block for the sm- class styling.

export function SmSectionHead({ title, hint }) {
  return (
    <div className="sm-sh">
      <h3 className="sm-sh-title">{title}</h3>
      {hint && <span className="sm-sh-hint">{hint}</span>}
    </div>
  )
}

export function SmField({ label, hint, children }) {
  return (
    <div className="sm-field">
      <div className="sm-field-meta">
        <label className="sm-field-label">{label}</label>
        {hint && <div className="sm-field-hint">{hint}</div>}
      </div>
      {children && <div className="sm-field-control">{children}</div>}
    </div>
  )
}

export function SmRow({ children }) {
  return <div className="sm-row">{children}</div>
}

export function SmSegmented({ value, onChange, options }) {
  return (
    <div className="sm-seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`sm-seg-item${value === o.value ? ' on' : ''}`}
          onClick={() => onChange?.(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SmSlider({ min, max, step, value, onChange, ticks = [], unit = '' }) {
  return (
    <div className="sm-slider-wrap">
      <input
        type="range" className="sm-slider"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
      />
      {ticks.length > 0 && (
        <div className="sm-slider-ticks">
          {ticks.map((t) => <span key={t}>{t}</span>)}
        </div>
      )}
      <div className="sm-slider-value">{value}{unit}</div>
    </div>
  )
}

export function SmCloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  )
}
