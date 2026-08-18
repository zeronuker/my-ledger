import { Fragment, useEffect, useMemo, useState } from 'react'
import { useExpenseEntries } from './useExpenseEntries'
import { useCategories } from './useCategories'
import { useCategoryGroups } from './useCategoryGroups'
import { DEFAULT_EXPENSE_CATEGORIES } from './categories'
import { monthRange, monthLabel, resolveRange } from './months'

export default function Expenses({ uid }) {
  const { items, loading, setEntry, setPaid } = useExpenseEntries(uid)
  const { items: categories, add: addSubCategory } = useCategories(uid, 'expenseCategories', DEFAULT_EXPENSE_CATEGORIES)
  const { items: categoryGroups, add: addCategoryGroup } = useCategoryGroups(uid)
  const [range, setRange] = useState('6M')

  const { from, to } = resolveRange(range)
  const months = useMemo(() => monthRange(from, to), [from, to])

  const entryByKey = useMemo(() => {
    const map = new Map()
    for (const e of items) map.set(`${e.categoryId}_${e.month}`, e)
    return map
  }, [items])

  // Categories (UTILITIES & FEES, LOANS, ...) → their sub-categories (rows).
  // Explicit categoryGroups docs seed the section even with zero rows yet;
  // sub-categories add themselves under a matching or new section.
  const groups = categoryGroups.map((g) => ({ name: g.name, cats: [] }))
  for (const c of categories) {
    const key = c.group || 'Other'
    let g = groups.find((g) => g.name === key)
    if (!g) { g = { name: key, cats: [] }; groups.push(g) }
    g.cats.push(c)
  }

  const monthTotals = months.map((m) => categories.reduce((s, c) => s + (entryByKey.get(`${c.id}_${m}`)?.amount || 0), 0))
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0)

  return (
    <section>
      <h2 className="section-title">Expenses</h2>

      <div className="range-bar">
        {['3M', '6M', '12M', 'YTD'].map((r) => (
          <button key={r} className={`range-chip${range === r ? ' on' : ''}`} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>

      {loading ? <p className="dim">Loading…</p> : (
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
                    const vals = months.map((m) => entryByKey.get(`${c.id}_${m}`)?.amount || 0)
                    const total = vals.reduce((a, b) => a + b, 0)
                    return (
                      <tr key={c.id}>
                        <td className="grid-row-cat">{c.name}</td>
                        {months.map((m) => {
                          const entry = entryByKey.get(`${c.id}_${m}`)
                          return (
                            <td key={m} className={entry ? (entry.paid ? 'cell-paid' : 'cell-unpaid') : ''}>
                              <EditableCell
                                value={entry?.amount}
                                paid={!!entry?.paid}
                                hasValue={!!entry}
                                onCommit={(amt) => setEntry(c.id, m, amt)}
                                onSetPaid={(isPaid) => setPaid(c.id, m, isPaid)}
                              />
                            </td>
                          )
                        })}
                        <td className="col-total">{total.toFixed(2)}</td>
                        <td className="col-avg">{(total / months.length).toFixed(2)}</td>
                      </tr>
                    )
                  })}
                  <tr className="grid-add-row">
                    <td colSpan={months.length + 3}>
                      <AddRow placeholder="Add sub-category" onAdd={(name) => addSubCategory({ name, group: g.name === 'Other' ? null : g.name })} />
                    </td>
                  </tr>
                </Fragment>
              ))}
              <tr className="grid-add-row grid-add-group-row">
                <td colSpan={months.length + 3}>
                  <AddRow placeholder="Add category" onAdd={(name) => addCategoryGroup({ name })} />
                </td>
              </tr>
              <tr className="grid-total-row">
                <td>Total</td>
                {monthTotals.map((v, i) => <td key={i}>{v.toFixed(2)}</td>)}
                <td className="col-total">{grandTotal.toFixed(2)}</td>
                <td className="col-avg">{(grandTotal / months.length).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function EditableCell({ value, paid, hasValue, onCommit, onSetPaid }) {
  const [text, setText] = useState(value != null ? String(value) : '')

  useEffect(() => {
    setText(value != null ? String(value) : '')
  }, [value])

  function commit() {
    const n = parseFloat(text)
    onCommit(Number.isFinite(n) ? n : 0)
  }

  return (
    <div className="cell-inner">
      <input
        type="text" inputMode="decimal" className="grid-cell-input" placeholder="—"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
      {hasValue && (
        <select
          className={`paid-select ${paid ? 'is-paid' : 'is-unpaid'}`}
          value={paid ? 'paid' : 'unpaid'}
          onChange={(e) => onSetPaid(e.target.value === 'paid')}
        >
          <option value="unpaid" style={{ background: 'var(--cb-surface-2)', color: '#ff9f4a' }}>UNPAID</option>
          <option value="paid" style={{ background: 'var(--cb-surface-2)', color: 'var(--cb-mint)' }}>PAID</option>
        </select>
      )}
    </div>
  )
}

function AddRow({ placeholder, onAdd }) {
  const [name, setName] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim())
    setName('')
  }

  return (
    <form onSubmit={submit} className="grid-add-form">
      <span className="grid-add-plus">+</span>
      <input placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit" className="cb-btn">ADD</button>
    </form>
  )
}
