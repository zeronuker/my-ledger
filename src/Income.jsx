import { useEffect, useMemo, useState } from 'react'
import { useCollection } from './useCollection'
import { useLedgerData } from './LedgerDataContext'
import { monthNameFull, monthLabel, monthRange, currentMonth, addMonths } from './months'
import { computeYear, computeYtd, emptyMonthInput } from './incomeCalc'
import FitText from './FitText.jsx'

function formatMYR(n) {
  return `RM ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatPlain(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const NIGHTSTOP_FIELDS = [
  { key: 'nightstopDom', label: 'Dom (RM50)' },
  { key: 'nightstopIntl1', label: 'Intl1 (RM120)' },
  { key: 'nightstopIntl2', label: 'Intl2 (RM180)' },
  { key: 'nightstopIntl3', label: 'Intl3 (RM250)' },
]

export default function Income({ uid, layout = 'grid' }) {
  const { items, loading } = useCollection(uid, 'income', 'month')
  const ctx = useLedgerData()

  const thisMonth = currentMonth()
  const thisYear = thisMonth.slice(0, 4)
  const [selectedYear, setSelectedYear] = useState(thisYear)
  const [viewMonth, setViewMonth] = useState(thisMonth)
  const [hiddenMonths, setHiddenMonths] = useState(() => new Set())
  const isCurrentYear = selectedYear === thisYear
  const hiddenSet = isCurrentYear ? hiddenMonths : new Set()
  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => String(Number(thisYear) + i)), [thisYear])
  const allMonths = useMemo(() => monthRange(`${selectedYear}-01`, `${selectedYear}-12`), [selectedYear])

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

  const docByMonth = useMemo(() => {
    const map = new Map()
    for (const it of items) map.set(it.month, it)
    return map
  }, [items])

  const inputs = allMonths.map((m) => {
    const doc = docByMonth.get(m)
    if (!doc) return emptyMonthInput(m)
    return {
      month: m, hours: doc.hours || 0, sectors: doc.sectors || 0,
      nightstopDom: doc.nightstopDom || 0, nightstopIntl1: doc.nightstopIntl1 || 0,
      nightstopIntl2: doc.nightstopIntl2 || 0, nightstopIntl3: doc.nightstopIntl3 || 0,
      bonus: doc.bonus || 0, adjustment: doc.adjustment || 0,
    }
  })

  const results = useMemo(() => computeYear(inputs), [JSON.stringify(inputs)])
  const ytd = useMemo(() => computeYtd(results), [results])

  const byMonth = useMemo(() => {
    const map = new Map()
    results.forEach((r) => map.set(r.month, r))
    return map
  }, [results])
  const inputByMonth = useMemo(() => {
    const map = new Map()
    inputs.forEach((i) => map.set(i.month, i))
    return map
  }, [JSON.stringify(inputs)])
  const ytdByMonth = useMemo(() => {
    const map = new Map()
    ytd.forEach((r) => map.set(r.month, r))
    return map
  }, [ytd])

  // A plain shallow merge keyed by month — safe even when several fields on
  // the same month are edited back-to-back (e.g. tabbing through the 4
  // nightstop counts), unlike a read-current-then-full-replace approach
  // which can lose an edit if it reads a stale snapshot mid-burst.
  function updateMonth(m, patch) {
    ctx.updateItem('income', m, { ...patch, month: m })
  }

  return (
    <section>
      <div className="year-bar">
        <div className="year-select-wrap">
          <select
            id="income-year" className="year-select" aria-label="Year"
            value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <p className="dim">Loading…</p> : (
        <>
          {layout === 'card' && (
            <CardLayout
              viewMonth={viewMonth} thisMonth={thisMonth} onStep={stepViewMonth}
              result={byMonth.get(viewMonth)} input={inputByMonth.get(viewMonth)} ytdRow={ytdByMonth.get(viewMonth)}
              updateMonth={updateMonth}
            />
          )}
          {layout === 'dashboard' && (
            <DashboardLayout
              viewMonth={viewMonth} thisMonth={thisMonth} onStep={stepViewMonth}
              allMonths={allMonths} results={results}
              result={byMonth.get(viewMonth)} input={inputByMonth.get(viewMonth)} ytdRow={ytdByMonth.get(viewMonth)}
              updateMonth={updateMonth}
            />
          )}
          {layout === 'timeline' && (
            <TimelineLayout
              allMonths={allMonths} thisMonth={thisMonth} byMonth={byMonth} inputByMonth={inputByMonth}
              updateMonth={updateMonth}
            />
          )}
          {(!layout || layout === 'grid') && (
            <GridLayout
              allMonths={allMonths} thisMonth={thisMonth} isCurrentYear={isCurrentYear} hiddenSet={hiddenSet} toggleMonth={toggleMonth}
              byMonth={byMonth} inputByMonth={inputByMonth} ytd={ytd} updateMonth={updateMonth}
            />
          )}
        </>
      )}
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════
//  LAYOUT A — GRID (default) — mirrors Expenses' grid behaviour exactly:
//  striped sub-rows (reset per section), hideable past months, and
//  wrap-then-shrink row labels.
// ════════════════════════════════════════════════════════════════════
const GRID_ROWS = [
  { type: 'group', label: 'Monthly Inputs', color: '#FFB37C' },
  { type: 'input', label: 'Flight Hours', field: 'hours', decimals: 2 },
  { type: 'input', label: 'Sectors Flown', field: 'sectors', decimals: 0 },
  { type: 'input', label: 'Nightstop Dom (RM50)', field: 'nightstopDom', decimals: 0 },
  { type: 'input', label: 'Nightstop Intl1 (RM120)', field: 'nightstopIntl1', decimals: 0 },
  { type: 'input', label: 'Nightstop Intl2 (RM180)', field: 'nightstopIntl2', decimals: 0 },
  { type: 'input', label: 'Nightstop Intl3 (RM250)', field: 'nightstopIntl3', decimals: 0 },
  { type: 'input', label: 'Bonus / Renumeration', field: 'bonus', decimals: 2, money: true },

  { type: 'group', label: 'Earnings', color: 'var(--cb-mint)' },
  { type: 'calc', label: 'Basic Salary', field: 'basic' },
  { type: 'calc', label: 'Meal + Nightstop Allowance', field: 'productivityAllowance' },
  { type: 'calc', label: 'Performance Allowance', field: 'performanceAllowance' },
  { type: 'subtotal', label: 'Gross Salary', field: 'gross' },

  { type: 'group', label: 'Employee Deductions', color: '#f43f5e' },
  { type: 'calc', label: 'EPF (11%)', field: 'epfEmployee', deduction: true },
  { type: 'calc', label: 'SOCSO', field: 'socsoEmployee', deduction: true },
  { type: 'calc', label: 'SKBBK', field: 'skbbk', deduction: true, blankIfZero: true },
  { type: 'calc', label: 'EIS', field: 'eisEmployee', deduction: true },
  { type: 'calc', label: 'PCB (income tax)', field: 'pcb', deduction: true },
  { type: 'calc', label: 'Zakat Pendapatan', field: 'zakat', deduction: true },
  { type: 'input', label: 'Adjustment', field: 'adjustment', decimals: 2, money: true, optional: true },
  { type: 'total', label: 'Net Salary', field: 'net' },

  { type: 'group', label: 'Employer Contributions', color: 'var(--cb-blue)' },
  { type: 'calc', label: 'Employer EPF (12%)', field: 'epfEmployer' },
  { type: 'calc', label: 'Employer SOCSO', field: 'socsoEmployer' },
  { type: 'calc', label: 'Employer EIS', field: 'eisEmployer' },

  { type: 'group', label: 'Year-to-Date', color: 'var(--cb-ink-dim)' },
  { type: 'ytd', label: 'YTD Basic', field: 'basic' },
  { type: 'ytd', label: 'YTD Gross', field: 'gross' },
  { type: 'ytd', label: 'YTD Employee EPF', field: 'epfEmployee' },
  { type: 'ytd', label: 'YTD Employer EPF', field: 'epfEmployer' },
  { type: 'ytd', label: 'YTD Employee SOCSO', field: 'socsoEmployee' },
  { type: 'ytd', label: 'YTD Employer SOCSO', field: 'socsoEmployer' },
  { type: 'ytd', label: 'YTD Employee EIS', field: 'eisEmployee' },
  { type: 'ytd', label: 'YTD Employer EIS', field: 'eisEmployer' },
  { type: 'ytd', label: 'YTD Income Tax PCB', field: 'pcb' },
  { type: 'ytd', label: 'YTD Net', field: 'net', bold: true },
]

function GridLayout({ allMonths, thisMonth, isCurrentYear, hiddenSet, toggleMonth, byMonth, inputByMonth, ytd, updateMonth }) {
  let stripeIdx = 0
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
          </tr>
        </thead>
        <tbody>
          {GRID_ROWS.map((row, i) => {
            if (row.type === 'group') {
              stripeIdx = 0
              return <GroupRow key={i} label={row.label} color={row.color} span={allMonths.length + 1} />
            }
            const striped = stripeIdx++ % 2 === 0 ? 'row-even' : 'row-odd'
            return (
              <DataRow
                key={i} row={row} striped={striped} months={allMonths} thisMonth={thisMonth} hiddenSet={hiddenSet}
                byMonth={byMonth} inputByMonth={inputByMonth} ytd={ytd} updateMonth={updateMonth}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function GroupRow({ label, color, span }) {
  return (
    <tr className="grid-group-row cat-colored" style={{ '--cat-color': color }}>
      <td><span className="group-name-badge">{label}</span></td>
      <td colSpan={span - 1}></td>
    </tr>
  )
}

function DataRow({ row, striped, months, thisMonth, hiddenSet, byMonth, inputByMonth, ytd, updateMonth }) {
  const isTotal = row.type === 'total'
  const isSubtotal = row.type === 'subtotal'
  const trClass = isTotal ? 'grid-total-row net-highlight' : striped
  const labelStyle = isTotal ? { fontWeight: 700, color: 'var(--cb-mint)' } : isSubtotal ? { fontWeight: 700 } : undefined

  return (
    <tr className={trClass}>
      {isTotal || isSubtotal ? (
        <td style={labelStyle}>{row.label}</td>
      ) : (
        <td className="grid-row-cat"><FitText text={row.label} className="fit-text-plain" /></td>
      )}
      {months.map((m) => {
        if (hiddenSet.has(m)) return <td key={m} className="td-stub" />
        const curCls = m === thisMonth ? 'col-current' : ''

        if (row.type === 'input') {
          const val = inputByMonth.get(m)[row.field]
          return (
            <td key={m} className={`is-input ${curCls}`}>
              <NumberCell
                value={val} decimals={row.decimals} money={row.money} optional={row.optional}
                onCommit={(v) => updateMonth(m, { [row.field]: v })}
              />
            </td>
          )
        }
        if (row.type === 'ytd') {
          const idx = months.indexOf(m)
          return <td key={m} className={curCls} style={row.bold ? { fontWeight: 700, color: 'var(--cb-mint)' } : undefined}>{formatMYR(ytd[idx]?.[row.field])}</td>
        }
        // calc / subtotal / total
        const result = byMonth.get(m)
        const raw = result[row.field]
        const display = row.deduction
          ? (row.blankIfZero && !raw ? '—' : '−' + formatMYR(raw))
          : formatMYR(raw)
        return <td key={m} className={curCls} style={labelStyle}>{display}</td>
      })}
    </tr>
  )
}

function NumberCell({ value, decimals, money, optional, onCommit }) {
  const [text, setText] = useState(String(value ?? 0))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(String(value ?? 0))
  }, [value, focused])

  function commit() {
    const n = parseFloat(text)
    onCommit(Number.isFinite(n) ? n : 0)
    setFocused(false)
  }

  const display = focused ? text : (money ? formatMYR(value) : String(value ?? 0))
  const showBlank = optional && !focused && !value

  return (
    <input
      type="text" inputMode="decimal"
      className="grid-cell-input"
      value={showBlank ? '' : display}
      placeholder="—"
      onFocus={() => { setFocused(true); setText(String(value ?? 0)) }}
      onChange={(e) => setText(e.target.value.replace(decimals === 0 ? /[^0-9]/g : /[^0-9.-]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
    />
  )
}

// ════════════════════════════════════════════════════════════════════
//  Shared bits for Layouts B/C/D
// ════════════════════════════════════════════════════════════════════
function MonthInputFields({ input, onCommit }) {
  return (
    <div className="income-input-grid">
      <div className="field"><label>Flight Hrs</label><NumberCell value={input.hours} decimals={2} onCommit={(v) => onCommit({ hours: v })} /></div>
      <div className="field"><label>Sectors</label><NumberCell value={input.sectors} decimals={0} onCommit={(v) => onCommit({ sectors: v })} /></div>
      <div className="field"><label>Bonus</label><NumberCell value={input.bonus} decimals={2} money onCommit={(v) => onCommit({ bonus: v })} /></div>
      {NIGHTSTOP_FIELDS.map(({ key, label }) => (
        <div className="field" key={key}><label>{label}</label><NumberCell value={input[key]} decimals={0} onCommit={(v) => onCommit({ [key]: v })} /></div>
      ))}
      <div className="field"><label>Adjustment</label><NumberCell value={input.adjustment} decimals={2} money optional onCommit={(v) => onCommit({ adjustment: v })} /></div>
    </div>
  )
}

function EarningsDeductions({ result }) {
  return (
    <>
      <div className="income-section-label">Earnings</div>
      <div className="income-line"><span className="lbl">Basic Salary</span><span className="amt">{formatMYR(result.basic)}</span></div>
      <div className="income-line"><span className="lbl">Meal + Nightstop Allowance</span><span className="amt">{formatMYR(result.productivityAllowance)}</span></div>
      <div className="income-line"><span className="lbl">Performance Allowance</span><span className="amt">{formatMYR(result.performanceAllowance)}</span></div>
      {result.bonus > 0 && <div className="income-line"><span className="lbl">Bonus</span><span className="amt">{formatMYR(result.bonus)}</span></div>}
      <div className="income-calc"><span className="label">Gross Pay</span><span className="amt">{formatMYR(result.gross)}</span></div>

      <div className="income-section-label">Deductions</div>
      <div className="income-line sub"><span className="lbl">Employee EPF (11%)</span><span className="amt">−{formatMYR(result.epfEmployee)}</span></div>
      <div className="income-line sub"><span className="lbl">SOCSO</span><span className="amt">−{formatMYR(result.socsoEmployee)}</span></div>
      {result.skbbk > 0 && <div className="income-line sub"><span className="lbl">SKBBK</span><span className="amt">−{formatMYR(result.skbbk)}</span></div>}
      <div className="income-line sub"><span className="lbl">EIS</span><span className="amt">−{formatMYR(result.eisEmployee)}</span></div>
      <div className="income-line sub"><span className="lbl">PCB (income tax)</span><span className="amt">−{formatMYR(result.pcb)}</span></div>
      <div className="income-line sub"><span className="lbl">Zakat Pendapatan</span><span className="amt">−{formatMYR(result.zakat)}</span></div>
      {result.adjustment !== 0 && <div className="income-line sub"><span className="lbl">Adjustment</span><span className="amt">{result.adjustment > 0 ? '' : '−'}{formatMYR(Math.abs(result.adjustment))}</span></div>}

      <div className="income-calc net"><span className="label">Net Salary</span><span className="amt">{formatMYR(result.net)}</span></div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
//  LAYOUT B — CARD
// ════════════════════════════════════════════════════════════════════
function CardLayout({ viewMonth, thisMonth, onStep, result, input, ytdRow, updateMonth }) {
  if (!result || !input) return null
  return (
    <div className="income-stmt" style={{ maxWidth: 560 }}>
      <div className="income-head" style={{ padding: '14px 16px 0' }}>
        <div className="seg">
          <button onClick={() => onStep(-1)}>&larr;</button>
          <button className="on">{monthLabel(viewMonth)}</button>
          <button onClick={() => onStep(1)}>&rarr;</button>
        </div>
      </div>
      <MonthInputFields input={input} onCommit={(patch) => updateMonth(viewMonth, patch)} />
      <EarningsDeductions result={result} />
      <div className="income-ytd">YTD net (Jan&ndash;{monthLabel(viewMonth).split(' ')[0]}): {formatMYR(ytdRow?.net)}</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  LAYOUT C — DASHBOARD
// ════════════════════════════════════════════════════════════════════
function DashboardLayout({ viewMonth, thisMonth, onStep, allMonths, results, result, input, ytdRow, updateMonth }) {
  if (!result || !input) return null
  const totalDeductions = result.epfEmployee + result.socsoEmployee + result.skbbk + result.eisEmployee + result.pcb + result.zakat + result.adjustment
  const idx = allMonths.indexOf(viewMonth)
  const trendMonths = idx >= 0 ? allMonths.slice(0, idx + 1) : allMonths
  const nets = trendMonths.map((m, i) => results[i]?.net ?? 0)
  const spark = sparklinePoints(nets)
  const deltaPct = nets.length > 1 && nets[0] !== 0 ? ((nets[nets.length - 1] - nets[0]) / Math.abs(nets[0])) * 100 : 0

  return (
    <div>
      <div className="income-head">
        <div className="seg">
          <button onClick={() => onStep(-1)}>&larr;</button>
          <button className="on">{monthLabel(viewMonth)}</button>
          <button onClick={() => onStep(1)}>&rarr;</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-tile"><div className="cb-eyebrow">Gross Pay</div><div className="stat-value">{formatMYR(result.gross)}</div></div>
        <div className="stat-tile"><div className="cb-eyebrow">Total Deductions</div><div className="stat-value" style={{ color: '#f43f5e' }}>−{formatMYR(totalDeductions)}</div></div>
        <div className="stat-tile" style={{ borderColor: 'var(--cb-mint)' }}><div className="cb-eyebrow">Net Salary</div><div className="stat-value" style={{ color: 'var(--cb-mint)' }}>{formatMYR(result.net)}</div></div>
        <div className="stat-tile"><div className="cb-eyebrow">YTD Net</div><div className="stat-value">{formatMYR(ytdRow?.net)}</div></div>
      </div>

      {trendMonths.length > 1 && (
        <div className="income-trend">
          <div className="income-trend-head">
            <span>Net Salary Trend</span>
            <span className={`income-trend-delta ${deltaPct >= 0 ? 'up' : 'down'}`}>{deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}% since {monthLabel(trendMonths[0]).split(' ')[0]}</span>
          </div>
          <svg width="100%" height="56" viewBox="0 0 560 56" preserveAspectRatio="none">
            <line x1="6" y1="28" x2="554" y2="28" stroke="var(--cb-line-2)" strokeWidth="1" strokeDasharray="2 3" />
            <polygon points={spark.area} fill="color-mix(in srgb, var(--cb-mint) 16%, transparent)" />
            <polyline points={spark.line} fill="none" stroke="var(--cb-mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={spark.last[0]} cy={spark.last[1]} r="3.5" fill="var(--cb-mint)" />
          </svg>
        </div>
      )}

      <div className="income-section-label" style={{ padding: '0 0 8px' }}>This month's inputs</div>
      <MonthInputFields input={input} onCommit={(patch) => updateMonth(viewMonth, patch)} />
    </div>
  )
}

function sparklinePoints(values) {
  const W = 560, H = 56, PAD = 6
  const min = Math.min(...values), max = Math.max(...values)
  const pts = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * (W - PAD * 2) + PAD : W / 2
    const y = H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2)
    return [x, y]
  })
  const line = pts.map((p) => p.join(',')).join(' ')
  const area = `${PAD},${H} ${line} ${W - PAD},${H}`
  return { line, area, last: pts[pts.length - 1] }
}

// ════════════════════════════════════════════════════════════════════
//  LAYOUT D — TIMELINE
// ════════════════════════════════════════════════════════════════════
function TimelineLayout({ allMonths, thisMonth, byMonth, inputByMonth, updateMonth }) {
  const [openMonths, setOpenMonths] = useState(() => new Set([thisMonth]))
  function toggle(m) {
    setOpenMonths((prev) => {
      const next = new Set(prev)
      next.has(m) ? next.delete(m) : next.add(m)
      return next
    })
  }

  return (
    <div className="feed-month-group">
      {[...allMonths].reverse().map((m) => {
        const result = byMonth.get(m)
        const input = inputByMonth.get(m)
        const isOpen = openMonths.has(m)
        return (
          <div key={m}>
            <button className="feed-month-header" onClick={() => toggle(m)}>
              <span className="feed-month-chevron">{isOpen ? '▾' : '▸'}</span>
              <span className="feed-month-label">{monthNameFull(m)}{m === thisMonth ? ' · current' : ''}</span>
              <span className="feed-month-meta">Gross {formatPlain(result.gross)} · Net {formatPlain(result.net)}</span>
            </button>
            {isOpen && (
              <div className="income-feed-body">
                <MonthInputFields input={input} onCommit={(patch) => updateMonth(m, patch)} />
                <EarningsDeductions result={result} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
