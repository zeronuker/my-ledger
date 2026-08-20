import { useEffect, useReducer, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, firebaseReady } from './firebase'
import { useSettings } from './useSettings'
import { LedgerDataProvider, useLedgerData } from './LedgerDataContext'
import { makeThemeCss } from './theme'
import { useUpdate } from '@brand/useUpdate'
import UpdatePrompt from '@brand/UpdatePrompt'
import Auth, { VerifyEmailGate, WelcomeScreen, needsVerifyKey } from './Auth.jsx'
import Settings from './Settings.jsx'
import Dashboard from './Dashboard.jsx'
import Expenses from './Expenses.jsx'
import CreditCards from './CreditCards.jsx'
import Income from './Income.jsx'
import SyncStatus from './SyncStatus.jsx'
import LocalSaveStatus from './LocalSaveStatus.jsx'
import SyncConflictModal from './SyncConflictModal.jsx'
import BrandBanner from '@brand/BrandBanner'

// Small flat mini-illustration tab icons, matching eLogBook's TabLogbookIcon/
// TabSummaryIcon/TabLimitsIcon style (16x16, viewBox 0 0 24 24, hardcoded
// palette colors rather than currentColor).
const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="1" fill="none" stroke="#5a7a9a" strokeWidth="0.8" />
    <rect x="6" y="13" width="3" height="6" fill="#3FE0C5" />
    <rect x="10.5" y="9" width="3" height="10" fill="#3B8DFF" />
    <rect x="15" y="6" width="3" height="13" fill="#5B6BFF" />
  </svg>
)
const ExpensesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="1" fill="#1a2230" stroke="#8a93a8" strokeWidth="0.6" />
    <line x1="3" y1="9" x2="21" y2="9" stroke="#3FE0C5" strokeWidth="0.8" />
    <line x1="3" y1="14" x2="21" y2="14" stroke="#5a7a9a" strokeWidth="0.6" />
    <line x1="10" y1="4" x2="10" y2="20" stroke="#5a7a9a" strokeWidth="0.6" />
    <line x1="16" y1="4" x2="16" y2="20" stroke="#5a7a9a" strokeWidth="0.6" />
  </svg>
)
const CreditCardsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" fill="#1a2230" stroke="#3B8DFF" strokeWidth="1.2" />
    <rect x="2" y="8" width="20" height="3" fill="#3B8DFF" />
    <rect x="5" y="15" width="6" height="1.6" fill="#FFB37C" />
  </svg>
)
const IncomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="3,17 9,11 13,14 21,5" fill="none" stroke="#10d983" strokeWidth="1.8" strokeLinejoin="miter" strokeLinecap="square" />
    <polyline points="15,5 21,5 21,11" fill="none" stroke="#10d983" strokeWidth="1.8" strokeLinejoin="miter" />
  </svg>
)

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'expenses', label: 'Expenses', icon: ExpensesIcon },
  { id: 'cards', label: 'Credit Cards', icon: CreditCardsIcon },
  { id: 'income', label: 'Income', icon: IncomeIcon },
]

// How often to poll for a new service worker while the app stays open —
// same cadence as eLogBook/SuperApp.
const SW_UPDATE_INTERVAL_MS = 30 * 60 * 1000

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out
  const [justSignedOut, setJustSignedOut] = useState(false)
  const [justVerified, setJustVerified] = useState(false)
  const prevUserRef = useRef(undefined)
  const pwaUpdate = useUpdate('ledger', SW_UPDATE_INTERVAL_MS)

  // `user` (the Firebase User instance) mutates in place on reload() — this
  // exists purely to force a re-render after VerifyEmailGate calls reload(),
  // since React won't notice an in-place mutation on its own.
  const [, bumpUser] = useReducer((c) => c + 1, 0)

  useEffect(() => {
    if (!firebaseReady) return
    // Dev-only escape hatch: skip real sign-in with a fake local uid so the
    // app can be tested without touching a password field. Double-gated —
    // import.meta.env.DEV is statically false (dead-code-eliminated) in any
    // `vite build`, and the env var only exists if someone opts in locally.
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true') {
      setUser({ uid: 'dev-bypass', email: 'dev@local', emailVerified: true })
      return
    }
    return onAuthStateChanged(auth, (u) => {
      // Only a real signed-in → signed-out transition counts — not the
      // initial cold-load resolving to "no user", which should land on the
      // ordinary landing screen, not a signed-out confirmation.
      if (prevUserRef.current && !u) setJustSignedOut(true)
      prevUserRef.current = u
      setUser(u)
    })
  }, [])

  if (!firebaseReady) {
    return (
      <>
        <div className="auth-screen">
          <div className="auth-card-wrap">
            <div className="auth-card">
              <div className="auth-cbar" />
              <div className="auth-cbody" style={{ textAlign: 'center' }}>
                <span className="cb-logo">
                  <span className="cb-logo__mark" aria-hidden="true" />
                  <span className="cb-logo__wordmark">CLAUDEBORNE</span>
                </span>
                <div className="cb-eyebrow" style={{ marginTop: 8 }}>LEDGER</div>
                <p className="auth-subtitle" style={{ marginTop: 12, marginBottom: 0 }}>
                  Firebase isn't configured yet — add your project's config to <code>.env.local</code> to sign in.
                </p>
              </div>
            </div>
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
        <Auth justSignedOut={justSignedOut} onSignedOutDone={() => setJustSignedOut(false)} />
        <UpdatePrompt ready update={pwaUpdate} />
      </>
    )
  }

  // Only accounts created through the sign-up flow going forward carry this
  // flag — existing accounts are never retroactively gated on a verification
  // they were never asked to complete (see needsVerifyKey in Auth.jsx).
  const needsVerification = !user.emailVerified && localStorage.getItem(needsVerifyKey(user.uid)) === '1'
  if (needsVerification) {
    return (
      <>
        <VerifyEmailGate user={user} onVerified={() => { bumpUser(); setJustVerified(true) }} />
        <UpdatePrompt ready update={pwaUpdate} />
      </>
    )
  }
  if (justVerified) {
    return (
      <>
        <WelcomeScreen onDone={() => setJustVerified(false)} />
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
  const [previewSettings, setPreviewSettings] = useState(null)
  const { settings, update } = useSettings(uid)
  const {
    isOnline, syncStatus, lastSyncTime, saveStatus, lastSaveTime,
    conflict, sync, resolveKeepLocal, resolveKeepCloud,
  } = useLedgerData()

  return (
    <>
      <style>{makeThemeCss(previewSettings || settings)}</style>
      <div className="app-shell">
        <header className="app-header">
          <BrandBanner subtitle="LEDGER" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true' && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#f5c542',
                background: 'rgba(245,197,66,0.1)', border: '1px solid rgba(245,197,66,0.3)',
                borderRadius: 3, padding: '2px 8px', whiteSpace: 'nowrap',
              }}>
                DEV BYPASS
              </span>
            )}
            <LocalSaveStatus saveStatus={saveStatus} lastSaveTime={lastSaveTime} />
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
              <t.icon />
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
        <Settings
          uid={uid} settings={settings} update={update} pwaUpdate={pwaUpdate}
          onPreview={setPreviewSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {conflict && (
        <SyncConflictModal
          lastSyncTime={lastSyncTime}
          cloudUpdatedAt={conflict.cloudUpdatedAt}
          onKeepLocal={resolveKeepLocal}
          onKeepCloud={resolveKeepCloud}
        />
      )}

      <UpdatePrompt ready update={pwaUpdate} isBusy={syncStatus === 'syncing'} />
    </>
  )
}
