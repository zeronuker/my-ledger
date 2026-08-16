import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import Auth from './Auth.jsx'
import Dashboard from './Dashboard.jsx'
import Expenses from './Expenses.jsx'
import CreditCards from './CreditCards.jsx'
import Income from './Income.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'cards', label: 'Credit Cards' },
  { id: 'income', label: 'Income' },
]

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out
  const [tab, setTab] = useState('dashboard')

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  if (user === undefined) return <div className="app-loading">Loading…</div>
  if (!user) return <Auth />

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="cb-logo">
          <span className="cb-logo__mark" aria-hidden="true" />
          <span className="cb-logo__wordmark">LEDGER</span>
        </span>
        <button className="cb-btn" onClick={() => signOut(auth)}>SIGN OUT</button>
      </header>

      <nav className="app-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`app-tab${tab === t.id ? ' app-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'dashboard' && <Dashboard uid={user.uid} />}
        {tab === 'expenses' && <Expenses uid={user.uid} />}
        {tab === 'cards' && <CreditCards uid={user.uid} />}
        {tab === 'income' && <Income uid={user.uid} />}
      </main>
    </div>
  )
}
