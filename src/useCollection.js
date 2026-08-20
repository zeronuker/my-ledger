import { useLedgerData } from './LedgerDataContext'

// Reads one `users/{uid}/<name>` collection out of the local-first store and
// gives back the same { items, loading, add, update, remove } shape the app
// always had — only the source changed (local snapshot, not onSnapshot).
export function useCollection(uid, name, orderField = 'date') {
  const ctx = useLedgerData()
  const map = ctx.collections[name] || {}

  const items = Object.entries(map)
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => {
      const av = a[orderField]
      const bv = b[orderField]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return av < bv ? 1 : av > bv ? -1 : 0 // descending, matches the old orderBy(..., 'desc')
    })

  return {
    items,
    loading: !ctx.dataLoaded,
    add: (itemData) => ctx.addItem(name, itemData),
    update: (id, patch) => ctx.updateItem(name, id, patch),
    remove: (id) => ctx.removeItem(name, id),
  }
}
