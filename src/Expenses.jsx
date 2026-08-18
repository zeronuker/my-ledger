import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useExpenseEntries } from './useExpenseEntries'
import { useCategories } from './useCategories'
import { useCategoryGroups } from './useCategoryGroups'
import { DEFAULT_EXPENSE_CATEGORIES } from './categories'
import { monthLabel, monthRange, currentMonth } from './months'
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

  const thisMonth = currentMonth()
  const thisYear = thisMonth.slice(0, 4)
  const [selectedYear, setSelectedYear] = useState(thisYear)
  const isCurrentYear = selectedYear === thisYear
  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => String(Number(thisYear) + i)), [thisYear])

  const allMonths = useMemo(() => monthRange(`${selectedYear}-01`, `${selectedYear}-12`), [selectedYear])
  const hiddenSet = isCurrentYear ? hiddenMonths : new Set()

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

  const monthTotals = allMonths.map((m) => categories.items.reduce((s, c) => s + (entryByKey.get(`${c.id}_${m}`)?.amount || 0), 0))
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

      <div className="year-bar">
        <label htmlFor="expense-year">Year</label>
        <select id="expense-year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading || categories.loading || categoryGroups.loading ? <p className="dim">Loading…</p> : (
        <div className="grid-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Category</th>
                {allMonths.map((m) => {
                  if (hiddenSet.has(m)) {
                    return (
                      <th key={m} className="th-stub" onClick={() => toggleMonth(m)} title="Hidden — click to reveal">
                        <span className="th-stub-label">{monthLabel(m).split(' ')[0].toUpperCase()}</span>
                      </th>
                    )
                  }
                  const hideable = isCurrentYear && m < thisMonth
                  return (
                    <th
                      key={m}
                      className={`${m === thisMonth ? 'th-current' : ''}${hideable ? ' th-hideable' : ''}`}
                      onClick={hideable ? () => toggleMonth(m) : undefined}
                      title={hideable ? 'Hide this month' : undefined}
                    >
                      {monthLabel(m)}
                    </th>
                  )
                })}
                <th className="col-total">Total</th>
                <th className="col-avg">Avg</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, gi) => (
                <CategoryGroupRows
                  key={g.name} group={g} color={CATEGORY_COLORS[gi % CATEGORY_COLORS.length]}
                  months={allMonths} hiddenSet={hiddenSet} entryByKey={entryByKey} setEntry={setEntry} setPaid={setPaid}
                />
              ))}
              <tr className="grid-total-row">
                <td>Total</td>
                {allMonths.map((m, i) => (
                  hiddenSet.has(m) ? <td key={m} className="td-stub" /> : <td key={m}>{monthTotals[i].toFixed(2)}</td>
                ))}
                <td className="col-total">{grandTotal.toFixed(2)}</td>
                <td className="col-avg">{(grandTotal / allMonths.length).toFixed(2)}</td>
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

function CategoryGroupRows({ group, color, months, hiddenSet, entryByKey, setEntry, setPaid }) {
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
              if (hiddenSet.has(m)) return <td key={m} className="td-stub" />
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
