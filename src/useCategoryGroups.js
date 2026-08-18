import { useCollection } from './useCollection'

// Explicit "category" (group) docs — {name} only. Lets a new category exist
// with zero sub-categories yet, which a group name implicitly derived from
// existing sub-categories' `.group` field can't do on its own.
export function useCategoryGroups(uid) {
  return useCollection(uid, 'expenseCategoryGroups', 'name')
}
