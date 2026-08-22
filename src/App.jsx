import { useEffect, useReducer, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
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
import Investments from './Investments.jsx'
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
const InvestmentsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <ellipse cx="12" cy="7" rx="7" ry="2.4" fill="#FFB37C" stroke="#8a5a2a" strokeWidth="0.6" />
    <path d="M5 7 V11 C5 12.3 8.1 13.4 12 13.4 C15.9 13.4 19 12.3 19 11 V7" fill="#FFB37C" stroke="#8a5a2a" strokeWidth="0.6" />
    <path d="M5 11 V15 C5 16.3 8.1 17.4 12 17.4 C15.9 17.4 19 16.3 19 15 V11" fill="#FFB37C" stroke="#8a5a2a" strokeWidth="0.6" />
  </svg>
)

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'income', label: 'Income', icon: IncomeIcon },
  { id: 'investments', label: 'Investments', icon: InvestmentsIcon },
  { id: 'expenses', label: 'Expenses', icon: ExpensesIcon },
  { id: 'cards', label: 'Credit Cards', icon: CreditCardsIcon },
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
            <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button className="icon-btn icon-btn--danger" aria-label="Sign out" title="Sign out" onClick={() => signOut(auth)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
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
          {tab === 'income' && <Income uid={uid} layout={settings.incomeLayout} />}
          {tab === 'investments' && <Investments uid={uid} layout={settings.investmentsLayout} />}
          {tab === 'expenses' && <Expenses uid={uid} layout={settings.expensesLayout} />}
          {tab === 'cards' && <CreditCards uid={uid} layout={settings.creditCardsLayout} />}
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
