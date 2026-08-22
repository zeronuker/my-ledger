// Every top-level `users/{uid}/{name}` collection the app reads/writes.
// Single source of truth for the local-first snapshot shape and for what
// a full cloud push/pull/wipe touches — see localStore.js and cloudSync.js.
export const COLLECTION_NAMES = [
  'expenseEntries',
  'expenseCategories',
  'expenseCategoryGroups',
  'cardCategories',
  'cards',
  'cardTransactions',
  'income',
  'investments',
]
