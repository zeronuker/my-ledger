import { useState } from 'react'
import { useCollection } from './useCollection'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_TXN = { description: '', category: '', amount: '', date: today(), paid: false }

export default function CreditCards({ uid }) {
  const { items: cards, add: addCard, remove: removeCard } = useCollection(uid, 'cards', 'name')
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
        <CardLedger
          card={card} items={txns} loading={loading}
          onAdd={(data) => addTxn({ ...data, cardId: card.id, currency: card.currency })}
          onUpdate={update} onRemove={removeTxn}
        />
      )}
    </section>
  )
}

function CardLedger({ card, items, loading, onAdd, onUpdate, onRemove }) {
  const [form, setForm] = useState(EMPTY_TXN)

  const unpaidTotal = items.filter((t) => !t.paid).reduce((s, t) => s + Number(t.amount), 0)

  function submit(e) {
    e.preventDefault()
    if (!form.description || !form.amount) return
    onAdd({ ...form, amount: Number(form.amount) })
    setForm(EMPTY_TXN)
  }

  return (
    <div className="card-ledger">
      <div className="card-ledger-summary">
        Unpaid balance on <strong>{card.name}</strong>:{' '}
        <span className="cb-mono">{card.currency} {unpaidTotal.toFixed(2)}</span>
      </div>

      <form onSubmit={submit} className="row-form">
        <input placeholder="Description" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <input placeholder="Category" value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input type="number" step="0.01" placeholder="Amount" value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input type="date" value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <button type="submit" className="cb-btn cb-btn--primary">ADD</button>
      </form>

      {loading ? <p className="dim">Loading…</p> : (
        <table className="ledger-table">
          <thead>
            <tr><th>Paid</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th /></tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className={t.paid ? 'row-paid' : ''}>
                <td>
                  <input type="checkbox" checked={!!t.paid}
                    onChange={(e) => onUpdate(t.id, { paid: e.target.checked })} />
                </td>
                <td>{t.date}</td>
                <td>{t.description}</td>
                <td>{t.category}</td>
                <td className="cb-mono">{card.currency} {Number(t.amount).toFixed(2)}</td>
                <td><button className="cb-btn cb-btn--danger" onClick={() => onRemove(t.id)}>×</button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="dim">No transactions yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}
