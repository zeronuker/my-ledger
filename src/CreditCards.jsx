import { useState } from 'react'
import { useCollection } from './useCollection'
import { useCategories } from './useCategories'
import { DEFAULT_CARD_CATEGORIES } from './categories'
import { paidAmountOf, remainingOf, statusOf } from './payments'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_TXN = { description: '', categoryId: '', amount: '', date: today() }

export default function CreditCards({ uid }) {
  const { items: cards, add: addCard, remove: removeCard } = useCollection(uid, 'cards', 'name')
  const { items: categories } = useCategories(uid, 'cardCategories', DEFAULT_CARD_CATEGORIES)
  const { items: allTxns, loading, add: addTxn, update, remove: removeTxn } = useCollection(uid, 'cardTransactions')
  const [selected, setSelected] = useState(null)
  const [newCard, setNewCard] = useState({ name: '', currency: 'MYR' })

  const cardId = selected ?? cards[0]?.id ?? null
  const card = cards.find((c) => c.id === cardId)
  const txns = allTxns.filter((t) => t.cardId === cardId)

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

function CardFeed({ card, items, loading, categories, onAdd, onAddPayment, onRemove }) {
  const [form, setForm] = useState(EMPTY_TXN)
  const [expanded, setExpanded] = useState(() => new Set())
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const catColor = Object.fromEntries(categories.map((c, i) => [c.id, CAT_COLORS[i % CAT_COLORS.length]]))

  const remainingTotal = items.reduce((s, t) => s + remainingOf(t), 0)

  function submit(e) {
    e.preventDefault()
    if (!form.description || !form.amount) return
    onAdd({ ...form, amount: Number(form.amount) })
    setForm(EMPTY_TXN)
  }

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const sorted = [...items].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

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

      {loading ? <p className="dim">Loading…</p> : (
        <div className="feed">
          {sorted.map((t) => (
            <TxnCard
              key={t.id} txn={t} currency={card.currency}
              category={catById[t.categoryId]} dotColor={catColor[t.categoryId]}
              expanded={expanded.has(t.id)} onToggle={() => toggle(t.id)}
              onAddPayment={(amt) => onAddPayment(t, amt)} onRemove={() => onRemove(t.id)}
            />
          ))}
          {items.length === 0 && <p className="dim">No transactions yet.</p>}
        </div>
      )}
    </div>
  )
}

function TxnCard({ txn, currency, category, dotColor, expanded, onToggle, onAddPayment, onRemove }) {
  const [payAmount, setPayAmount] = useState('')
  const status = statusOf(txn)
  const paid = paidAmountOf(txn)
  const remaining = remainingOf(txn)
  const isPaid = status === 'paid'
  const isPartial = status === 'partial'
  const showDetails = !isPaid || expanded

  function submitPayment(e) {
    e.preventDefault()
    const amt = Number(payAmount)
    if (!amt || amt <= 0) return
    onAddPayment(Math.min(amt, remaining))
    setPayAmount('')
  }

  return (
    <div
      className={`feed-card${isPaid ? ' is-paid' : ''}${isPartial ? ' is-partial' : ''}`}
      onClick={isPaid ? onToggle : undefined}
    >
      <span className="dot" style={{ background: dotColor || 'var(--cb-ink-dim)' }} />
      <div className="feed-main">
        <div className="feed-desc">{txn.description}</div>
        {(!isPaid || expanded) && (
          <div className="feed-cat">{category?.name || 'No category'} · {txn.date}</div>
        )}
        {isPartial && (
          <>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round(paid / txn.amount * 100)}%` }} /></div>
            <div className="feed-remaining">{currency} {remaining.toFixed(2)} remaining</div>
          </>
        )}
        {showDetails && paid > 0 && (
          <div className="payment-history">
            {(txn.payments || []).map((p, i) => (
              <div key={i} className="payment-row">{p.date} — {currency} {Number(p.amount).toFixed(2)}</div>
            ))}
          </div>
        )}
        {showDetails && !isPaid && (
          <form className="payment-form" onSubmit={submitPayment} onClick={(e) => e.stopPropagation()}>
            <input type="number" step="0.01" placeholder="Add payment" value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)} />
            <button type="submit" className="cb-btn">ADD</button>
            <button type="button" className="cb-btn" onClick={() => onAddPayment(remaining)}>MARK FULLY PAID</button>
          </form>
        )}
      </div>
      <span className={`pill ${status}`}>{status[0].toUpperCase() + status.slice(1)}</span>
      <span className="feed-amt">{currency} {Number(txn.amount).toFixed(2)}</span>
      {showDetails && <button className="cb-btn cb-btn--danger" onClick={(e) => { e.stopPropagation(); onRemove() }}>×</button>}
    </div>
  )
}
