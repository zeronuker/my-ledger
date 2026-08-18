import { useCollection } from './useCollection'

// Explicit "category" (group) docs — {name, order}. Lets a new category
// exist with zero sub-categories yet, which a group name implicitly derived
// from existing sub-categories' `.group` field can't do on its own.
//
// Same client-side order/name pattern as useCategories — see there for why.
export function useCategoryGroups(uid) {
  const result = useCollection(uid, 'expenseCategoryGroups', 'name')

  const items = [...result.items].sort((a, b) => {
    const diff = (a.order ?? 9999) - (b.order ?? 9999)
    return diff !== 0 ? diff : a.name.localeCompare(b.name)
  })

  function reorder(orderedItems) {
    orderedItems.forEach((item, i) => {
      if (item.order !== i) result.update(item.id, { order: i })
    })
  }

  return { ...result, items, reorder }
}
