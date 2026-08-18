import { useEffect, useRef } from 'react'
import { useCollection } from './useCollection'

// Wraps useCollection with a one-time default-seed so category pickers are
// never a dead end on a fresh account. Guarded by a ref so it only fires
// once per mount even though `loading` flips before the seeded docs arrive.
//
// Firestore keeps ordering by 'name' (a field every doc always has, so
// orderBy never silently drops a doc missing it) — the user-arranged
// order lives in a separate `order` field and is applied client-side,
// falling back to name for anything not yet touched by the arrange UI.
export function useCategories(uid, path, defaults) {
  const result = useCollection(uid, path, 'name')
  const seeded = useRef(false)

  useEffect(() => {
    if (!uid || result.loading || seeded.current || result.items.length > 0) return
    seeded.current = true
    defaults.forEach((d, i) => result.add({ ...d, order: i }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, result.loading, result.items.length])

  const items = [...result.items].sort((a, b) => {
    const diff = (a.order ?? 9999) - (b.order ?? 9999)
    return diff !== 0 ? diff : a.name.localeCompare(b.name)
  })

  // Persists a full reordering — renumbers every item in `orderedItems` to
  // 0..N-1, so a single arrange action is unambiguous regardless of what
  // order values (or lack of them) existed before.
  function reorder(orderedItems) {
    orderedItems.forEach((item, i) => {
      if (item.order !== i) result.update(item.id, { order: i })
    })
  }

  return { ...result, items, reorder }
}
