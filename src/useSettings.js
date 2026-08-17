import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { DEFAULT_SETTINGS } from './theme'

// Single settings doc at users/{uid}/settings/appearance, merged over
// DEFAULT_SETTINGS so new setting keys added later don't need a migration.
export function useSettings(uid) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  useEffect(() => {
    if (!uid) return
    const ref = doc(db, 'users', uid, 'settings', 'appearance')
    return onSnapshot(ref, (snap) => {
      setSettings({ ...DEFAULT_SETTINGS, ...(snap.data() || {}) })
    })
  }, [uid])

  const update = (patch) => {
    setSettings((s) => ({ ...s, ...patch })) // optimistic — onSnapshot reconciles
    setDoc(doc(db, 'users', uid, 'settings', 'appearance'), patch, { merge: true })
  }

  return { settings, update }
}
