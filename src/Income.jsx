import { useEffect, useRef, useState } from 'react'
import { useCollection } from './useCollection'
import { useLedgerData } from './LedgerDataContext'

function currentMonth() { return new Date().toISOString().slice(0, 7) }
function monthLabel(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })
}
function addMonths(monthStr, n) {
  const [y, m] = monthStr.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const sum = (rows) => rows.reduce((s, r) => s + Number(r.amount || 0), 0)
const netOf = (doc) => sum(doc.earnings || []) - sum(doc.deductions || [])

const EMPTY_DOC = { earnings: [], deductions: [], currency: 'MYR' }

export default function Income({ uid }) {
  const { items, loading } = useCollection(uid, 'income', 'month')
  const ctx = useLedgerData()
  const [month, setMonth] = useState(currentMonth())
  const [draft, setDraft] = useState(EMPTY_DOC)
  const loadedMonth = useRef(null)

  // Load the selected month's doc into an editable draft, but only when the
  // month actually changes — not on every Firestore snapshot — so typing
  // isn't clobbered by our own writes echoing back.
  useEffect(() => {
    if (loading) return
    if (loadedMonth.current === month) return
    const existing = items.find((i) => i.month === month)
    setDraft(existing ? { earnings: existing.earnings || [], deductions: existing.deductions || [], currency: existing.currency || 'MYR' } : EMPTY_DOC)
    loadedMonth.current = month
  }, [month, loading, items])

  function save(next) {
    setDraft(next)
    ctx.setItemFull('income', month, { month, ...next })
  }

  const year = month.slice(0, 4)
  const ytdNet = items
    .filter((i) => i.month.startsWith(year) && i.month <= month)
    .reduce((s, i) => s + netOf(i), 0)

  const gross = sum(draft.earnings)
  const totalDeductions = sum(draft.deductions)
  const net = gross - totalDeductions

  return (
    <section>
      <h2 className="section-title">Income</h2>

      <div className="income-head">
        <div className="seg">
          <button onClick={() => setMonth(addMonths(month, -1))}>&larr;</button>
          <button className="on">{monthLabel(month)}</button>
          <button onClick={() => setMonth(addMonths(month, 1))}>&rarr;</button>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {loading ? <p className="dim">Loading…</p> : (
        <div className="income-stmt">
          <IncomeSection
            label="Earnings" rows={draft.earnings} currency={draft.currency}
            onChange={(rows) => save({ ...draft, earnings: rows })}
          />
          <div className="income-calc"><span className="label">Gross salary</span><span className="amt">{draft.currency} {gross.toFixed(2)}</span></div>

          <IncomeSection
            label="Deductions" rows={draft.deductions} currency={draft.currency}
            onChange={(rows) => save({ ...draft, deductions: rows })}
          />
          <div className="income-calc"><span className="label">Total deductions</span><span className="amt">{draft.currency} {totalDeductions.toFixed(2)}</span></div>

          <div className="income-calc net"><span className="label">Net salary</span><span className="amt">{draft.currency} {net.toFixed(2)}</span></div>
          <div className="income-ytd">YTD net (Jan&ndash;{monthLabel(month).split(' ')[0]}): {draft.currency} {ytdNet.toFixed(2)}</div>
        </div>
      )}
    </section>
  )
}

function IncomeSection({ label, rows, currency, onChange }) {
  const [newLabel, setNewLabel] = useState('')

  function updateRow(i, patch) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function removeRow(i) {
    onChange(rows.filter((_, idx) => idx !== i))
  }
  function addRow(e) {
    e.preventDefault()
    if (!newLabel.trim()) return
    onChange([...rows, { label: newLabel.trim(), amount: 0 }])
    setNewLabel('')
  }

  return (
    <>
      <div className="income-section-label">{label}</div>
      {rows.map((r, i) => (
        <div key={i} className="income-row">
          <input value={r.label} onChange={(e) => updateRow(i, { label: e.target.value })}
            style={{ flex: 1, marginRight: 8 }} />
          <span className="cb-mono" style={{ marginRight: 4 }}>{currency}</span>
          <input type="number" step="0.01" value={r.amount}
            onChange={(e) => updateRow(i, { amount: Number(e.target.value) })}
            style={{ width: 110, textAlign: 'right' }} />
          <button className="cb-btn cb-btn--danger" onClick={() => removeRow(i)}>×</button>
        </div>
      ))}
      <form onSubmit={addRow} className="income-row add-row" style={{ display: 'flex', gap: 8 }}>
        <input placeholder={`Add ${label.toLowerCase()} row`} value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" className="cb-btn">ADD</button>
      </form>
    </>
  )
}
