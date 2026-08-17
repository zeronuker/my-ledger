import { useCollection } from './useCollection'
import { useCategories } from './useCategories'
import { DEFAULT_EXPENSE_CATEGORIES } from './categories'
import { remainingOf } from './payments'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

// Sums differ by currency — never add MYR to USD. Returns "MYR 1,234.00 · USD 45.00".
function sumByCurrency(rows, amountOf = (r) => Number(r.amount)) {
  const totals = {}
  for (const r of rows) totals[r.currency] = (totals[r.currency] || 0) + amountOf(r)
  const parts = Object.entries(totals).map(([cur, amt]) => `${cur} ${amt.toFixed(2)}`)
  return parts.length ? parts.join(' · ') : '—'
}

export default function Dashboard({ uid }) {
  const { items: expenses } = useCollection(uid, 'expenses')
  const { items: income } = useCollection(uid, 'income', 'month')
  const { items: cardTxns } = useCollection(uid, 'cardTransactions')
  const { items: categories } = useCategories(uid, 'expenseCategories', DEFAULT_EXPENSE_CATEGORIES)
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))

  const month = currentMonth()
  const monthExpenses = expenses.filter((e) => e.date?.startsWith(month))
  const monthIncome = income.filter((i) => i.month === month)
  const monthCardTxns = cardTxns.filter((t) => t.date?.startsWith(month))

  const unpaidExpenses = monthExpenses.filter((e) => !e.paid)
  const unpaidCardBalance = cardTxns.filter((t) => remainingOf(t) > 0) // all-time, not just this month

  const byCategory = {}
  for (const e of monthExpenses) {
    const key = catById[e.categoryId]?.name || 'Uncategorized'
    byCategory[key] = (byCategory[key] || 0) + Number(e.amount)
  }
  const maxCategory = Math.max(1, ...Object.values(byCategory))

  return (
    <section>
      <h2 className="section-title">Dashboard — {month}</h2>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="cb-eyebrow">Income this month</div>
          <div className="stat-value">{sumByCurrency(monthIncome)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">Expenses this month</div>
          <div className="stat-value">{sumByCurrency(monthExpenses)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">Unpaid expenses</div>
          <div className="stat-value">{sumByCurrency(unpaidExpenses)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">Unpaid card balance</div>
          <div className="stat-value">{sumByCurrency(unpaidCardBalance, remainingOf)}</div>
        </div>
      </div>

      <h3 className="section-title" style={{ fontSize: 14, marginTop: 32 }}>Spend by category (this month)</h3>
      <div className="category-bars">
        {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
          <div key={cat} className="category-bar-row">
            <span className="category-bar-label">{cat}</span>
            <div className="category-bar-track">
              <div className="category-bar-fill" style={{ width: `${(amt / maxCategory) * 100}%` }} />
            </div>
            <span className="category-bar-amount cb-mono">{amt.toFixed(2)}</span>
          </div>
        ))}
        {Object.keys(byCategory).length === 0 && <p className="dim">No expenses logged this month yet.</p>}
      </div>

      <p className="dim" style={{ marginTop: 24, fontSize: 12 }}>
        Card spend this month: {sumByCurrency(monthCardTxns)}
      </p>
    </section>
  )
}
