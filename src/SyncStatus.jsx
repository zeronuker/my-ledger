import { useState } from 'react'

// Ported to match eLogBook's toolbar sync UI exactly (see my-elogbook's
// ELogbook.jsx: ToolbarSyncChip, timeOnly, the SYNC icon button, and the
// OFFLINE badge) — same colors, same tap-to-expand chip behavior, same
// icons. Cloud/App state names differ (isOnline/syncStatus/lastSyncTime
// come from LedgerDataContext here, cloudChipState/syncStatus there) but
// the rendered result is the same component, hand-ported since there's no
// shared brand-kit piece for this (unlike UpdatePrompt).

const timeOnly = (full) => (full ? full.split(' · ').pop() : '—')

function formatSyncDisplay(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${dateStr} · ${timeStr}`
  } catch {
    return null
  }
}

const CloudIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
)

// Tap to morph between compact (time only) and full (date + time, or a
// failure reason) detail, in place — no dropdown/popover/tooltip.
function ToolbarSyncChip({ compact, full, state, flash }) {
  const [expanded, setExpanded] = useState(false)
  const quietColor = state === 'bad' ? '#ef4444' : state === 'busy' ? '#7c87a3' : '#3a6a8a'
  const flashColor = state === 'bad' ? '#ef4444' : '#22c55e'

  return (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        background: 'none', border: 'none', padding: '4px 2px', fontFamily: 'var(--cb-font-mono)', cursor: 'pointer',
        transition: 'color 0.2s ease, font-size 0.2s ease',
        color: flash ? flashColor : quietColor,
        fontWeight: flash ? 700 : 400,
        fontStyle: flash || state === 'bad' ? 'normal' : 'italic',
        letterSpacing: flash ? '0.1em' : '0.06em',
        fontSize: flash ? 11 : 10,
        animation: state === 'busy' ? 'cb-sync-blink 1.3s ease-in-out infinite' : 'none',
      }}
    >
      <span style={{ display: 'flex', color: expanded ? '#3FE0C5' : 'inherit' }}><CloudIcon /></span>
      {flash && (state === 'bad' ? '✗ ' : '✓ ')}
      {expanded ? full : compact}
    </button>
  )
}

export default function SyncStatus({ isOnline, syncStatus, lastSyncTime, onSync }) {
  const lastSyncDisplay = formatSyncDisplay(lastSyncTime)

  const state = syncStatus === 'syncing' ? 'busy' : syncStatus === 'error' ? 'bad' : 'ok'
  const flash = syncStatus === 'synced' || syncStatus === 'error'
  const compact = state === 'busy' ? '…' : timeOnly(lastSyncDisplay)
  const full = state === 'bad'
    ? `Sync failed${lastSyncDisplay ? ` — last OK ${lastSyncDisplay}` : ''}`
    : lastSyncDisplay ? `Cloud sync — ${lastSyncDisplay}` : 'Not synced yet'

  return (
    <>
      {!isOnline && (
        <span style={{
          fontSize: 11, color: '#f5c542', letterSpacing: '0.1em', fontWeight: 700,
          background: 'rgba(245,197,66,0.1)', border: '1px solid rgba(245,197,66,0.3)', borderRadius: 3,
          padding: '2px 8px', whiteSpace: 'nowrap',
        }}>
          ✈ OFFLINE
        </span>
      )}

      {isOnline && <ToolbarSyncChip state={state} flash={flash} compact={compact} full={full} />}

      <button
        type="button"
        onClick={onSync}
        disabled={syncStatus === 'syncing' || !isOnline}
        title={!isOnline ? 'Offline — connect to sync' : syncStatus === 'syncing' ? 'Syncing…' : 'Sync to cloud'}
        style={{
          background: 'transparent', border: '1px solid var(--cb-line-2)', borderRadius: 4,
          color: !isOnline ? '#2a4a6a' : syncStatus === 'synced' ? '#22c55e' : syncStatus === 'error' ? '#ef4444' : syncStatus === 'syncing' ? '#f5c542' : '#3FE0C5',
          borderColor: !isOnline ? 'var(--cb-line-2)' : syncStatus === 'synced' ? '#22c55e' : syncStatus === 'error' ? '#ef4444' : syncStatus === 'syncing' ? '#f5c542' : 'var(--cb-line-2)',
          cursor: (syncStatus === 'syncing' || !isOnline) ? 'not-allowed' : 'pointer',
          opacity: (syncStatus === 'syncing' || !isOnline) ? 0.4 : 1,
          padding: '5px 7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.15s, border-color 0.15s',
        }}
      >
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ animation: syncStatus === 'syncing' ? 'cb-sync-spin 1s linear infinite' : 'none' }}
        >
          <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>
    </>
  )
}
