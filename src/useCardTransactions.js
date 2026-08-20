import { useLedgerData } from './LedgerDataContext'

// Local reads have no query-plan cost, but keep a generous cap on how far
// back a single card's history renders — a holdover from the old Firestore
// query limit, still a reasonable sanity bound for one card's feed.
const FETCH_LIMIT = 1000

// Scoped to one card (unlike useCollection(uid, 'cardTransactions'), which
// pulls every transaction for every card — fine for Dashboard's all-cards
// totals, too much for a single card's transaction list).
export function useCardTransactions(uid, cardId) {
  const ctx = useLedgerData()
  const map = ctx.collections.cardTransactions || {}

  const items = !cardId ? [] : Object.entries(map)
    .filter(([, d]) => d.cardId === cardId)
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : (a.date || '') > (b.date || '') ? -1 : 0))
    .slice(0, FETCH_LIMIT)

  return {
    items,
    loading: !ctx.dataLoaded,
    add: (itemData) => ctx.addItem('cardTransactions', itemData),
    update: (id, patch) => ctx.updateItem('cardTransactions', id, patch),
    remove: (id) => ctx.removeItem('cardTransactions', id),
  }
}
