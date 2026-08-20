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
  const { isOnline, syncStatus, lastSyncTime, conflict, sync, resolveKeepLocal, resolveKeepCloud } = useLedgerData()

  return (
    <>
      <style>{makeThemeCss(previewSettings || settings)}</style>
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
