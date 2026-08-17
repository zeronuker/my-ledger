// Shared math for card transactions tracked via a payments[] history log
// instead of a boolean paid flag — used by CreditCards.jsx and Dashboard.jsx
// so "how much is still owed" is computed the same way everywhere.
export function paidAmountOf(txn) {
  return (txn.payments || []).reduce((s, p) => s + Number(p.amount), 0)
}
export function remainingOf(txn) {
  return Math.max(0, Number(txn.amount) - paidAmountOf(txn))
}
export function statusOf(txn) {
  const paid = paidAmountOf(txn)
  if (paid >= Number(txn.amount)) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}
