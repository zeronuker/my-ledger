import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  emptyLocalData, loadLocalData, saveLocalData, getSyncedAt, setSyncedAt, getDirty, setDirty,
} from './localStore'
import { fetchCloudMeta, pullAllFromCloud, pushAllToCloud } from './cloudSync'

const LedgerDataCtx = createContext(null)

export function useLedgerData() {
  const ctx = useContext(LedgerDataCtx)
  if (!ctx) throw new Error('useLedgerData must be used within a LedgerDataProvider')
  return ctx
}

// Local-first store for the whole ledger: every write lands in React state +
// localStorage immediately (instant, works offline), and only reaches
// Firestore on an explicit sync — on app load, on reconnect/resume (silent
// pull only), or via the Sync button / conflict-resolution choice (push).
// One `users/{uid}/meta/sync.updatedAt` timestamp stands in for "the whole
// account changed" so a single check covers every collection at once.
export function LedgerDataProvider({ uid, children }) {
  const [data, setData] = useState(emptyLocalData)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | synced | error
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [conflict, setConflict] = useState(null) // { cloudData, cloudUpdatedAt }
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | fading
  const [lastSaveTime, setLastSaveTime] = useState(null)

  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])

  const saveDebounceRef = useRef(null)
  const saveFadeRef = useRef(null)
  const saveIdleRef = useRef(null)

  // Ported from eLogBook's save chip (ELogbook.jsx saveData): the actual
  // localStorage write is already synchronous/instant — this timing is
  // purely a visual debounce so rapid edits don't flicker the chip.
  const flashSaved = useCallback(() => {
    setSaveStatus('saving')
    clearTimeout(saveDebounceRef.current)
    clearTimeout(saveFadeRef.current)
    clearTimeout(saveIdleRef.current)
    saveDebounceRef.current = setTimeout(() => {
      setLastSaveTime(new Date().toISOString())
      setSaveStatus('saved')
      saveFadeRef.current = setTimeout(() => {
        setSaveStatus('fading')
        saveIdleRef.current = setTimeout(() => setSaveStatus('idle'), 500)
      }, 2000)
    }, 1000)
  }, [])

  const flashStatus = useCallback((status, ms) => {
    setSyncStatus(status)
    setTimeout(() => setSyncStatus('idle'), ms)
  }, [])

  // Silent background check — runs on load, reconnect, and tab/app resume.
  // Only ever pulls (or opens the conflict modal); never pushes on its own,
  // so local edits always wait for an explicit sync before reaching the cloud.
  const checkCloudSync = useCallback(async (targetUid) => {
    if (!targetUid || !navigator.onLine) return
    try {
      const cloudUpdatedAt = await fetchCloudMeta(targetUid)
      const syncedAt = getSyncedAt(targetUid)
      if (!cloudUpdatedAt || !syncedAt) return
      if (!(new Date(cloudUpdatedAt) > new Date(syncedAt))) return // cloud isn't newer

      if (getDirty(targetUid)) {
        // Cloud moved on AND this device has unsynced edits — genuine conflict.
        const cloud = await pullAllFromCloud(targetUid)
        setConflict({ cloudData: cloud, cloudUpdatedAt })
        return
      }

      // Cloud is newer, local has nothing to lose — pull it in quietly.
      const cloud = await pullAllFromCloud(targetUid)
      saveLocalData(targetUid, cloud)
      setSyncedAt(targetUid, cloudUpdatedAt)
      setData(cloud)
      setLastSyncTime(cloudUpdatedAt)
      flashStatus('synced', 3000)
    } catch (err) {
      console.warn('Background cloud check failed:', err)
    }
  }, [flashStatus])

  // Load (or first-pull) whenever the signed-in user changes.
  useEffect(() => {
    if (!uid) {
      setData(emptyLocalData())
      setDataLoaded(false)
      return
    }
    let cancelled = false
    // Clear the previous account's data synchronously, before the async load
    // below even starts — otherwise a same-tab account switch (sign out,
    // sign in as someone else, no page reload) could render the old user's
    // numbers for a tick while the new user's local cache is read.
    setData(emptyLocalData())
    setDataLoaded(false)
    setLastSyncTime(null)
    setSyncStatus('idle')
    setConflict(null)

    ;(async () => {
      const local = loadLocalData(uid)
      if (local) {
        if (cancelled) return
        setData(local)
        setDataLoaded(true)
        const syncedAt = getSyncedAt(uid)
        if (syncedAt) setLastSyncTime(syncedAt)
        checkCloudSync(uid)
        return
      }

      // No local cache — first time on this device. Needs the network once.
      if (!navigator.onLine) {
        if (!cancelled) setDataLoaded(true)
        return
      }
      try {
        const cloud = await pullAllFromCloud(uid)
        const cloudUpdatedAt = await fetchCloudMeta(uid)
        const now = cloudUpdatedAt || new Date().toISOString()
        saveLocalData(uid, cloud)
        setSyncedAt(uid, now)
        setDirty(uid, false)
        if (cancelled) return
        setData(cloud)
        setDataLoaded(true)
        setLastSyncTime(now)
      } catch (err) {
        console.error('Initial cloud pull failed:', err)
        if (!cancelled) setDataLoaded(true)
      }
    })()

    return () => { cancelled = true }
  }, [uid, checkCloudSync])

  // Online/offline + resume — trigger the same silent check.
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); checkCloudSync(uid) }
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [uid, checkCloudSync])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) checkCloudSync(uid)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [uid, checkCloudSync])

  // ── Local mutations — instant, offline-safe, mark the account dirty ──
  const mutateCollection = useCallback((name, updater) => {
    setData((prev) => {
      const next = { ...prev, collections: { ...prev.collections, [name]: updater(prev.collections[name] || {}) } }
      saveLocalData(uid, next)
      return next
    })
    setDirty(uid, true)
    flashSaved()
  }, [uid, flashSaved])

  const addItem = useCallback((name, itemData) => {
    const id = crypto.randomUUID()
    mutateCollection(name, (coll) => ({ ...coll, [id]: itemData }))
    return id
  }, [mutateCollection])

  // Partial update — merges onto whatever's already at `id` (creates it if
  // there's nothing there yet), matching the old setDoc(..., {merge:true}).
  const updateItem = useCallback((name, id, patch) => {
    mutateCollection(name, (coll) => ({ ...coll, [id]: { ...(coll[id] || {}), ...patch } }))
  }, [mutateCollection])

  // Full replace at a known id — matching setDoc(..., {merge:false}).
  const setItemFull = useCallback((name, id, itemData) => {
    mutateCollection(name, (coll) => ({ ...coll, [id]: itemData }))
  }, [mutateCollection])

  // Bulk variant of addItem — one setData/localStorage write for the whole
  // batch instead of one per item, which matters once a batch reaches into
  // the hundreds (e.g. a CSV import) since every write serializes the
  // entire local snapshot.
  const addManyItems = useCallback((name, itemsDataArray) => {
    const ids = itemsDataArray.map(() => crypto.randomUUID())
    mutateCollection(name, (coll) => {
      const next = { ...coll }
      itemsDataArray.forEach((data, i) => { next[ids[i]] = data })
      return next
    })
    return ids
  }, [mutateCollection])

  const removeItem = useCallback((name, id) => {
    mutateCollection(name, (coll) => {
      const next = { ...coll }
      delete next[id]
      return next
    })
  }, [mutateCollection])

  const updateSettings = useCallback((patch) => {
    setData((prev) => {
      const next = { ...prev, settings: { ...prev.settings, ...patch } }
      saveLocalData(uid, next)
      return next
    })
    setDirty(uid, true)
  }, [uid])

  // ── Manual sync — the only path that ever pushes local edits out ──
  const sync = useCallback(async () => {
    if (!uid || !navigator.onLine || syncStatus === 'syncing') return
    setSyncStatus('syncing')
    try {
      const cloudUpdatedAt = await fetchCloudMeta(uid)
      const syncedAt = getSyncedAt(uid)
      const cloudIsNewer = cloudUpdatedAt && (!syncedAt || new Date(cloudUpdatedAt) > new Date(syncedAt))

      if (cloudIsNewer) {
        if (getDirty(uid)) {
          const cloud = await pullAllFromCloud(uid)
          setConflict({ cloudData: cloud, cloudUpdatedAt })
          setSyncStatus('idle')
          return
        }
        const cloud = await pullAllFromCloud(uid)
        saveLocalData(uid, cloud)
        setSyncedAt(uid, cloudUpdatedAt)
        setData(cloud)
        setLastSyncTime(cloudUpdatedAt)
        flashStatus('synced', 3000)
        return
      }

      const now = await pushAllToCloud(uid, dataRef.current)
      setSyncedAt(uid, now)
      setDirty(uid, false)
      setLastSyncTime(now)
      flashStatus('synced', 3000)
    } catch (err) {
      console.error('Sync failed:', err)
      flashStatus('error', 5000)
    }
  }, [uid, syncStatus, flashStatus])

  const resolveKeepLocal = useCallback(async () => {
    setConflict(null)
    setSyncStatus('syncing')
    try {
      const now = await pushAllToCloud(uid, dataRef.current)
      setSyncedAt(uid, now)
      setDirty(uid, false)
      setLastSyncTime(now)
      flashStatus('synced', 3000)
    } catch (err) {
      console.error('resolveKeepLocal failed:', err)
      flashStatus('error', 5000)
    }
  }, [uid, flashStatus])

  const resolveKeepCloud = useCallback(() => {
    if (!conflict) return
    const { cloudData, cloudUpdatedAt } = conflict
    saveLocalData(uid, cloudData)
    setSyncedAt(uid, cloudUpdatedAt)
    setDirty(uid, false)
    setData(cloudData)
    setLastSyncTime(cloudUpdatedAt)
    setConflict(null)
    flashStatus('synced', 3000)
  }, [uid, conflict, flashStatus])

  const value = {
    collections: data.collections,
    settings: data.settings,
    dataLoaded,
    isOnline,
    syncStatus,
    lastSyncTime,
    saveStatus,
    lastSaveTime,
    conflict,
    sync,
    resolveKeepLocal,
    resolveKeepCloud,
    addItem,
    addManyItems,
    updateItem,
    setItemFull,
    removeItem,
    updateSettings,
  }

  return <LedgerDataCtx.Provider value={value}>{children}</LedgerDataCtx.Provider>
}
