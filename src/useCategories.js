import { useEffect, useRef } from 'react'
import { useCollection } from './useCollection'

// Wraps useCollection with a one-time default-seed so category pickers are
// never a dead end on a fresh account. Guarded by a ref so it only fires
// once per mount even though `loading` flips before the seeded docs arrive.
export function useCategories(uid, path, defaults) {
  const result = useCollection(uid, path, 'name')
  const seeded = useRef(false)

  useEffect(() => {
    if (!uid || result.loading || seeded.current || result.items.length > 0) return
    seeded.current = true
    defaults.forEach((d) => result.add(d))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, result.loading, result.items.length])

  return result
}
