import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, firebaseReady } from './firebase'
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

  useEffect(() => {
    if (firebaseReady) return onAuthStateChanged(auth, setUser)
  }, [])

  if (!firebaseReady) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <span className="cb-logo">
            <span className="cb-logo__mark" aria-hidden="true" />
            <span className="cb-logo__wordmark">CLAUDEBORNE</span>
          </span>
          <div className="cb-eyebrow" style={{ marginTop: 8 }}>LEDGER</div>
          <p className="dim" style={{ textAlign: 'center', marginTop: 8 }}>
            Firebase isn't configured yet — add your project's config to <code>.env.local</code> to sign in.
          </p>
        </div>
      </div>
    )
  }

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
