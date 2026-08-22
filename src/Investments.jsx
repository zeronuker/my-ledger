import { useEffect, useState } from 'react'
import { useLedgerData } from './LedgerDataContext'
import {
  ASB_PEOPLE, ASB_ACCOUNTS, emptySnapshot,
  computeInstrumentTotals, computeAsbColumnTotals, computeGoldSummary,
} from './investmentsCalc'
import FitText from './FitText.jsx'

function formatMYR(n) {
  return `RM ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatPct(n) {
  return `${Number(n || 0).toFixed(2)}%`
}

const ACCOUNT_LABELS = { asb: 'ASB', asb2: 'ASB2', asm2: 'ASM2' }
const GOLD_PURITIES = [999, 916]

export default function Investments({ uid, layout = 'grid' }) {
  const ctx = useLedgerData()
  const investments = ctx.collections.investments || {}
  const snapshot = { ...emptySnapshot(), ...(investments.current || {}) }
  const goldItems = Object.entries(investments)
    .filter(([id]) => id !== 'current')
    .map(([id, d]) => ({ id, ...d }))

  function updateSnapshot(patch) {
    ctx.updateItem('investments', 'current', patch)
  }
  function updateAsb(personKey, field, value) {
    const nextAsb = { ...snapshot.asb, [personKey]: { ...(snapshot.asb[personKey] || {}), [field]: value } }
    updateSnapshot({ asb: nextAsb })
  }
  function updateGoldPrice(purity, field, value) {
    const nextPrice = {
      ...snapshot.goldPrice,
      [purity]: { ...(snapshot.goldPrice[purity] || {}), [field]: value },
    }
    updateSnapshot({ goldPrice: nextPrice, goldPriceManual: true })
  }
  function addGoldItem() {
    ctx.addItem('investments', { label: 'New item', purity: 999, weightGrams: 0, pricePerGram: 0 })
  }
  function updateGoldItem(id, patch) {
    ctx.updateItem('investments', id, patch)
  }
  function removeGoldItem(id) {
    ctx.removeItem('investments', id)
  }

  const goldSummary = computeGoldSummary(goldItems, snapshot.goldPrice)
  const { tiles, householdTotal } = computeInstrumentTotals(snapshot, goldSummary.totalCurrent)
  const asbColumnTotals = computeAsbColumnTotals(snapshot.asb)

  if (!ctx.dataLoaded) return <section><p className="dim">Loading…</p></section>

  return (
    <section>
      {layout === 'grid' || !layout ? (
        <GridLayout
          snapshot={snapshot} tiles={tiles} householdTotal={householdTotal}
          asbColumnTotals={asbColumnTotals} goldSummary={goldSummary}
          updateSnapshot={updateSnapshot} updateAsb={updateAsb} updateGoldPrice={updateGoldPrice}
          addGoldItem={addGoldItem} updateGoldItem={updateGoldItem} removeGoldItem={removeGoldItem}
        />
      ) : (
        <p className="dim">This layout isn't built yet — switch back to Grid in Settings for now.</p>
      )}
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════
//  LAYOUT A — GRID (default)
// ════════════════════════════════════════════════════════════════════
function GridLayout({
  snapshot, tiles, householdTotal, asbColumnTotals, goldSummary,
  updateSnapshot, updateAsb, updateGoldPrice, addGoldItem, updateGoldItem, removeGoldItem,
}) {
  return (
    <>
      <InstrumentTable snapshot={snapshot} tiles={tiles} updateSnapshot={updateSnapshot} />
      <div style={{ height: 20 }} />
      <div className="stat-grid">
        <div className="stat-tile" style={{ borderColor: 'var(--cb-mint)' }}>
          <div className="cb-eyebrow">Total Household Savings</div>
          <div className="stat-value" style={{ color: 'var(--cb-mint)' }}>{formatMYR(householdTotal)}</div>
        </div>
      </div>
      <div style={{ height: 20 }} />
      <AsbTable snapshot={snapshot} asbColumnTotals={asbColumnTotals} updateAsb={updateAsb} />
      <div style={{ height: 20 }} />
      <GoldPriceTable snapshot={snapshot} updateSnapshot={updateSnapshot} updateGoldPrice={updateGoldPrice} />
      <div style={{ height: 20 }} />
      <GoldLedgerTable
        goldSummary={goldSummary} snapshot={snapshot}
        addGoldItem={addGoldItem} updateGoldItem={updateGoldItem} removeGoldItem={removeGoldItem}
      />
    </>
  )
}

function InstrumentTable({ tiles, updateSnapshot }) {
  return (
    <div className="grid-wrap">
      <table className="grid-table">
        <thead>
          <tr><th></th>{tiles.map((t) => <th key={t.key}><span className="month-header-badge">{t.label}</span></th>)}</tr>
        </thead>
        <tbody>
          <tr className="row-even">
            <td className="grid-row-cat"><FitText text="Value" className="fit-text-plain" /></td>
            {tiles.map((t) => (
              <td key={t.key} className="is-input">
                {t.key === 'asbFamily' || t.key === 'gold'
                  ? <span>{formatMYR(t.value)}</span>
                  : <NumberCell value={t.value} decimals={2} money onCommit={(v) => updateSnapshot({ [t.key]: v })} />}
              </td>
            ))}
          </tr>
          <tr className="row-odd">
            <td className="grid-row-cat"><FitText text="% of total" className="fit-text-plain" /></td>
            {tiles.map((t) => <td key={t.key}>{formatPct(t.pct)}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function AsbTable({ snapshot, asbColumnTotals, updateAsb }) {
  const grandTotal = ASB_ACCOUNTS.reduce((s, acc) => s + asbColumnTotals[acc], 0)
  return (
    <div className="grid-wrap">
      <table className="grid-table grid-table--narrow">
        <thead>
          <tr>
            <th></th>
            {ASB_ACCOUNTS.map((acc) => <th key={acc}><span className="month-header-badge">{ACCOUNT_LABELS[acc]}</span></th>)}
            <th><span className="month-header-badge">Total</span></th>
          </tr>
        </thead>
        <tbody>
          {ASB_PEOPLE.map((p, i) => {
            const row = snapshot.asb[p.key] || {}
            const rowTotal = ASB_ACCOUNTS.reduce((s, acc) => s + (row[acc] || 0), 0)
            return (
              <tr key={p.key} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td className="grid-row-cat"><FitText text={p.label} className="fit-text-plain" /></td>
                {ASB_ACCOUNTS.map((acc) => (
                  <td key={acc} className="is-input">
                    <NumberCell value={row[acc]} decimals={2} money onCommit={(v) => updateAsb(p.key, acc, v)} />
                  </td>
                ))}
                <td>{formatMYR(rowTotal)}</td>
              </tr>
            )
          })}
          <tr className="grid-total-row net-highlight">
            <td style={{ fontWeight: 700 }}>Total</td>
            {ASB_ACCOUNTS.map((acc) => <td key={acc} style={{ fontWeight: 700 }}>{formatMYR(asbColumnTotals[acc])}</td>)}
            <td style={{ fontWeight: 700, color: 'var(--cb-mint)' }}>{formatMYR(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function GoldPriceTable({ snapshot, updateSnapshot, updateGoldPrice }) {
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')

  async function refresh() {
    setFetching(true)
    setError('')
    try {
      const res = await fetch('/api/gold-price')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'fetch failed')
      updateSnapshot({
        goldPrice: {
          999: data['999'], 916: data['916'],
          fetchedAt: data.fetchedAt, manualOverride: false,
        },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
    }
  }

  const fetchedAt = snapshot.goldPrice.fetchedAt
  return (
    <div className="grid-wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span className="group-name-badge">Gold Price</span>
        <button className="cb-btn-ghost" onClick={refresh} disabled={fetching}>
          {fetching ? 'FETCHING…' : 'REFRESH FROM PUBLIC GOLD'}
        </button>
        {fetchedAt && <span className="dim" style={{ fontSize: 12 }}>Last fetched {new Date(fetchedAt).toLocaleString()}</span>}
        {error && <span style={{ fontSize: 12, color: '#f43f5e' }}>{error} — edit manually below</span>}
      </div>
      <table className="grid-table grid-table--narrow">
        <thead>
          <tr>
            <th><span className="month-header-badge">Purity</span></th>
            <th><span className="month-header-badge">PG Sell (RM/g)</span></th>
            <th><span className="month-header-badge">PG Buy (RM/g)</span></th>
          </tr>
        </thead>
        <tbody>
          {GOLD_PURITIES.map((purity, i) => {
            const p = snapshot.goldPrice[purity] || { sell: 0, buy: 0 }
            return (
              <tr key={purity} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td>{purity}</td>
                <td className="is-input"><NumberCell value={p.sell} decimals={2} money onCommit={(v) => updateGoldPrice(purity, 'sell', v)} /></td>
                <td className="is-input"><NumberCell value={p.buy} decimals={2} money onCommit={(v) => updateGoldPrice(purity, 'buy', v)} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function GoldLedgerTable({ goldSummary, snapshot, addGoldItem, updateGoldItem, removeGoldItem }) {
  return (
    <div className="grid-wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span className="group-name-badge">Physical Gold Ledger</span>
        <button className="cb-btn-ghost" onClick={addGoldItem}>+ ADD ITEM</button>
      </div>
      <table className="grid-table grid-table--narrow">
        <thead>
          <tr>
            <th><span className="month-header-badge">Item</span></th>
            <th><span className="month-header-badge">Purity</span></th>
            <th><span className="month-header-badge">Weight (g)</span></th>
            <th><span className="month-header-badge">Price/Gram</span></th>
            <th><span className="month-header-badge">Purchased</span></th>
            <th><span className="month-header-badge">Current</span></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {goldSummary.items.map((item, i) => (
            <tr key={item.id} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
              <td className="is-input">
                <input
                  type="text" className="grid-cell-input" value={item.label || ''}
                  onChange={(e) => updateGoldItem(item.id, { label: e.target.value })}
                />
              </td>
              <td className="is-input">
                <select
                  className="grid-cell-input" value={item.purity || 999}
                  onChange={(e) => updateGoldItem(item.id, { purity: Number(e.target.value) })}
                >
                  {GOLD_PURITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </td>
              <td className="is-input"><NumberCell value={item.weightGrams} decimals={2} onCommit={(v) => updateGoldItem(item.id, { weightGrams: v })} /></td>
              <td className="is-input"><NumberCell value={item.pricePerGram} decimals={2} money onCommit={(v) => updateGoldItem(item.id, { pricePerGram: v })} /></td>
              <td>{formatMYR(item.purchasedPrice)}</td>
              <td>{formatMYR(item.currentPrice)}</td>
              <td><button className="cb-btn-ghost" onClick={() => removeGoldItem(item.id)} aria-label="Remove item">✕</button></td>
            </tr>
          ))}
          <tr className="grid-total-row net-highlight">
            <td style={{ fontWeight: 700 }}>Total</td>
            <td></td>
            <td style={{ fontWeight: 700 }}>{goldSummary.totalWeight.toFixed(2)}g</td>
            <td style={{ fontWeight: 700 }}>{formatMYR(goldSummary.avgPricePerGram)}</td>
            <td style={{ fontWeight: 700 }}>{formatMYR(goldSummary.totalPurchased)}</td>
            <td style={{ fontWeight: 700, color: 'var(--cb-mint)' }}>{formatMYR(goldSummary.totalCurrent)}</td>
            <td></td>
          </tr>
          <tr>
            <td colSpan={7} style={{ textAlign: 'right', fontWeight: 700 }}>{formatPct(goldSummary.gainPct)} gain</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  Shared input cell
// ════════════════════════════════════════════════════════════════════
function NumberCell({ value, decimals = 2, money, onCommit }) {
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

  return (
    <input
      type="text" inputMode="decimal"
      className="grid-cell-input"
      value={display}
      onFocus={() => { setFocused(true); setText(String(value ?? 0)) }}
      onChange={(e) => setText(e.target.value.replace(decimals === 0 ? /[^0-9]/g : /[^0-9.-]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
    />
  )
}
