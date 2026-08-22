import { useRef, useState } from 'react'
import { useCollection } from './useCollection'
import { useCardTransactions } from './useCardTransactions'
import { useCategories } from './useCategories'
import { useLedgerData } from './LedgerDataContext'
import { DEFAULT_CARD_CATEGORIES } from './categories'
import { paidAmountOf, remainingOf, statusOf, withRunningBalance, groupByMonth, computeMonthStats } from './creditCardsCalc'
import { parseCardCsv } from './importCardCsv'
import { monthLabel, currentMonth } from './months'
import { SmCloseIcon } from './SettingsControls.jsx'

const CATEGORY_COLORS = ['#3FE0C5', '#FFB37C', '#3B8DFF', '#10d983', '#5B6BFF', '#f43f5e', '#eab308']
const PAGE_SIZE = 20

function today() {
  return new Date().toISOString().slice(0, 10)
}
function formatMoney(n, currency) {
  return `${currency} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Smooth green → yellow → red as pctUnpaid goes 0 → 100, for month headers.
const HEAT_GREEN = [63, 224, 197]  // --cb-mint
const HEAT_YELLOW = [234, 179, 8]
const HEAT_RED = [239, 68, 68]
function unpaidHeatRgb(pctUnpaid) {
  const pct = Math.max(0, Math.min(100, pctUnpaid))
  const [c1, c2, t] = pct <= 50 ? [HEAT_GREEN, HEAT_YELLOW, pct / 50] : [HEAT_YELLOW, HEAT_RED, (pct - 50) / 50]
  return c1.map((v, i) => Math.round(v + (c2[i] - v) * t))
}
function unpaidHeatColor(pctUnpaid, alpha) {
  const [r, g, b] = unpaidHeatRgb(pctUnpaid)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const EMPTY_TXN = { description: '', categoryId: '', amount: '', date: today() }

export default function CreditCards({ uid, layout = 'feed' }) {
  const ctx = useLedgerData()
  const { items: cards, add: addCard, remove: removeCard } = useCollection(uid, 'cards', 'name')
  const { items: categories } = useCategories(uid, 'cardCategories', DEFAULT_CARD_CATEGORIES)
  const [selected, setSelected] = useState(null)
  const [newCard, setNewCard] = useState({ name: '', currency: 'MYR' })
  const [newTxn, setNewTxn] = useState(null) // set on FAB open — { cardId, ...EMPTY_TXN }
  const [fabMode, setFabMode] = useState(null) // null | 'transaction' | 'card'
  const [importMsg, setImportMsg] = useState('')
  const fileInputRef = useRef(null)

  const cardId = selected ?? cards[0]?.id ?? null
  const card = cards.find((c) => c.id === cardId)
  const { items: txns, loading, update, remove: removeTxn } = useCardTransactions(uid, cardId)

  function openFab() {
    setFabMode(cards.length === 0 ? 'card' : 'transaction')
    setNewTxn({ ...EMPTY_TXN, cardId: cardId || '' })
  }

  function submitCard(e) {
    e.preventDefault()
    if (!newCard.name) return
    addCard(newCard)
    setNewCard({ name: '', currency: 'MYR' })
    setFabMode(null)
  }

  function submitTxn(e) {
    e.preventDefault()
    const targetCard = cards.find((c) => c.id === newTxn.cardId)
    if (!targetCard || !newTxn.description || !newTxn.amount) return
    ctx.addItem('cardTransactions', {
      description: newTxn.description, categoryId: newTxn.categoryId, date: newTxn.date,
      amount: Number(newTxn.amount), cardId: targetCard.id, currency: targetCard.currency, payments: [],
    })
    setSelected(targetCard.id)
    setFabMode(null)
  }

  function addPayment(txn, amount) {
    const payments = [...(txn.payments || []), { date: today(), amount }]
    update(txn.id, { payments })
  }

  async function handleImportFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setImportMsg('Importing…')
    try {
      const text = await file.text()
      const { transactions, cardNames, categoryNames } = parseCardCsv(text)

      const cardIdByName = new Map(cards.map((c) => [c.name.toUpperCase(), c.id]))
      const missingCards = cardNames.filter((n) => !cardIdByName.has(n.toUpperCase()))
      if (missingCards.length) {
        const newIds = ctx.addManyItems('cards', missingCards.map((name) => ({ name, currency: 'MYR' })))
        missingCards.forEach((name, i) => cardIdByName.set(name.toUpperCase(), newIds[i]))
      }

      const categoryIdByName = new Map(categories.map((c) => [c.name.toUpperCase(), c.id]))
      const missingCategories = categoryNames.filter((n) => !categoryIdByName.has(n.toUpperCase()))
      if (missingCategories.length) {
        const newIds = ctx.addManyItems('cardCategories', missingCategories.map((name, i) => ({ name, order: categories.length + i })))
        missingCategories.forEach((name, i) => categoryIdByName.set(name.toUpperCase(), newIds[i]))
      }

      const rows = transactions.map((t) => ({
        description: t.description,
        date: t.date,
        amount: t.amount,
        cardId: cardIdByName.get(t.cardName.toUpperCase()),
        currency: 'MYR',
        categoryId: t.categoryName ? categoryIdByName.get(t.categoryName.toUpperCase()) || '' : '',
        payments: t.payments,
      }))
      ctx.addManyItems('cardTransactions', rows)
      setImportMsg(`Imported ${rows.length} transactions.`)
    } catch (err) {
      setImportMsg(`Import failed: ${err.message}`)
    }
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Credit Cards</h2>
        <button className="cb-btn-ghost" onClick={() => fileInputRef.current?.click()}>IMPORT CSV</button>
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportFile} />
        {importMsg && <span className="dim" style={{ fontSize: 12 }}>{importMsg}</span>}
      </div>

      <div className="card-pills">
        {cards.map((c) => (
          <button
            key={c.id}
            className={`card-pill${c.id === cardId ? ' card-pill--active' : ''}`}
            onClick={() => setSelected(c.id)}
          >
            {c.name}
            <span className="card-pill-x" onClick={(e) => { e.stopPropagation(); removeCard(c.id) }}>×</span>
          </button>
        ))}
        {cards.length === 0 && <p className="dim">Add a card to start tracking transactions.</p>}
      </div>

      {card && layout === 'grid' && (
        <GridLayout
          card={card} items={txns} loading={loading} categories={categories}
          onAddPayment={addPayment} onUpdate={update} onRemove={removeTxn}
        />
      )}
      {card && layout !== 'grid' && (
        <FeedLayout
          card={card} items={txns} loading={loading} categories={categories}
          onAddPayment={addPayment} onRemove={removeTxn}
        />
      )}

      <button className="fab" onClick={openFab} title="Add a transaction or card">+</button>

      {fabMode && (
        <AddModal
          mode={fabMode} onModeChange={setFabMode}
          cards={cards} categories={categories}
          newTxn={newTxn} onTxnChange={setNewTxn} onSubmitTxn={submitTxn}
          newCard={newCard} onCardChange={setNewCard} onSubmitCard={submitCard}
          onClose={() => setFabMode(null)}
        />
      )}
    </section>
  )
}

function AddModal({ mode, onModeChange, cards, categories, newTxn, onTxnChange, onSubmitTxn, newCard, onCardChange, onSubmitCard, onClose }) {
  return (
    <>
      <div className="sm-backdrop" onClick={onClose} />
      <div className="sm-modal cmm-modal" role="dialog" aria-modal="true" aria-label="Add">
        <header className="sm-head">
          <div>
            <div className="sm-eyebrow">// credit cards</div>
            <h2 className="sm-title">Add</h2>
          </div>
          <button className="sm-close" onClick={onClose} aria-label="Close"><SmCloseIcon /></button>
        </header>

        <nav className="sm-tabs cmm-tabs">
          <button
            className={`sm-tab${mode === 'transaction' ? ' on' : ''}`}
            onClick={() => cards.length > 0 && onModeChange('transaction')} disabled={cards.length === 0}
          >
            <span className="sm-tab-label">Transaction</span>
            <span className="sm-tab-hint">new spend</span>
          </button>
          <button className={`sm-tab${mode === 'card' ? ' on' : ''}`} onClick={() => onModeChange('card')}>
            <span className="sm-tab-label">Card</span>
            <span className="sm-tab-hint">new card</span>
          </button>
        </nav>

        <div className="sm-body">
          {mode === 'transaction' ? (
            <form onSubmit={onSubmitTxn} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select
                className="sm-input" value={newTxn.cardId}
                onChange={(e) => onTxnChange({ ...newTxn, cardId: e.target.value })} required
              >
                <option value="" disabled>Select card…</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                className="sm-input" placeholder="Description" value={newTxn.description} autoFocus
                onChange={(e) => onTxnChange({ ...newTxn, description: e.target.value })} required
              />
              <select
                className="sm-input" value={newTxn.categoryId}
                onChange={(e) => onTxnChange({ ...newTxn, categoryId: e.target.value })}
              >
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                className="sm-input" type="number" step="0.01" placeholder="Amount" value={newTxn.amount}
                onChange={(e) => onTxnChange({ ...newTxn, amount: e.target.value })} required
              />
              <input
                className="sm-input" type="date" value={newTxn.date}
                onChange={(e) => onTxnChange({ ...newTxn, date: e.target.value })}
              />
              <button type="submit" className="cb-btn-primary">Add transaction</button>
            </form>
          ) : (
            <form onSubmit={onSubmitCard} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="sm-input" placeholder="Card name" value={newCard.name} autoFocus
                onChange={(e) => onCardChange({ ...newCard, name: e.target.value })} required
              />
              <input
                className="sm-input" placeholder="Currency" value={newCard.currency}
                onChange={(e) => onCardChange({ ...newCard, currency: e.target.value.toUpperCase() })}
              />
              <button type="submit" className="cb-btn-primary">Add card</button>
            </form>
          )}
        </div>

        <footer className="sm-foot">
          <div className="sm-foot-note">// changes apply immediately</div>
          <button className="cb-btn-ghost" onClick={onClose}>Close</button>
        </footer>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
//  LAYOUT — GRID: dense sheet-style table, month-grouped, running balance
//  across the whole card history (matches the source sheet's Run Balance).
// ════════════════════════════════════════════════════════════════════
function GridLayout({ card, items, loading, categories, onAddPayment, onUpdate, onRemove }) {
  const [expandedMonths, setExpandedMonths] = useState(() => new Set())
  const autoKeyRef = useRef('')

  const withRunning = withRunningBalance(items)
  const groups = groupByMonth(withRunning)
  const remainingTotal = items.reduce((s, t) => s + remainingOf(t), 0)

  // Auto-expand only the newest month the first time this card's data loads.
  const key = card.id
  if (key !== autoKeyRef.current && groups.length > 0) {
    autoKeyRef.current = key
    setExpandedMonths(new Set([groups[0][0]]))
  }

  function toggleMonth(m) {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      next.has(m) ? next.delete(m) : next.add(m)
      return next
    })
  }

  return (
    <div className="card-ledger">
      <div className="card-ledger-summary">
        Unpaid balance on <strong>{card.name}</strong>:{' '}
        <span>{formatMoney(remainingTotal, card.currency)}</span>
      </div>

      {loading ? <p className="dim">Loading…</p> : (
        <div className="grid-wrap">
          <table className="grid-table grid-table--narrow">
            <thead>
              <tr>
                <th>Date</th><th>Description</th><th>Category</th><th>Amount</th>
                <th>Paid</th><th>Balance</th><th>Run Balance</th><th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map(([month, rows]) => {
                const isOpen = expandedMonths.has(month)
                const monthUnpaid = rows.reduce((s, t) => s + remainingOf(t), 0)
                return (
                  <MonthGroup
                    key={month} month={month} rows={rows} isOpen={isOpen} onToggle={() => toggleMonth(month)}
                    monthUnpaid={monthUnpaid} currency={card.currency} categories={categories}
                    onAddPayment={onAddPayment} onUpdate={onUpdate} onRemove={onRemove}
                  />
                )
              })}
              {groups.length === 0 && <tr><td colSpan={8} className="dim">No transactions on this card yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MonthGroup({ month, rows, isOpen, onToggle, monthUnpaid, currency, categories, onAddPayment, onUpdate, onRemove }) {
  return (
    <>
      <tr className="grid-group-row cat-colored" style={{ '--cat-color': 'var(--cb-blue)', cursor: 'pointer' }} onClick={onToggle}>
        <td colSpan={8}>
          <span className="group-name-badge">{isOpen ? '▾' : '▸'} {monthLabel(month)}</span>
          <span className="dim" style={{ marginLeft: 10, fontSize: 12 }}>
            {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
            {monthUnpaid > 0 ? ` · ${formatMoney(monthUnpaid, currency)} unpaid` : ''}
          </span>
        </td>
      </tr>
      {isOpen && rows.map((t) => (
        <TxnRow
          key={t.id} txn={t} currency={currency} categories={categories}
          onAddPayment={(amt) => onAddPayment(t, amt)} onUpdate={(patch) => onUpdate(t.id, patch)} onRemove={() => onRemove(t.id)}
        />
      ))}
    </>
  )
}

function TxnRow({ txn, currency, categories, onAddPayment, onUpdate, onRemove }) {
  const [payAmount, setPayAmount] = useState('')
  const status = statusOf(txn)
  const paid = paidAmountOf(txn)
  const remaining = remainingOf(txn)

  function submitPayment(e) {
    e.preventDefault()
    const amt = Number(payAmount)
    if (!amt || amt <= 0) return
    onAddPayment(Math.min(amt, remaining))
    setPayAmount('')
  }

  return (
    <tr className={status === 'paid' ? 'row-even' : 'row-odd'}>
      <td className="is-input">
        <input type="date" className="grid-cell-input" value={txn.date || ''} onChange={(e) => onUpdate({ date: e.target.value })} />
      </td>
      <td className="is-input">
        <input type="text" className="grid-cell-input" value={txn.description || ''} onChange={(e) => onUpdate({ description: e.target.value })} />
      </td>
      <td className="is-input">
        <select className="grid-cell-input" value={txn.categoryId || ''} onChange={(e) => onUpdate({ categoryId: e.target.value })}>
          <option value="">—</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td className="is-input">
        <input
          type="number" step="0.01" className="grid-cell-input" value={txn.amount ?? 0}
          onChange={(e) => onUpdate({ amount: Number(e.target.value) || 0 })}
        />
      </td>
      <td>
        <div>{formatMoney(paid, currency)}</div>
        {status !== 'paid' && (
          <form onSubmit={submitPayment} style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <input
              type="number" step="0.01" placeholder="+ pay" value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)} style={{ width: 60 }}
            />
            <button type="submit" className="cb-btn-ghost" style={{ padding: '2px 6px' }}>+</button>
          </form>
        )}
      </td>
      <td>{formatMoney(remaining, currency)}</td>
      <td>{formatMoney(txn.runningBalance, currency)}</td>
      <td><button className="cb-btn-ghost" onClick={onRemove} aria-label="Remove transaction">✕</button></td>
    </tr>
  )
}

// ════════════════════════════════════════════════════════════════════
//  LAYOUT — FEED (default): stat tiles + category breakdown for the
//  current month, then transactions as month-grouped feed cards.
// ════════════════════════════════════════════════════════════════════
function FeedLayout({ card, items, loading, categories, onAddPayment, onRemove }) {
  const [expandedMonths, setExpandedMonths] = useState(() => new Set())
  const [pageByMonth, setPageByMonth] = useState({})
  const autoKeyRef = useRef('')

  const groups = groupByMonth(items)
  const remainingTotal = items.reduce((s, t) => s + remainingOf(t), 0)
  const thisMonth = currentMonth()
  const monthStats = computeMonthStats(items, thisMonth)

  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const catColor = Object.fromEntries(categories.map((c, i) => [c.id, CATEGORY_COLORS[i % CATEGORY_COLORS.length]]))

  const key = card.id
  if (key !== autoKeyRef.current && groups.length > 0) {
    autoKeyRef.current = key
    setExpandedMonths(new Set([groups[0][0]]))
  }

  function toggleMonth(m) {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      next.has(m) ? next.delete(m) : next.add(m)
      return next
    })
  }

  function setPage(month, page, pageCount) {
    setPageByMonth((prev) => ({ ...prev, [month]: Math.min(Math.max(1, page), pageCount) }))
  }

  return (
    <div className="card-ledger">
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-tile" style={{ borderColor: 'var(--cb-mint)' }}>
          <div className="cb-eyebrow">Unpaid Balance</div>
          <div className="stat-value" style={{ color: 'var(--cb-mint)' }}>{formatMoney(remainingTotal, card.currency)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">{monthLabel(thisMonth)} Spent</div>
          <div className="stat-value">{formatMoney(monthStats.spent, card.currency)}</div>
        </div>
        <div className="stat-tile">
          <div className="cb-eyebrow">{monthLabel(thisMonth)} Paid</div>
          <div className="stat-value">{formatMoney(monthStats.paid, card.currency)}</div>
        </div>
      </div>

      {loading ? <p className="dim">Loading…</p> : (
        <>
          {groups.map(([month, rows]) => {
            const isCurrent = month === thisMonth
            const isOpen = expandedMonths.has(month)
            const monthTotal = rows.reduce((s, t) => s + Number(t.amount || 0), 0)
            const monthUnpaid = rows.reduce((s, t) => s + remainingOf(t), 0)
            const pctUnpaid = monthTotal > 0 ? (monthUnpaid / monthTotal) * 100 : 0
            const fullyPaid = pctUnpaid === 0
            const heatColor = unpaidHeatColor(pctUnpaid, 1)
            const badgeStyle = {
              color: heatColor, WebkitTextStroke: '0.3px rgba(0, 0, 0, 1)',
              background: unpaidHeatColor(pctUnpaid, 0.2), border: `1px solid ${heatColor}`,
              borderRadius: 999, padding: '3px 10px',
            }
            const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
            const page = Math.min(pageByMonth[month] ?? 1, pageCount)
            const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
            return (
              <div key={month} className="feed-month-group">
                <button className="feed-month-header" onClick={() => toggleMonth(month)}>
                  <span className="feed-month-chevron">{isOpen ? '▾' : '▸'}</span>
                  <span className="feed-month-label">{monthLabel(month)}{isCurrent ? ' · active' : ''}</span>
                  <span className="feed-month-meta" style={badgeStyle}>
                    {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                    {' · '}{fullyPaid ? 'Fully Paid' : `${formatMoney(monthUnpaid, card.currency)} Unpaid`}
                  </span>
                </button>
                {isOpen && (
                  <>
                    <div className="feed" style={{ maxHeight: 1300, overflowY: 'auto', paddingRight: 4 }}>
                      {pageRows.map((t) => (
                        <TxnFeedCard
                          key={t.id} txn={t} currency={card.currency}
                          category={catById[t.categoryId]} dotColor={catColor[t.categoryId]}
                          onAddPayment={(amt) => onAddPayment(t, amt)} onRemove={() => onRemove(t.id)}
                        />
                      ))}
                    </div>
                    {pageCount > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, fontSize: 11 }}>
                        <button className="cb-btn-ghost" disabled={page <= 1} onClick={() => setPage(month, page - 1, pageCount)}>‹ PREV</button>
                        <span>
                          Page{' '}
                          <input
                            type="number" min={1} max={pageCount} value={page}
                            onChange={(e) => setPage(month, Number(e.target.value) || 1, pageCount)}
                            style={{ width: 44, textAlign: 'center', margin: '0 4px', padding: '2px 4px' }}
                          />
                          of {pageCount}
                        </span>
                        <button className="cb-btn-ghost" disabled={page >= pageCount} onClick={() => setPage(month, page + 1, pageCount)}>NEXT ›</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
          {groups.length === 0 && <p className="dim">No transactions on this card yet.</p>}
        </>
      )}
    </div>
  )
}

function TxnFeedCard({ txn, currency, category, dotColor, onAddPayment, onRemove }) {
  const [payAmount, setPayAmount] = useState('')
  const status = statusOf(txn)
  const paid = paidAmountOf(txn)
  const remaining = remainingOf(txn)
  const isPaid = status === 'paid'
  const isPartial = status === 'partial'

  function submitPayment(e) {
    e.preventDefault()
    const amt = Number(payAmount)
    if (!amt || amt <= 0) return
    onAddPayment(Math.min(amt, remaining))
    setPayAmount('')
  }

  return (
    <div className={`feed-card${isPartial ? ' is-partial' : ''}`}>
      <span className="dot" style={{ background: dotColor || 'var(--cb-ink-dim)' }} />
      <div className="feed-main">
        <div className="feed-desc">{txn.description}</div>
        <div className="feed-cat">{category?.name || 'No category'} · {txn.date}</div>
        {isPartial && (
          <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round(paid / txn.amount * 100)}%` }} /></div>
        )}
        {paid > 0 && (
          <div className="payment-history">
            {(txn.payments || []).map((p, i) => (
              <div key={i} className="payment-row">{p.date} — {currency} {Number(p.amount).toFixed(2)}</div>
            ))}
          </div>
        )}
        {!isPaid && (
          <form className="payment-form" onSubmit={submitPayment}>
            <input type="number" step="0.01" placeholder="Add payment" value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)} />
            <button type="submit" className="cb-btn-ghost">ADD</button>
            <button type="button" className="cb-btn-ghost" onClick={() => onAddPayment(remaining)}>MARK FULLY PAID</button>
          </form>
        )}
      </div>
      <span className={`pill ${status}`}>{status[0].toUpperCase() + status.slice(1)}</span>
      {isPaid ? (
        <span className="feed-amt">{currency} {Number(txn.amount).toFixed(2)}</span>
      ) : (
        <div className="feed-amt-block">
          <span className="feed-amt">{currency} {Number(txn.amount).toFixed(2)}</span>
          <span className="feed-breakdown">Paid {paid.toFixed(2)} · <span className="bal">Bal {remaining.toFixed(2)}</span></span>
        </div>
      )}
      <button className="cb-btn-ghost" onClick={onRemove} aria-label="Remove transaction" style={{ color: '#ef4444', borderColor: '#ef4444' }}>✕</button>
    </div>
  )
}
