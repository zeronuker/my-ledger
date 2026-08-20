function formatSyncTime(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    const dateStr = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
    const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    return `${dateStr} · ${timeStr}`
  } catch {
    return null
  }
}

// Online/offline + last-synced chip, doubling as the manual Sync button —
// edits always save locally and instantly; this is the only thing that
// pushes them to the cloud (see LedgerDataContext's sync()).
export default function SyncStatus({ isOnline, syncStatus, lastSyncTime, onSync }) {
  const state = !isOnline ? 'offline' : syncStatus
  const synced = formatSyncTime(lastSyncTime)

  const label = !isOnline ? 'OFFLINE'
    : syncStatus === 'syncing' ? 'SYNCING…'
    : syncStatus === 'error' ? 'SYNC FAILED'
    : synced ? synced
    : 'NOT SYNCED'

  const title = !isOnline ? 'Offline — connect to sync'
    : syncStatus === 'syncing' ? 'Syncing…'
    : 'Sync now'

  return (
    <button
      type="button"
      className={`sync-chip sync-chip--${state}`}
      onClick={onSync}
      disabled={!isOnline || syncStatus === 'syncing'}
      title={title}
    >
      <span className="sync-dot" />
      {label}
    </button>
  )
}
