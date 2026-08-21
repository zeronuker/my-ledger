import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useExpenseEntries } from './useExpenseEntries'
import { useCategories } from './useCategories'
import { useCategoryGroups } from './useCategoryGroups'
import { useLedgerData } from './LedgerDataContext'
import { DEFAULT_EXPENSE_CATEGORIES } from './categories'
import { monthLabel, monthNameFull, monthRange, currentMonth, addMonths } from './months'
import CategoryManagerModal from './CategoryManagerModal.jsx'
import FitText from './FitText.jsx'

// Fixed palette (not the user's single customizable accent — the point here
// is several distinct hues, one per category) cycling if there are more
// categories than colors.
const CATEGORY_COLORS = ['#3FE0C5', '#FFB37C', '#3B8DFF', '#10d983', '#5B6BFF', '#f43f5e']

function formatMYR(n) {
  return `RM ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Expenses({ uid, layout = 'grid' }) {
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
  const [viewMonth, setViewMonth] = useState(thisMonth)
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

  function stepViewMonth(delta) {
    const next = addMonths(viewMonth, delta)
    setViewMonth(next)
    const nextYear = next.slice(0, 4)
    if (nextYear !== selectedYear) setSelectedYear(nextYear)
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

      {loading || categories.loading || categoryGroups.loading ? <p className="dim">Loading…</p> : layout === 'month' ? (
        <MonthLayout
          viewMonth={viewMonth} thisMonth={thisMonth} onStep={stepViewMonth}
          groups={groups} entryByKey={entryByKey} setEntry={setEntry} setPaid={setPaid}
        />
      ) : (
        <GridLayout
          allMonths={allMonths} thisMonth={thisMonth} isCurrentYear={isCurrentYear} hiddenSet={hiddenSet} toggleMonth={toggleMonth}
          groups={groups} entryByKey={entryByKey} setEntry={setEntry} setPaid={setPaid}
          monthTotals={monthTotals} grandTotal={grandTotal}
        />
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

// ════════════════════════════════════════════════════════════════════
//  LAYOUT A — GRID (default)
// ════════════════════════════════════════════════════════════════════
function GridLayout({ allMonths, thisMonth, isCurrentYear, hiddenSet, toggleMonth, groups, entryByKey, setEntry, setPaid, monthTotals, grandTotal }) {
  return (
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
                  <span className="month-header-badge">{monthNameFull(m)}</span>
                </th>
              )
            })}
            <th className="col-total"><span className="month-header-badge">Total</span></th>
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
            <td className="grid-row-cat"><FitText text={c.name} className="cat-colored" /></td>
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

// ════════════════════════════════════════════════════════════════════
//  LAYOUT B — MONTH — one month at a time, stat tiles plus category
//  totals. Mirrors Income's Card/Dashboard layouts (income-stmt/income-head/
//  seg/stat-grid), applied to Expenses' own group → category data.
// ════════════════════════════════════════════════════════════════════
function MonthLayout({ viewMonth, thisMonth, onStep, groups, entryByKey, setEntry, setPaid }) {
  let total = 0, paidTotal = 0, unpaidTotal = 0
  groups.forEach((g) => g.cats.forEach((c) => {
    const entry = entryByKey.get(`${c.id}_${viewMonth}`)
    if (!entry) return
    total += entry.amount
    if (entry.paid) paidTotal += entry.amount
    else unpaidTotal += entry.amount
  }))

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="income-head">
        <div className="seg">
          <button onClick={() => onStep(-1)}>&larr;</button>
          <button className="on">{monthLabel(viewMonth)}{viewMonth === thisMonth ? ' · current' : ''}</button>
          <button onClick={() => onStep(1)}>&rarr;</button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-tile"><div className="cb-eyebrow">Total this month</div><div className="stat-value">{formatMYR(total)}</div></div>
        <div className="stat-tile" style={{ borderColor: 'var(--cb-mint)' }}><div className="cb-eyebrow">Paid</div><div className="stat-value" style={{ color: 'var(--cb-mint)' }}>{formatMYR(paidTotal)}</div></div>
        <div className="stat-tile" style={{ borderColor: '#ff9f4a' }}><div className="cb-eyebrow">Unpaid</div><div className="stat-value" style={{ color: '#ff9f4a' }}>{formatMYR(unpaidTotal)}</div></div>
      </div>

      <div className="income-stmt">
        {groups.map((g, gi) => (
          <MonthGroup
            key={g.name} group={g} color={CATEGORY_COLORS[gi % CATEGORY_COLORS.length]}
            viewMonth={viewMonth} entryByKey={entryByKey} setEntry={setEntry} setPaid={setPaid}
          />
        ))}
        {groups.length === 0 && <p className="dim" style={{ padding: 16, margin: 0 }}>No categories yet — add one from the + button.</p>}
        <div className="income-calc net"><span className="label">Total — {monthLabel(viewMonth)}</span><span className="amt">{formatMYR(total)}</span></div>
      </div>
    </div>
  )
}

function MonthGroup({ group, color, viewMonth, entryByKey, setEntry, setPaid }) {
  const groupTotal = group.cats.reduce((s, c) => s + (entryByKey.get(`${c.id}_${viewMonth}`)?.amount || 0), 0)
  return (
    <div>
      <div className="expl-group-head cat-colored" style={{ '--cat-color': color }}>
        <span className="group-name-badge">{group.name}</span>
        <span className="expl-group-total">{formatMYR(groupTotal)}</span>
      </div>
      {group.cats.map((c) => {
        const entry = entryByKey.get(`${c.id}_${viewMonth}`)
        return (
          <div key={c.id} className="income-line">
            <span className="lbl">{c.name}</span>
            <EditableCell
              value={entry?.amount}
              paid={!!entry?.paid}
              hasValue={!!entry}
              onCommit={(amt) => setEntry(c.id, viewMonth, amt)}
              onTogglePaid={() => setPaid(c.id, viewMonth, !entry?.paid)}
            />
          </div>
        )
      })}
    </div>
  )
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
