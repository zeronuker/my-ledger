import { paidAmountOf, remainingOf, statusOf } from './payments'

export { paidAmountOf, remainingOf, statusOf }

// Attaches a running balance to each transaction, accumulated in
// chronological (date-ascending) order regardless of the array's own sort —
// matches the source sheet's "Run Balance" column: a cumulative unpaid
// total across the card's whole history, never reset per month.
export function withRunningBalance(items) {
  const sorted = [...items].sort((a, b) => (a.date || '') < (b.date || '') ? -1 : (a.date || '') > (b.date || '') ? 1 : 0)
  let running = 0
  const runningById = new Map()
  for (const t of sorted) {
    running += remainingOf(t)
    runningById.set(t.id, Math.round(running * 100) / 100)
  }
  return items.map((t) => ({ ...t, runningBalance: runningById.get(t.id) }))
}

// Spend/paid totals + per-category breakdown for one card's transactions in
// a given "YYYY-MM" month, for the Feed layout's stat strip.
export function computeMonthStats(items, month) {
  const monthItems = items.filter((t) => t.date?.slice(0, 7) === month)
  const spent = monthItems.reduce((s, t) => s + Number(t.amount || 0), 0)
  const paid = monthItems.reduce((s, t) => s + paidAmountOf(t), 0)

  const byCategory = new Map()
  for (const t of monthItems) {
    const key = t.categoryId || ''
    byCategory.set(key, (byCategory.get(key) || 0) + Number(t.amount || 0))
  }
  const categories = [...byCategory.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount)

  return { spent, paid, categories, count: monthItems.length }
}

export function groupByMonth(items) {
  const map = new Map()
  for (const t of items) {
    const m = t.date?.slice(0, 7) || 'Unknown'
    if (!map.has(m)) map.set(m, [])
    map.get(m).push(t)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}
