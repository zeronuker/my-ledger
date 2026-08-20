import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, firebaseReady } from './firebase'
import { useSettings } from './useSettings'
import { LedgerDataProvider, useLedgerData } from './LedgerDataContext'
import { makeThemeCss } from './theme'
import { useUpdate } from '@brand/useUpdate'
import UpdatePrompt from '@brand/UpdatePrompt'
import Auth from './Auth.jsx'
import Settings from './Settings.jsx'
import Dashboard from './Dashboard.jsx'
import Expenses from './Expenses.jsx'
import CreditCards from './CreditCards.jsx'
import Income from './Income.jsx'
import SyncStatus from './SyncStatus.jsx'
import SyncConflictModal from './SyncConflictModal.jsx'
import BrandBanner from '@brand/BrandBanner'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'cards', label: 'Credit Cards' },
  { id: 'income', label: 'Income' },
]

// How often to poll for a new service worker while the app stays open —
// same cadence as eLogBook/SuperApp.
const SW_UPDATE_INTERVAL_MS = 30 * 60 * 1000

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out
  const pwaUpdate = useUpdate('ledger', SW_UPDATE_INTERVAL_MS)

  useEffect(() => {
    if (firebaseReady) return onAuthStateChanged(auth, setUser)
  }, [])

  if (!firebaseReady) {
    return (
      <>
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
        <UpdatePrompt ready update={pwaUpdate} />
      </>
    )
  }

  if (user === undefined) return <div className="app-loading">Loading…</div>
  if (!user) {
    return (
      <>
        <Auth />
        <UpdatePrompt ready update={pwaUpdate} />
      </>
    )
  }

  return (
    <LedgerDataProvider uid={user.uid}>
      <AuthenticatedApp uid={user.uid} pwaUpdate={pwaUpdate} />
    </LedgerDataProvider>
  )
}

function AuthenticatedApp({ uid, pwaUpdate }) {
  const [tab, setTab] = useState('dashboard')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { settings, update } = useSettings(uid)
  const { isOnline, syncStatus, lastSyncTime, conflict, sync, resolveKeepLocal, resolveKeepCloud } = useLedgerData()

  return (
    <>
      <style>{makeThemeCss(settings)}</style>
      <div className="app-shell">
        <header className="app-header">
          <BrandBanner subtitle="LEDGER" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SyncStatus isOnline={isOnline} syncStatus={syncStatus} lastSyncTime={lastSyncTime} onSync={sync} />
            <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>⚙</button>
          </div>
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
          {tab === 'dashboard' && <Dashboard uid={uid} />}
          {tab === 'expenses' && <Expenses uid={uid} />}
          {tab === 'cards' && <CreditCards uid={uid} />}
          {tab === 'income' && <Income uid={uid} />}
        </main>
      </div>

      {settingsOpen && (
        <Settings uid={uid} settings={settings} update={update} pwaUpdate={pwaUpdate} onClose={() => setSettingsOpen(false)} />
      )}

      {conflict && (
        <SyncConflictModal onKeepLocal={resolveKeepLocal} onKeepCloud={resolveKeepCloud} />
      )}

      <UpdatePrompt ready update={pwaUpdate} isBusy={syncStatus === 'syncing'} />
    </>
  )
}
