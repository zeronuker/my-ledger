import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useExpenseEntries } from './useExpenseEntries'
import { useCategories } from './useCategories'
import { useCategoryGroups } from './useCategoryGroups'
import { useLedgerData } from './LedgerDataContext'
import { DEFAULT_EXPENSE_CATEGORIES } from './categories'
import { monthLabel, monthNameFull, monthRange, currentMonth } from './months'
import CategoryManagerModal from './CategoryManagerModal.jsx'

// Fixed palette (not the user's single customizable accent — the point here
// is several distinct hues, one per category) cycling if there are more
// categories than colors.
const CATEGORY_COLORS = ['#3FE0C5', '#FFB37C', '#3B8DFF', '#10d983', '#5B6BFF', '#f43f5e']

function formatMYR(n) {
  return `RM ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Expenses({ uid }) {
  const { items, loading, setEntry, setPaid } = useExpenseEntries(uid)
  const categories = useCategories(uid, 'expenseCategories', DEFAULT_EXPENSE_CATEGORIES)
  const categoryGroups = useCategoryGroups(uid)
  const ctx = useLedgerData()
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
  // each of those a real (and now reorderable) doc. Reads straight from the
  // local-first store (already the authoritative loaded snapshot once
  // ctx.dataLoaded flips), so unlike the old Firestore-only version there's
  // no cache-then-server race to dodge.
  useEffect(() => {
    if (!uid || !ctx.dataLoaded || backfillRan.current) return
    backfillRan.current = true
    const existingNames = new Set(categoryGroups.items.map((g) => g.name))
    const neededNames = [...new Set(categories.items.map((c) => c.group).filter(Boolean))]
    const missing = neededNames.filter((n) => !existingNames.has(n))
    let order = categoryGroups.items.length
    missing.forEach((name) => categoryGroups.add({ name, order: order++ }))
  }, [uid, ctx.dataLoaded, categories.items, categoryGroups.items, categoryGroups])

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
      <div className="year-bar">
        <div className="year-select-wrap">
          <select
            id="expense-year" className="year-select" aria-label="Year"
            value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading || categories.loading || categoryGroups.loading ? <p className="dim">Loading…</p> : (
        <div className="grid-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th></th>
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
                      className={`${m === thisMonth ? 'th-current col-current' : ''}${hideable ? ' th-hideable' : ''}`}
                      onClick={hideable ? () => toggleMonth(m) : undefined}
                      title={hideable ? 'Hide this month' : undefined}
                    >
                      {monthNameFull(m)}
                    </th>
                  )
                })}
                <th className="col-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, gi) => (
                <CategoryGroupRows
                  key={g.name} group={g} color={CATEGORY_COLORS[gi % CATEGORY_COLORS.length]}
                  months={allMonths} thisMonth={thisMonth} hiddenSet={hiddenSet} entryByKey={entryByKey} setEntry={setEntry} setPaid={setPaid}
                />
              ))}
              <tr className="grid-total-row">
                <td>Total</td>
                {allMonths.map((m, i) => (
                  hiddenSet.has(m) ? <td key={m} className="td-stub" /> : <td key={m} className={m === thisMonth ? 'col-current' : ''}>{formatMYR(monthTotals[i])}</td>
                ))}
                <td className="col-total">{formatMYR(grandTotal)}</td>
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

function CategoryGroupRows({ group, color, months, thisMonth, hiddenSet, entryByKey, setEntry, setPaid }) {
  const catStyle = { '--cat-color': color }
  return (
    <Fragment>
      <tr className="grid-group-row cat-colored" style={catStyle}>
        <td><span className="group-name-badge">{group.name}</span></td>
        <td colSpan={months.length + 1}></td>
      </tr>
      {group.cats.map((c, ci) => {
        const vals = months.map((m) => entryByKey.get(`${c.id}_${m}`)?.amount || 0)
        const total = vals.reduce((a, b) => a + b, 0)
        return (
          <tr key={c.id} style={catStyle} className={ci % 2 === 0 ? 'row-even' : 'row-odd'}>
            <td className="grid-row-cat"><FitCategoryName name={c.name} /></td>
            {months.map((m) => {
              if (hiddenSet.has(m)) return <td key={m} className="td-stub" />
              const entry = entryByKey.get(`${c.id}_${m}`)
              return (
                <td key={m} className={m === thisMonth ? 'col-current' : ''}>
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
            <td className="col-total">{formatMYR(total)}</td>
          </tr>
        )
      })}
    </Fragment>
  )
}

// Shrinks font-size until the (now-wrappable) name fits the row's fixed
// height instead of clipping — CSS caps the box at 25px so there's never a
// layout flash before this corrects it.
function FitCategoryName({ name }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let size = 11.5
    el.style.fontSize = `${size}px`
    while (el.scrollHeight > el.clientHeight && size > 7) {
      size -= 0.5
      el.style.fontSize = `${size}px`
    }
  }, [name])

  return <span ref={ref} className="cat-colored">{name}</span>
}

function EditableCell({ value, paid, hasValue, onCommit, onTogglePaid }) {
  const [text, setText] = useState(value != null ? String(value) : '')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(value != null ? String(value) : '')
  }, [value, focused])

  function commit() {
    const n = parseFloat(text)
    onCommit(Number.isFinite(n) ? n : 0)
    setFocused(false)
  }

  // Raw digits while editing (easy to type); formatted RM display once blurred.
  const display = focused || !hasValue ? text : formatMYR(value)

  return (
    <div className="cell-inner">
      <input
        type="text" inputMode="decimal" placeholder="—"
        className={`grid-cell-input${hasValue ? (paid ? ' is-paid' : ' is-unpaid') : ''}`}
        value={display}
        onFocus={() => { setFocused(true); setText(value != null ? String(value) : '') }}
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
