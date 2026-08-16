import { useState } from 'react'
import { useCollection } from './useCollection'

function currentMonth() {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

const EMPTY = { month: currentMonth(), component: '', amount: '', currency: 'MYR' }

export default function Income({ uid }) {
  const { items, loading, add, remove } = useCollection(uid, 'income', 'month')
  const [form, setForm] = useState(EMPTY)

  function submit(e) {
    e.preventDefault()
    if (!form.component || !form.amount) return
    add({ ...form, amount: Number(form.amount) })
    setForm({ ...EMPTY, month: form.month })
  }

  return (
    <section>
      <h2 className="section-title">Income</h2>

      <form onSubmit={submit} className="row-form">
        <input type="month" value={form.month}
          onChange={(e) => setForm({ ...form, month: e.target.value })} />
        <input placeholder="Component (e.g. Salary, Bonus)" value={form.component}
          onChange={(e) => setForm({ ...form, component: e.target.value })} required />
        <input type="number" step="0.01" placeholder="Amount" value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input placeholder="Currency" value={form.currency} style={{ width: 64 }}
          onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
        <button type="submit" className="cb-btn cb-btn--primary">ADD</button>
      </form>

      {loading ? <p className="dim">Loading…</p> : (
        <table className="ledger-table">
          <thead>
            <tr><th>Month</th><th>Component</th><th>Amount</th><th /></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.month}</td>
                <td>{it.component}</td>
                <td className="cb-mono">{it.currency} {Number(it.amount).toFixed(2)}</td>
                <td><button className="cb-btn cb-btn--danger" onClick={() => remove(it.id)}>×</button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="dim">No income entries yet.</td></tr>}
          </tbody>
        </table>
      )}
    </section>
  )
}
