import { COLLECTION_NAMES } from './collections'

// localStorage is the offline source of truth for one user's whole ledger —
// every collection plus the settings doc, keyed by uid so switching accounts
// on the same device/browser never mixes data.
const lsDataKey = (uid) => `ml_data_${uid}`
const lsSyncedAtKey = (uid) => `ml_synced_at_${uid}`
const lsDirtyKey = (uid) => `ml_dirty_${uid}`

export function emptyLocalData() {
  return {
    collections: Object.fromEntries(COLLECTION_NAMES.map((name) => [name, {}])),
    settings: {},
  }
}

export function loadLocalData(uid) {
  try {
    const raw = localStorage.getItem(lsDataKey(uid))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Merge onto emptyLocalData so a collection added after this device's
    // last write doesn't come back `undefined` and break callers.
    const base = emptyLocalData()
    return {
      collections: { ...base.collections, ...(parsed.collections || {}) },
      settings: parsed.settings || {},
    }
  } catch (err) {
    console.error('Failed to read local ledger data:', err)
    return null
  }
}

export function saveLocalData(uid, data) {
  localStorage.setItem(lsDataKey(uid), JSON.stringify(data))
}

export function getSyncedAt(uid) {
  return localStorage.getItem(lsSyncedAtKey(uid))
}

export function setSyncedAt(uid, iso) {
  localStorage.setItem(lsSyncedAtKey(uid), iso)
}

// Persisted (not just an in-memory ref) so a page reload doesn't forget that
// this device has edits the cloud hasn't seen yet — losing that would let a
// silent background pull clobber unsynced local changes.
export function getDirty(uid) {
  return localStorage.getItem(lsDirtyKey(uid)) === '1'
}

export function setDirty(uid, dirty) {
  localStorage.setItem(lsDirtyKey(uid), dirty ? '1' : '0')
}

export function clearLocalData(uid) {
  localStorage.removeItem(lsDataKey(uid))
  localStorage.removeItem(lsSyncedAtKey(uid))
  localStorage.removeItem(lsDirtyKey(uid))
}
