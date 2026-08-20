// Whole-account conflict: this device and the cloud both changed since the
// last sync. No backdrop-click-to-dismiss here — the user has to pick a side.
export default function SyncConflictModal({ onKeepLocal, onKeepCloud }) {
  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Sync conflict</h3>
        </div>
        <div className="modal-body">
          <p className="dim">
            This device and the cloud both have changes since the last sync.
            Choose which version to keep — the other will be overwritten.
          </p>
          <div className="setting-row" style={{ flexDirection: 'row', gap: 10 }}>
            <button className="cb-btn cb-btn--primary" onClick={onKeepLocal}>KEEP THIS DEVICE</button>
            <button className="cb-btn" onClick={onKeepCloud}>KEEP CLOUD</button>
          </div>
        </div>
      </div>
    </div>
  )
}
