import {
  collection, doc, getDoc, getDocs, writeBatch, setDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTION_NAMES } from './collections'

// Firestore rejects undefined/NaN/Infinity — strip/convert them so a write
// never fails on a value the UI happens to produce (e.g. a blank amount).
function sanitize(val) {
  if (Array.isArray(val)) return val.map(sanitize)
  if (val !== null && typeof val === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(val)) {
      if (v === undefined) continue
      out[k] = sanitize(v)
    }
    return out
  }
  if (typeof val === 'number' && !isFinite(val)) return 0
  return val
}

const BATCH_SIZE = 400 // headroom under Firestore's 500-op batch cap

async function commitInBatches(ops) {
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const op of ops.slice(i, i + BATCH_SIZE)) {
      if (op.type === 'delete') batch.delete(op.ref)
      else batch.set(op.ref, op.data)
    }
    await batch.commit()
  }
}

// The single "when did the cloud last change" pointer every device compares
// its own last-synced-at against to decide silent-pull vs conflict vs push.
export async function fetchCloudMeta(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'meta', 'sync'))
  return snap.exists() ? snap.data().updatedAt || null : null
}

export async function pullAllFromCloud(uid) {
  const collections = {}
  for (const name of COLLECTION_NAMES) {
    const snap = await getDocs(collection(db, 'users', uid, name))
    const map = {}
    snap.forEach((d) => { map[d.id] = d.data() })
    collections[name] = map
  }
  const settingsSnap = await getDoc(doc(db, 'users', uid, 'settings', 'appearance'))
  const settings = settingsSnap.exists() ? settingsSnap.data() : {}
  return { collections, settings }
}

// Whole-dataset swap: every collection ends up matching `data` exactly —
// cloud docs missing from `data` are deleted, everything in `data` is
// upserted. This is the "keep local" / regular push side of the sync model.
export async function pushAllToCloud(uid, data) {
  for (const name of COLLECTION_NAMES) {
    const localMap = data.collections[name] || {}
    const cloudSnap = await getDocs(collection(db, 'users', uid, name))
    const localIds = new Set(Object.keys(localMap))

    const ops = []
    for (const d of cloudSnap.docs) {
      if (!localIds.has(d.id)) ops.push({ type: 'delete', ref: d.ref })
    }
    for (const id of localIds) {
      ops.push({ type: 'set', ref: doc(db, 'users', uid, name, id), data: sanitize(localMap[id]) })
    }
    await commitInBatches(ops)
  }

  await setDoc(doc(db, 'users', uid, 'settings', 'appearance'), sanitize(data.settings || {}))

  const now = new Date().toISOString()
  await setDoc(doc(db, 'users', uid, 'meta', 'sync'), { updatedAt: now })
  return now
}

// Full account wipe (delete-account flow) — every collection doc plus the
// settings and sync-meta docs. Local cache is cleared separately by the
// caller via localStore's clearLocalData.
export async function clearAllCloudData(uid) {
  for (const name of COLLECTION_NAMES) {
    const snap = await getDocs(collection(db, 'users', uid, name))
    await commitInBatches(snap.docs.map((d) => ({ type: 'delete', ref: d.ref })))
  }
  await deleteDoc(doc(db, 'users', uid, 'settings', 'appearance')).catch(() => {})
  await deleteDoc(doc(db, 'users', uid, 'meta', 'sync')).catch(() => {})
}
