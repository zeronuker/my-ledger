import { useMemo, useState } from 'react'
import { useCollection } from './useCollection'
import { useCardTransactions } from './useCardTransactions'
import { useCategories } from './useCategories'
import { DEFAULT_CARD_CATEGORIES } from './categories'
import { paidAmountOf, remainingOf, statusOf } from './payments'
import { monthLabel, resolveRange } from './months'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_TXN = { description: '', categoryId: '', amount: '', date: today() }
const PAGE_SIZE = 25

export default function CreditCards({ uid }) {
  const { items: cards, add: addCard, remove: removeCard } = useCollection(uid, 'cards', 'name')
  const { items: categories } = useCategories(uid, 'cardCategories', DEFAULT_CARD_CATEGORIES)
  const [selected, setSelected] = useState(null)
  const [newCard, setNewCard] = useState({ name: '', currency: 'MYR' })

  const cardId = selected ?? cards[0]?.id ?? null
  const card = cards.find((c) => c.id === cardId)
  const { items: txns, loading, add: addTxn, update, remove: removeTxn } = useCardTransactions(uid, cardId)

  function submitCard(e) {
    e.preventDefault()
    if (!newCard.name) return
    addCard(newCard)
    setNewCard({ name: '', currency: 'MYR' })
  }

  function addPayment(txn, amount) {
    const payments = [...(txn.payments || []), { date: today(), amount }]
    update(txn.id, { payments })
  }

  return (
    <section>
      <h2 className="section-title">Credit Cards</h2>

      <form onSubmit={submitCard} className="row-form">
        <input placeholder="Card name" value={newCard.name}
          onChange={(e) => setNewCard({ ...newCard, name: e.target.value })} required />
        <input placeholder="Currency" value={newCard.currency} style={{ width: 64 }}
          onChange={(e) => setNewCard({ ...newCard, currency: e.target.value.toUpperCase() })} />
        <button type="submit" className="cb-btn cb-btn--primary">ADD CARD</button>
      </form>

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

      {card && (
        <CardFeed
          card={card} items={txns} loading={loading} categories={categories}
          onAdd={(data) => addTxn({ ...data, cardId: card.id, currency: card.currency, payments: [] })}
          onAddPayment={addPayment} onRemove={removeTxn}
        />
      )}
    </section>
  )
}

const CAT_COLORS = ['var(--cb-mint)', 'var(--cb-blue)', 'var(--cb-violet)']
const SORT_FIELDS = [
  { id: 'date', label: 'Date' },
  { id: 'category', label: 'Category' },
  { id: 'amount', label: 'Amount' },
]

