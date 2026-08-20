import { useLedgerData } from './LedgerDataContext'

// One doc per category+month (docId = `${categoryId}_${month}`) — the
// Expenses grid is a true budget sheet, not a transaction ledger, so
// there's exactly one number per cell, never a list to sum.
export function useExpenseEntries(uid) {
  const ctx = useLedgerData()
  const map = ctx.collections.expenseEntries || {}
  const items = Object.entries(map).map(([id, d]) => ({ id, ...d }))

  // Blank/zero clears the cell entirely (including paid status) rather
  // than storing a 0 row. Merges onto the existing doc so editing the
  // amount of an already-paid cell doesn't wipe its paid flag.
  function setEntry(categoryId, month, amount) {
    const id = `${categoryId}_${month}`
    if (!amount || Number(amount) === 0) {
      ctx.removeItem('expenseEntries', id)
    } else {
      ctx.updateItem('expenseEntries', id, { categoryId, month, amount: Number(amount) })
    }
  }

  function setPaid(categoryId, month, paid) {
    ctx.updateItem('expenseEntries', `${categoryId}_${month}`, { paid })
  }

  return { items, loading: !ctx.dataLoaded, setEntry, setPaid }
}
