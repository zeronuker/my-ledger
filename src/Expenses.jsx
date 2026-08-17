import { Fragment, useMemo, useState } from 'react'
import { useCollection } from './useCollection'
import { useCategories } from './useCategories'
import { DEFAULT_EXPENSE_CATEGORIES } from './categories'

function today() { return new Date().toISOString().slice(0, 10) }
function currentMonth() { return new Date().toISOString().slice(0, 7) }

function addMonths(monthStr, n) {
  const [y, m] = monthStr.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthRange(from, to) {
  const months = []
  let cur = from
  let guard = 0
  while (cur <= to && guard++ < 60) {
    months.push(cur)
    cur = addMonths(cur, 1)
  }
  return months
}
function monthLabel(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short', year: 'numeric' })
}

const EMPTY = { description: '', categoryId: '', amount: '', currency: 'MYR', date: today(), paid: false, recurring: false }

export default function Expenses({ uid }) {
  const { items, loading, add, update, remove } = useCollection(uid, 'expenses')
  const { items: categories } = useCategories(uid, 'expenseCategories', DEFAULT_EXPENSE_CATEGORIES)
  const [view, setView] = useState('grid') // 'grid' | 'list'
  const [form, setForm] = useState(EMPTY)
  const [range, setRange] = useState('6M')
  const thisMonth = currentMonth()
  const from = range === 'YTD' ? `${thisMonth.slice(0, 4)}-01` : addMonths(thisMonth, -(RANGE_MONTHS[range] - 1))
  const months = useMemo(() => monthRange(from, thisMonth), [from, thisMonth])

  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))

  function submit(e) {
    e.preventDefault()
    if (!form.description || !form.amount) return
    add({ ...form, amount: Number(form.amount) })
    setForm({ ...EMPTY, categoryId: form.categoryId })
  }

  return (
    <section>
      <div className="section-head">
        <h2 className="section-title">Expenses</h2>
        <div className="seg">
          <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}>Grid</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
        </div>
      </div>

      <form onSubmit={submit} className="row-form">
        <input placeholder="Description" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">No category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
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

      {loading ? <p className="dim">Loading…</p> : view === 'grid' ? (
        <ExpenseGrid items={items} categories={categories} months={months} range={range} setRange={setRange} />
      ) : (
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
                <td>{catById[it.categoryId]?.name || '—'}</td>
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

const RANGE_MONTHS = { '3M': 3, '6M': 6, '12M': 12 }

function ExpenseGrid({ items, categories, months, range, setRange }) {
  // group -> [categories], preserving first-seen group order; ungrouped last
  const groups = []
  for (const c of categories) {
    const key = c.group || 'Other'
    let g = groups.find((g) => g.name === key)
    if (!g) { g = { name: key, cats: [] }; groups.push(g) }
    g.cats.push(c)
  }

  function sumFor(categoryId, month) {
    return items
      .filter((it) => it.categoryId === categoryId && it.date?.startsWith(month))
      .reduce((s, it) => s + Number(it.amount), 0)
  }

  const monthTotals = months.map((m) => categories.reduce((s, c) => s + sumFor(c.id, m), 0))
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0)

  return (
    <>
      <div className="range-bar">
        {['3M', '6M', '12M', 'YTD'].map((r) => (
          <button key={r} className={`range-chip${range === r ? ' on' : ''}`} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>
      <div className="grid-wrap">
        <table className="grid-table">
          <thead>
            <tr>
              <th>Category</th>
              {months.map((m) => <th key={m}>{monthLabel(m)}</th>)}
              <th className="col-total">Total</th>
              <th className="col-avg">Avg</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.name}>
                <tr className="grid-group-row">
                  <td colSpan={months.length + 3}>{g.name}</td>
                </tr>
                {g.cats.map((c) => {
                  const vals = months.map((m) => sumFor(c.id, m))
                  const total = vals.reduce((a, b) => a + b, 0)
                  return (
                    <tr key={c.id}>
                      <td className="grid-row-cat">{c.name}</td>
                      {vals.map((v, i) => <td key={i}>{v ? v.toFixed(2) : '—'}</td>)}
                      <td className="col-total">{total.toFixed(2)}</td>
                      <td className="col-avg">{(total / months.length).toFixed(2)}</td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
            <tr className="grid-total-row">
              <td>Total</td>
              {monthTotals.map((v, i) => <td key={i}>{v.toFixed(2)}</td>)}
              <td className="col-total">{grandTotal.toFixed(2)}</td>
              <td className="col-avg">{(grandTotal / months.length).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {categories.length === 0 && <p className="dim" style={{ marginTop: 12 }}>No categories yet — add some from Settings → Preferences.</p>}
    </>
  )
}
