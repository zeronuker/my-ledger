// Ported to match eLogBook's sync-conflict card exactly (no shared brand-kit
// component for this — see my-elogbook's ELogbook.jsx, the `syncConflict`
// overlay) — same layout, same amber conflict theming, same copy, same
// LOCAL SYNCED / CLOUD UPDATED footer.
function formatTimestamp(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${dateStr} · ${timeStr}`
  } catch {
    return '—'
  }
}

export default function SyncConflictModal({ lastSyncTime, cloudUpdatedAt, onKeepLocal, onKeepCloud }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 4000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        width: 'min(360px, 100%)',
        background: 'var(--cb-surface-1)',
        border: '1px solid rgba(245,197,66,0.3)',
        borderRadius: 10, padding: '18px 18px 16px',
        boxShadow: '0 20px 56px rgba(0,0,0,0.55)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: '#f5c542', boxShadow: '0 0 0 3px rgba(245,197,66,0.2)',
          }} />
          <span style={{
            fontFamily: 'var(--cb-font-mono)', fontSize: 10,
            letterSpacing: '0.14em', color: '#f5c542', textTransform: 'uppercase',
          }}>
            Sync conflict
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cb-ink)', letterSpacing: '0.02em', marginBottom: 10 }}>
          Cloud has newer data
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--cb-ink-2)', lineHeight: 1.6, marginBottom: 16 }}>
          Another device synced after your last sync here. Pick which version to keep — the other will be overwritten.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onKeepLocal}
            style={{
              flex: 1, background: 'transparent', border: '1px solid var(--cb-line-2)', borderRadius: 6,
              color: 'var(--cb-ink-dim)', fontFamily: 'var(--cb-font-mono)',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '10px 0', cursor: 'pointer', opacity: 0.7,
            }}
          >Keep local</button>
          <button
            onClick={onKeepCloud}
            style={{
              flex: 1, background: '#f5c542', border: 'none', borderRadius: 6,
              color: '#241a03', fontFamily: 'var(--cb-font-mono)',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '10px 0', cursor: 'pointer',
            }}
          >Keep cloud</button>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: 'var(--cb-font-mono)', fontSize: 9.5,
          color: 'var(--cb-ink-dim)', marginTop: 12, paddingTop: 10,
          borderTop: '1px solid var(--cb-line)',
        }}>
          <span>LOCAL SYNCED · {formatTimestamp(lastSyncTime)}</span>
          <span>CLOUD UPDATED · {formatTimestamp(cloudUpdatedAt)}</span>
        </div>
      </div>
    </div>
  )
}
