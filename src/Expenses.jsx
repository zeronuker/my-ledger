import { useState } from 'react'
import { useCollection } from './useCollection'

const EMPTY = { description: '', category: '', amount: '', currency: 'MYR', date: today(), paid: false, recurring: false }

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function Expenses({ uid }) {
  const { items, loading, add, update, remove } = useCollection(uid, 'expenses')
  const [form, setForm] = useState(EMPTY)

  function submit(e) {
    e.preventDefault()
    if (!form.description || !form.amount) return
    add({ ...form, amount: Number(form.amount) })
    setForm(EMPTY)
  }

  return (
    <section>
      <h2 className="section-title">Expenses</h2>

      <form onSubmit={submit} className="row-form">
        <input placeholder="Description" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <input placeholder="Category" value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input type="number" step="0.01" placeholder="Amount" value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input placeholder="Currency" value={form.currency} style={{ width: 64 }}
          onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
        <input type="date" value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <label className="check-label">
          <input type="checkbox" checked={form.recurring}
            onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
          Recurring
        </label>
        <button type="submit" className="cb-btn cb-btn--primary">ADD</button>
      </form>

      {loading ? <p className="dim">Loading…</p> : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Paid</th><th>Date</th><th>Description</th><th>Category</th>
              <th>Amount</th><th>Recurring</th><th />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className={it.paid ? 'row-paid' : ''}>
                <td>
                  <input type="checkbox" checked={!!it.paid}
                    onChange={(e) => update(it.id, { paid: e.target.checked })} />
                </td>
                <td>{it.date}</td>
                <td>{it.description}</td>
                <td>{it.category}</td>
                <td className="cb-mono">{it.currency} {Number(it.amount).toFixed(2)}</td>
                <td>{it.recurring ? '↻' : ''}</td>
                <td><button className="cb-btn cb-btn--danger" onClick={() => remove(it.id)}>×</button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="dim">No expenses yet.</td></tr>}
          </tbody>
        </table>
      )}
    </section>
  )
}
