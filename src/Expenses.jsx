import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useExpenseEntries } from './useExpenseEntries'
import { useCategories } from './useCategories'
import { useCategoryGroups } from './useCategoryGroups'
import { DEFAULT_EXPENSE_CATEGORIES } from './categories'
import { monthLabel, currentYearToDate, currentMonth } from './months'
import CategoryManagerModal from './CategoryManagerModal.jsx'

// Fixed palette (not the user's single customizable accent — the point here
// is several distinct hues, one per category) cycling if there are more
// categories than colors.
const CATEGORY_COLORS = ['#3FE0C5', '#3B8DFF', '#5B6BFF', '#FFB37C', '#10d983', '#f43f5e']

export default function Expenses({ uid }) {
  const { items, loading, setEntry, setPaid } = useExpenseEntries(uid)
  const categories = useCategories(uid, 'expenseCategories', DEFAULT_EXPENSE_CATEGORIES)
  const categoryGroups = useCategoryGroups(uid)
  const [hiddenMonths, setHiddenMonths] = useState(() => new Set())
  const [managerOpen, setManagerOpen] = useState(false)
  const backfillRan = useRef(false)

  const allMonths = useMemo(() => currentYearToDate(), [])
  const thisMonth = currentMonth()
  const months = allMonths.filter((m) => !hiddenMonths.has(m))

  // One-time backfill: categories created before expenseCategoryGroups
  // existed only had a free-text `.group` string, no real group doc — give
  // each of those a real (and now reorderable) doc. Uses a direct one-shot
  // getDocs read rather than the live hooks' `items`, because Firestore can
  // deliver an empty/incomplete cache snapshot before the authoritative one
  // (bit us once already with Credit Cards' composite-index query) — trusting
  // that transient state here would create duplicate group docs.
  useEffect(() => {
    if (!uid || backfillRan.current) return
    backfillRan.current = true
    ;(async () => {
      const [catsSnap, groupsSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'expenseCategories')),
        getDocs(collection(db, 'users', uid, 'expenseCategoryGroups')),
      ])
      const existingNames = new Set(groupsSnap.docs.map((d) => d.data().name))
      const neededNames = [...new Set(catsSnap.docs.map((d) => d.data().group).filter(Boolean))]
      const missing = neededNames.filter((n) => !existingNames.has(n))
      let order = groupsSnap.size
      for (const name of missing) {
        await addDoc(collection(db, 'users', uid, 'expenseCategoryGroups'), { name, order: order++ })
      }
    })()
  }, [uid])

  const entryByKey = useMemo(() => {
    const map = new Map()
    for (const e of items) map.set(`${e.categoryId}_${e.month}`, e)
    return map
  }, [items])

  // Categories (UTILITIES & FEES, LOANS, ...) → their sub-categories (rows).
  const groups = categoryGroups.items.map((g) => ({ name: g.name, cats: [] }))
  for (const c of categories.items) {
    const key = c.group || 'Other'
    let g = groups.find((g) => g.name === key)
    if (!g) { g = { name: key, cats: [] }; groups.push(g) }
    g.cats.push(c)
  }

  const monthTotals = months.map((m) => categories.items.reduce((s, c) => s + (entryByKey.get(`${c.id}_${m}`)?.amount || 0), 0))
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0)

  function toggleMonth(m) {
    setHiddenMonths((prev) => {
      const next = new Set(prev)
      next.has(m) ? next.delete(m) : next.add(m)
      return next
    })
  }

  return (
    <section>
      <h2 className="section-title">Expenses</h2>

      <div className="month-toggle-bar">
        {allMonths.map((m) => (
          <button
            key={m}
            className={`month-toggle-chip${hiddenMonths.has(m) ? ' is-hidden' : ''}`}
            disabled={m === thisMonth}
            onClick={() => toggleMonth(m)}
            title={m === thisMonth ? 'Current month is always shown' : hiddenMonths.has(m) ? 'Show this month' : 'Hide this month'}
          >
            {monthLabel(m)}
          </button>
        ))}
      </div>

      {loading || categories.loading || categoryGroups.loading ? <p className="dim">Loading…</p> : (
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
              {groups.map((g, gi) => (
                <CategoryGroupRows
                  key={g.name} group={g} color={CATEGORY_COLORS[gi % CATEGORY_COLORS.length]}
                  months={months} entryByKey={entryByKey} setEntry={setEntry} setPaid={setPaid}
                />
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
      )}

      <button className="fab" onClick={() => setManagerOpen(true)} title="Add or arrange categories">+</button>
      {managerOpen && (
        <CategoryManagerModal
          categoryGroups={categoryGroups} categories={categories}
          onClose={() => setManagerOpen(false)}
        />
      )}
    </section>
  )
}

function CategoryGroupRows({ group, color, months, entryByKey, setEntry, setPaid }) {
  const catStyle = { '--cat-color': color }
  return (
    <Fragment>
      <tr className="grid-group-row cat-colored" style={catStyle}>
        <td colSpan={months.length + 3}>{group.name}</td>
      </tr>
      {group.cats.map((c) => {
        const vals = months.map((m) => entryByKey.get(`${c.id}_${m}`)?.amount || 0)
        const total = vals.reduce((a, b) => a + b, 0)
        return (
          <tr key={c.id} style={catStyle}>
            <td className="grid-row-cat"><span className="cat-colored">{c.name}</span></td>
            {months.map((m) => {
              const entry = entryByKey.get(`${c.id}_${m}`)
              return (
                <td key={m}>
                  <EditableCell
                    value={entry?.amount}
                    paid={!!entry?.paid}
                    hasValue={!!entry}
                    onCommit={(amt) => setEntry(c.id, m, amt)}
                    onTogglePaid={() => setPaid(c.id, m, !entry?.paid)}
                  />
                </td>
              )
            })}
            <td className="col-total">{total.toFixed(2)}</td>
            <td className="col-avg">{(total / months.length).toFixed(2)}</td>
          </tr>
        )
      })}
    </Fragment>
  )
}

function EditableCell({ value, paid, hasValue, onCommit, onTogglePaid }) {
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
        type="text" inputMode="decimal" placeholder="—"
        className={`grid-cell-input${hasValue ? (paid ? ' is-paid' : ' is-unpaid') : ''}`}
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
      {hasValue && (
        <input
          type="checkbox" className="paid-checkbox"
          checked={paid}
          onChange={onTogglePaid}
          aria-label={paid ? 'Mark unpaid' : 'Mark paid'}
        />
      )}
    </div>
  )
}
