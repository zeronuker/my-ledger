// Ported from eLogBook's save chip (ELogbook.jsx: saveStatus/lastSaveTime,
// the SAVING.../✓ SAVED TO LOCAL STORAGE chip) — same wording, colors,
// and timing (1s debounce, 2s hold, 0.5s fade). The localStorage write
// itself is synchronous; this is purely visual feedback that it happened.

function formatSaveTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${dateStr} • ${timeStr}`
}

export default function LocalSaveStatus({ saveStatus, lastSaveTime }) {
  if (saveStatus === 'idle') return null

  if (saveStatus === 'saving') {
    return (
      <span style={{
        fontSize: 10, fontStyle: 'italic', letterSpacing: '0.10em', fontFamily: 'var(--cb-font-mono)',
        color: '#f5c542', display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{ display: 'inline-block', animation: 'cb-sync-spin 0.7s linear infinite', fontSize: 12 }}>↻</span>
        SAVING...
      </span>
    )
  }

  return (
    <span style={{
      fontSize: 10, fontStyle: 'italic', fontWeight: 700, letterSpacing: '0.10em', fontFamily: 'var(--cb-font-mono)',
      color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5,
      animation: saveStatus === 'saved' ? 'cb-save-pulse 0.6s ease-out' : 'none',
      opacity: saveStatus === 'fading' ? 0 : 1,
      transition: saveStatus === 'fading' ? 'opacity 0.5s ease' : 'none',
    }}>
      ✓ SAVED TO LOCAL STORAGE&nbsp;&nbsp;{formatSaveTime(lastSaveTime)}
    </span>
  )
}
