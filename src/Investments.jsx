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

  const layoutProps = {
    snapshot, tiles, householdTotal, asbColumnTotals, goldSummary,
    updateSnapshot, updateAsb, updateGoldPrice, addGoldItem, updateGoldItem, removeGoldItem,
  }

  return (
    <section>
      <h2 className="section-title">Investments</h2>
      {(layout === 'grid' || !layout) && <GridLayout {...layoutProps} />}
      {layout === 'dashboard' && <DashboardLayout {...layoutProps} />}
      {layout === 'cards' && <CardsLayout {...layoutProps} />}
      {layout === 'household' && <HouseholdLayout {...layoutProps} />}
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
  const goldValue = tiles.find((t) => t.key === 'gold')?.value || 0
  const asbFamilyValue = tiles.find((t) => t.key === 'asbFamily')?.value || 0
  return (
    <>
      <div className="stat-grid">
        <div className="stat-tile" style={{ borderColor: 'var(--cb-mint)' }}>
          <div className="cb-eyebrow">Total Household Savings</div>
          <div className="stat-value" style={{ color: 'var(--cb-mint)' }}>{formatMYR(householdTotal)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">ASB (Family)</div>
          <div className="stat-value">{formatMYR(asbFamilyValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">Gold Value</div>
          <div className="stat-value">{formatMYR(goldValue)}</div>
        </div>
      </div>
      <div style={{ height: 20 }} />
      <span className="group-name-badge">Household Instruments</span>
      <div style={{ height: 8 }} />
      <InstrumentTable snapshot={snapshot} tiles={tiles} updateSnapshot={updateSnapshot} />
      <div style={{ height: 20 }} />
      <span className="group-name-badge">ASB by Family Member</span>
      <div style={{ height: 8 }} />
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

// ════════════════════════════════════════════════════════════════════
//  LAYOUT B — DASHBOARD: stat tiles + breakdown bars, raw entry tables
//  collapsed by default (Instruments/ASB — the two most tedious to enter;
//  Gold sections already carry their own header/actions so stay expanded).
// ════════════════════════════════════════════════════════════════════
const TILE_COLORS = ['#3FE0C5', '#FFB37C', '#3B8DFF', '#10d983', '#5B6BFF', '#f43f5e', '#eab308', '#06b6d4']

function DashboardLayout({
  snapshot, tiles, householdTotal, asbColumnTotals, goldSummary,
  updateSnapshot, updateAsb, updateGoldPrice, addGoldItem, updateGoldItem, removeGoldItem,
}) {
  const goldValue = tiles.find((t) => t.key === 'gold')?.value || 0
  const asbFamilyValue = tiles.find((t) => t.key === 'asbFamily')?.value || 0
  const [openSections, setOpenSections] = useState(() => new Set())

  function toggle(key) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <>
      <div className="stat-grid">
        <div className="stat-tile" style={{ borderColor: 'var(--cb-mint)' }}>
          <div className="cb-eyebrow">Total Household Savings</div>
          <div className="stat-value" style={{ color: 'var(--cb-mint)' }}>{formatMYR(householdTotal)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">ASB (Family)</div>
          <div className="stat-value">{formatMYR(asbFamilyValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">Gold Value</div>
          <div className="stat-value">{formatMYR(goldValue)}</div>
        </div>
      </div>

      <div style={{ height: 20 }} />
      <span className="group-name-badge">Breakdown</span>
      <div style={{ height: 8 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tiles.map((t, i) => (
          <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 100, fontSize: 11, color: 'var(--cb-ink-dim)', flexShrink: 0 }}>{t.label}</span>
            <div className="progress-track" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${t.pct}%`, background: TILE_COLORS[i % TILE_COLORS.length] }} />
            </div>
            <span style={{ width: 110, textAlign: 'right', fontSize: 12 }}>{formatMYR(t.value)}</span>
            <span style={{ width: 50, textAlign: 'right', fontSize: 11, color: 'var(--cb-ink-dim)' }}>{formatPct(t.pct)}</span>
          </div>
        ))}
      </div>

      <div style={{ height: 20 }} />
      <CollapsibleSection title="Household Instruments" isOpen={openSections.has('instruments')} onToggle={() => toggle('instruments')}>
        <InstrumentTable snapshot={snapshot} tiles={tiles} updateSnapshot={updateSnapshot} />
      </CollapsibleSection>

      <div style={{ height: 12 }} />
      <CollapsibleSection title="ASB by Family Member" isOpen={openSections.has('asb')} onToggle={() => toggle('asb')}>
        <AsbTable snapshot={snapshot} asbColumnTotals={asbColumnTotals} updateAsb={updateAsb} />
      </CollapsibleSection>

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

function CollapsibleSection({ title, isOpen, onToggle, children }) {
  return (
    <div>
      <button className="feed-month-header" onClick={onToggle} style={{ width: '100%' }}>
        <span className="feed-month-chevron">{isOpen ? '▾' : '▸'}</span>
        <span className="feed-month-label">{title}</span>
      </button>
      {isOpen && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  LAYOUT C — CARDS: one card per instrument type.
// ════════════════════════════════════════════════════════════════════
function CardsLayout({
  snapshot, tiles, householdTotal, asbColumnTotals, goldSummary,
  updateSnapshot, updateAsb, updateGoldPrice, addGoldItem, updateGoldItem, removeGoldItem,
}) {
  const goldValue = tiles.find((t) => t.key === 'gold')?.value || 0
  const asbFamilyValue = tiles.find((t) => t.key === 'asbFamily')?.value || 0

  return (
    <>
      <div className="stat-grid">
        <div className="stat-tile" style={{ borderColor: 'var(--cb-mint)' }}>
          <div className="cb-eyebrow">Total Household Savings</div>
          <div className="stat-value" style={{ color: 'var(--cb-mint)' }}>{formatMYR(householdTotal)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">ASB (Family)</div>
          <div className="stat-value">{formatMYR(asbFamilyValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">Gold Value</div>
          <div className="stat-value">{formatMYR(goldValue)}</div>
        </div>
      </div>

      <div style={{ height: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <InstrumentCard
          title="EPF" snapshot={snapshot} updateSnapshot={updateSnapshot}
          rows={[{ key: 'epf1', label: 'EPF 1' }, { key: 'epf2', label: 'EPF 2' }, { key: 'epf3', label: 'EPF 3' }]}
          total={(snapshot.epf1 || 0) + (snapshot.epf2 || 0) + (snapshot.epf3 || 0)}
        />
        <InstrumentCard
          title="SSPN" snapshot={snapshot} updateSnapshot={updateSnapshot}
          rows={[{ key: 'sspn1', label: 'SSPN 1' }, { key: 'sspn2', label: 'SSPN 2' }]}
          total={(snapshot.sspn1 || 0) + (snapshot.sspn2 || 0)}
        />
        <InstrumentCard
          title="Unit Trust" snapshot={snapshot} updateSnapshot={updateSnapshot}
          rows={[{ key: 'unitTrust', label: 'Unit Trust' }]}
        />
      </div>

      <div style={{ height: 20 }} />
      <span className="group-name-badge">ASB (Family)</span>
      <div style={{ height: 8 }} />
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

function InstrumentCard({ title, rows, snapshot, updateSnapshot, total }) {
  return (
    <div style={{ border: '1px solid var(--cb-line-2)', borderRadius: 'var(--cb-radius-md)', padding: 14, background: 'var(--cb-surface-1)' }}>
      <span className="group-name-badge">{title}</span>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--cb-ink-dim)' }}>{r.label}</span>
            <NumberCell value={snapshot[r.key]} decimals={2} money onCommit={(v) => updateSnapshot({ [r.key]: v })} />
          </div>
        ))}
      </div>
      {rows.length > 1 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--cb-line)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>Total</span>
          <span style={{ color: 'var(--cb-mint)' }}>{formatMYR(total)}</span>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  LAYOUT D — HOUSEHOLD: grouped by family member first, shared
//  (non-personal) instruments below.
// ════════════════════════════════════════════════════════════════════
function HouseholdLayout({
  snapshot, tiles, householdTotal, asbColumnTotals, goldSummary,
  updateSnapshot, updateAsb, updateGoldPrice, addGoldItem, updateGoldItem, removeGoldItem,
}) {
  const goldValue = tiles.find((t) => t.key === 'gold')?.value || 0
  const asbFamilyValue = tiles.find((t) => t.key === 'asbFamily')?.value || 0
  const sharedTiles = tiles.filter((t) => t.key !== 'asbFamily')

  return (
    <>
      <div className="stat-grid">
        <div className="stat-tile" style={{ borderColor: 'var(--cb-mint)' }}>
          <div className="cb-eyebrow">Total Household Savings</div>
          <div className="stat-value" style={{ color: 'var(--cb-mint)' }}>{formatMYR(householdTotal)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">ASB (Family)</div>
          <div className="stat-value">{formatMYR(asbFamilyValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">Gold Value</div>
          <div className="stat-value">{formatMYR(goldValue)}</div>
        </div>
      </div>

      <div style={{ height: 20 }} />
      <span className="group-name-badge">By Family Member</span>
      <div style={{ height: 8 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {ASB_PEOPLE.map((p) => {
          const row = snapshot.asb[p.key] || {}
          const personTotal = ASB_ACCOUNTS.reduce((s, acc) => s + (row[acc] || 0), 0)
          return (
            <div key={p.key} style={{ border: '1px solid var(--cb-line-2)', borderRadius: 'var(--cb-radius-md)', padding: 14, background: 'var(--cb-surface-1)' }}>
              <span className="group-name-badge">{p.label}</span>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ASB_ACCOUNTS.map((acc) => (
                  <div key={acc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--cb-ink-dim)' }}>{ACCOUNT_LABELS[acc]}</span>
                    <NumberCell value={row[acc]} decimals={2} money onCommit={(v) => updateAsb(p.key, acc, v)} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--cb-line)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: 'var(--cb-mint)' }}>{formatMYR(personTotal)}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ height: 20 }} />
      <span className="group-name-badge">Shared / Family Instruments</span>
      <div style={{ height: 8 }} />
      <InstrumentTable snapshot={snapshot} tiles={sharedTiles} updateSnapshot={updateSnapshot} />

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
        <button
          className="icon-btn" onClick={refresh} disabled={fetching}
          title={fetching ? 'Fetching…' : 'Refresh from Public Gold'} aria-label="Refresh gold price"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: fetching ? 'cb-sync-spin 1s linear infinite' : 'none' }}
          >
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span className="group-name-badge">Physical Gold Ledger</span>
        <button className="cb-btn-ghost" onClick={addGoldItem}>+ ADD ITEM</button>
      </div>
      <div className="grid-wrap">
        <table className="grid-table grid-table--narrow">
          <thead>
            <tr>
              <th><span className="month-header-badge">Item</span></th>
              <th><span className="month-header-badge">Purity</span></th>
              <th><span className="month-header-badge">Weight (g)</span></th>
              <th><span className="month-header-badge">Price/Gram</span></th>
              <th><span className="month-header-badge">Purchased</span></th>
              <th><span className="month-header-badge">Current</span></th>
              <th style={{ width: 44, background: 'transparent', border: 'none' }}></th>
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
                <td style={{ width: 44, padding: '4px 6px', background: 'transparent', border: 'none' }}><button className="cb-btn-ghost" onClick={() => removeGoldItem(item.id)} aria-label="Remove item" style={{ color: '#ef4444', borderColor: '#ef4444', padding: '3px 6px' }}>✕</button></td>
              </tr>
            ))}
            <tr className="grid-total-row net-highlight">
              <td style={{ fontWeight: 700 }}>Total</td>
              <td></td>
              <td style={{ fontWeight: 700 }}>{goldSummary.totalWeight.toFixed(2)}g</td>
              <td style={{ fontWeight: 700 }}>{formatMYR(goldSummary.avgPricePerGram)}</td>
              <td style={{ fontWeight: 700 }}>{formatMYR(goldSummary.totalPurchased)}</td>
              <td style={{ fontWeight: 700, color: 'var(--cb-mint)' }}>{formatMYR(goldSummary.totalCurrent)}</td>
              <td style={{ width: 44, background: 'transparent', border: 'none' }}></td>
            </tr>
            <tr>
              <td colSpan={7} style={{ textAlign: 'right', fontWeight: 700 }}>{formatPct(goldSummary.gainPct)} gain</td>
            </tr>
          </tbody>
        </table>
      </div>
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