function CardFeed({ card, items, loading, categories, onAdd, onAddPayment, onRemove }) {
  const [form, setForm] = useState(EMPTY_TXN)
  const [tab, setTab] = useState('active') // 'active' | 'paid'
  const [range, setRange] = useState('6M')
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [expandedMonths, setExpandedMonths] = useState(() => new Set())
  const [autoKey, setAutoKey] = useState('')
  const [visibleCounts, setVisibleCounts] = useState({})
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const catColor = Object.fromEntries(categories.map((c, i) => [c.id, CAT_COLORS[i % CAT_COLORS.length]]))

  const remainingTotal = items.reduce((s, t) => s + remainingOf(t), 0)

  function submit(e) {
    e.preventDefault()
    if (!form.description || !form.amount) return
    onAdd({ ...form, amount: Number(form.amount) })
    setForm(EMPTY_TXN)
  }

  const { from, to } = resolveRange(range)
  const inRange = items.filter((t) => {
    const m = t.date?.slice(0, 7)
    return m && m >= from && m <= to
  })
  const tabItems = inRange.filter((t) => (tab === 'paid' ? statusOf(t) === 'paid' : statusOf(t) !== 'paid'))

  const sortCmp = (a, b) => {
    let cmp
    if (sortField === 'amount') cmp = Number(a.amount) - Number(b.amount)
    else if (sortField === 'category') cmp = (catById[a.categoryId]?.name || '').localeCompare(catById[b.categoryId]?.name || '')
    else cmp = (a.date || '').localeCompare(b.date || '')
    return sortDir === 'asc' ? cmp : -cmp
  }

  const byMonth = useMemo(() => {
    const map = new Map()
    for (const t of tabItems) {
      const m = t.date?.slice(0, 7) || 'Unknown'
      if (!map.has(m)) map.set(m, [])
      map.get(m).push(t)
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, rows]) => [month, [...rows].sort(sortCmp)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabItems, sortField, sortDir])

  // Auto-expand just the newest month whenever the tab/range selection
  // changes to a set of months we haven't shown before — collapsed-by-
  // default is what keeps a backlog of months from being one giant scroll.
  // Firestore delivers a cache-based snapshot (sometimes empty) before the
  // authoritative server one, so "loading just became false" isn't a
  // reliable trigger — wait for byMonth to actually have data instead.
  const key = `${tab}|${range}`
  if (key !== autoKey && byMonth.length > 0) {
    setAutoKey(key)
    setExpandedMonths(new Set([byMonth[0][0]]))
  }

  function toggleMonth(month) {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      next.has(month) ? next.delete(month) : next.add(month)
      return next
    })
  }

  return (
    <div className="card-ledger">
      <div className="card-ledger-summary">
        Unpaid balance on <strong>{card.name}</strong>:{' '}
        <span className="cb-mono">{card.currency} {remainingTotal.toFixed(2)}</span>
      </div>

      <form onSubmit={submit} className="row-form">
        <input placeholder="Description" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">No category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="number" step="0.01" placeholder="Amount" value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input type="date" value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <button type="submit" className="cb-btn cb-btn--primary">ADD</button>
      </form>

      <div className="feed-toolbar">
        <div className="seg">
          <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Active</button>
          <button className={tab === 'paid' ? 'on' : ''} onClick={() => setTab('paid')}>Paid</button>
        </div>
        <div className="range-bar" style={{ marginBottom: 0 }}>
          {['3M', '6M', '12M', 'YTD'].map((r) => (
            <button key={r} className={`range-chip${range === r ? ' on' : ''}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
        <div className="sort-bar">
          <select value={sortField} onChange={(e) => setSortField(e.target.value)}>
            {SORT_FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <button className="icon-btn" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')} aria-label="Toggle sort direction">
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {loading ? <p className="dim">Loading…</p> : (
        <>
          {byMonth.map(([month, rows]) => {
            const isOpen = expandedMonths.has(month)
            const shown = visibleCounts[month] ?? PAGE_SIZE
            const visibleRows = rows.slice(0, shown)
            const monthUnpaid = rows.reduce((s, t) => s + remainingOf(t), 0)
            return (
              <div key={month} className="feed-month-group">
                <button className="feed-month-header" onClick={() => toggleMonth(month)}>
                  <span className="feed-month-chevron">{isOpen ? '▾' : '▸'}</span>
                  <span className="feed-month-label">{monthLabel(month)}</span>
                  <span className="feed-month-meta">
                    {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                    {tab === 'active' && monthUnpaid > 0 ? ` · ${card.currency} ${monthUnpaid.toFixed(2)} unpaid` : ''}
                  </span>
                </button>
                {isOpen && (
                  <>
                    <div className="feed">
                      {visibleRows.map((t) => (
                        <TxnCard
                          key={t.id} txn={t} currency={card.currency}
                          category={catById[t.categoryId]} dotColor={catColor[t.categoryId]}
                          onAddPayment={(amt) => onAddPayment(t, amt)} onRemove={() => onRemove(t.id)}
                        />
                      ))}
                    </div>
                    {shown < rows.length && (
                      <button
                        className="cb-btn feed-show-more"
                        onClick={() => setVisibleCounts((v) => ({ ...v, [month]: shown + PAGE_SIZE }))}
                      >
                        SHOW {Math.min(PAGE_SIZE, rows.length - shown)} MORE
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
          {byMonth.length === 0 && <p className="dim">Nothing here for this range.</p>}
        </>
      )}
    </div>
  )
}

function TxnCard({ txn, currency, category, dotColor, onAddPayment, onRemove }) {
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
          <>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round(paid / txn.amount * 100)}%` }} /></div>
            <div className="feed-remaining">Paid {currency} {paid.toFixed(2)} · Balance {currency} {remaining.toFixed(2)}</div>
          </>
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
            <button type="submit" className="cb-btn">ADD</button>
            <button type="button" className="cb-btn" onClick={() => onAddPayment(remaining)}>MARK FULLY PAID</button>
          </form>
        )}
      </div>
      <span className={`pill ${status}`}>{status[0].toUpperCase() + status.slice(1)}</span>
      <span className="feed-amt">{currency} {Number(txn.amount).toFixed(2)}</span>
      <button className="cb-btn cb-btn--danger" onClick={onRemove}>×</button>
    </div>
  )
}
