import { useEffect, useState } from 'react'
import {
  EmailAuthProvider, reauthenticateWithCredential, deleteUser,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from './firebase'
import { clearAllCloudData } from './cloudSync'
import { clearLocalData } from './localStore'
import { ACCENT_PRESETS, FONT_CHOICES, DEFAULT_SETTINGS, INCOME_LAYOUTS, EXPENSES_LAYOUTS, INVESTMENTS_LAYOUTS, CREDIT_CARDS_LAYOUTS } from './theme'
import { SmSectionHead, SmField, SmRow, SmSegmented, SmSlider, SmCloseIcon } from './SettingsControls.jsx'
import { CHANGELOG } from './changelog'

const SETTINGS_TABS = [
  { id: 'appearance', label: 'Appearance', hint: 'theme · accent · font' },
  { id: 'preferences', label: 'Preferences', hint: 'categories' },
  { id: 'account', label: 'Account', hint: 'password · delete' },
  { id: 'about', label: 'About', hint: 'version · updates' },
]

// Only Appearance settings are part of the draft/Save/Cancel/Reset-tab
// flow — categories and account actions apply instantly, same as eLogBook's
// own delete-account section isn't gated by its Save button either.
const APPEARANCE_KEYS = ['theme', 'accentPreset', 'fontFamily', 'fontSize', 'density']

// Single source of truth: the app's displayed version is always the newest
// changelog entry, so it can never drift out of sync the way the old
// hardcoded '0.1.0' did across 30+ commits.
const APP_VERSION = CHANGELOG[CHANGELOG.length - 1].v

// Render a changelog note: pull a leading NEW/IMP/FIX tag into a styled badge.
function renderNote(n) {
  const m = /^(NEW|IMP|FIX):\s*/.exec(n)
  if (!m) return n
  return (
    <>
      <span className={`sm-cl-tag sm-cl-tag-${m[1]}`}>{m[1]}</span>
      {n.slice(m[0].length)}
    </>
  )
}

// Matches eLogBook's Settings modal: draft-based Appearance tab with a live
// preview pushed to the app behind the modal (onPreview), explicit
// Save/Cancel/Reset-tab in the footer. Preferences and Account tabs apply
// immediately (there's no "draft" concept for adding a category or signing
// out), matching how eLogBook's own non-appearance tabs behave too.
export default function Settings({ uid, settings, update, pwaUpdate, onPreview, onClose, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'appearance')
  const [draft, setDraft] = useState(() => ({ ...DEFAULT_SETTINGS, ...settings }))
  const [savedFlash, setSavedFlash] = useState(false)
  const [resetFlash, setResetFlash] = useState(false)

  useEffect(() => {
    onPreview?.(draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  function handleClose() {
    onPreview?.(null)
    onClose()
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function upd(patch) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  // Only Appearance fields are ever part of `draft` — Preferences/Account
  // settings (e.g. incomeLayout) apply instantly via their own `update()`
  // calls and must never be touched here, or this would blindly re-apply a
  // draft snapshot frozen at modal-open time and clobber anything changed
  // live since then.
  function handleSave() {
    const patch = Object.fromEntries(APPEARANCE_KEYS.map((k) => [k, draft[k]]))
    update(patch)
    onPreview?.(null)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 3000)
  }

  function handleResetTab() {
    setDraft((prev) => {
      const next = { ...prev }
      APPEARANCE_KEYS.forEach((k) => { next[k] = DEFAULT_SETTINGS[k] })
      return next
    })
    setResetFlash(true)
    setTimeout(() => setResetFlash(false), 2000)
  }

  return (
    <>
      <div className="sm-backdrop" onClick={handleClose} />
      <div className="sm-modal" role="dialog" aria-modal="true" aria-label="Settings">
        <header className="sm-head">
          <div>
            <div className="sm-eyebrow">// settings</div>
            <h2 className="sm-title">Settings</h2>
          </div>
          <button className="sm-close" onClick={handleClose} aria-label="Close"><SmCloseIcon /></button>
        </header>

        <nav className="sm-tabs">
          {SETTINGS_TABS.map((st) => (
            <button
              key={st.id} className={`sm-tab${tab === st.id ? ' on' : ''}`}
              onClick={() => setTab(st.id)}
            >
              <span className="sm-tab-label">{st.label}</span>
              <span className="sm-tab-hint">{st.hint}</span>
            </button>
          ))}
        </nav>

        <div className="sm-body">
          {tab === 'appearance' && <AppearanceTab d={draft} upd={upd} />}
          {tab === 'preferences' && <PreferencesTab settings={settings} update={update} />}
          {tab === 'account' && <AccountTab uid={uid} onClose={handleClose} />}
          {tab === 'about' && <AboutTab pwaUpdate={pwaUpdate} />}
        </div>

        <footer className="sm-foot">
          <div className={`sm-foot-note${savedFlash ? ' saved' : resetFlash ? ' reset' : ''}`}>
            {savedFlash ? '// ✓ saved' : resetFlash ? '// tab reset to defaults' : '// changes save to your account · synced across devices'}
          </div>
          <div className="sm-foot-btns">
            {tab === 'appearance' && <button className="cb-btn-reset" onClick={handleResetTab}>Reset tab</button>}
            {tab !== 'about' && <button className="cb-btn-ghost" onClick={handleClose}>Cancel</button>}
            {tab !== 'about' && <button className="cb-btn-primary" onClick={handleSave}>Save</button>}
          </div>
        </footer>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
//  APPEARANCE TAB
// ════════════════════════════════════════════════════════════════════
function AppearanceTab({ d, upd }) {
  const theme = d.theme || 'dark'
  const fontSize = Math.min(18, Math.max(12, Number(d.fontSize) || 14))
  const density = d.density || 'default'
  const accentPreset = d.accentPreset || 'gradient'
  const fontFamily = d.fontFamily || 'jetbrains'
  const fontCss = FONT_CHOICES.find((f) => f.id === fontFamily)?.css || FONT_CHOICES[0].css

  return (
    <div className="sm-tab-content">
      <SmSectionHead title="Theme" hint="// dark for low light · light for daytime" />
      <SmRow>
        <SmSegmented
          value={theme} onChange={(v) => upd({ theme: v })}
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
        />
      </SmRow>

      <SmSectionHead title="Accent" hint="// 10 curated brand presets" />
      <SmRow>
        <div className="sm-accent-grid">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.id} type="button"
              className={`sm-accent${accentPreset === p.id ? ' on' : ''}`}
              onClick={() => upd({ accentPreset: p.id })}
              aria-label={p.name}
            >
              <span
                className="sm-accent-swatch"
                style={{ background: p.colors.length > 1 ? `linear-gradient(135deg, ${p.colors.join(', ')})` : p.single }}
              />
              <span className="sm-accent-name">{p.name}</span>
            </button>
          ))}
        </div>
      </SmRow>

      <SmSectionHead title="Font family" hint="// 5 monospace choices · keeps numbers aligned" />
      <SmRow>
        <div className="sm-font-grid">
          {FONT_CHOICES.map((f) => (
            <button
              key={f.id} type="button"
              className={`sm-font${fontFamily === f.id ? ' on' : ''}`}
              onClick={() => upd({ fontFamily: f.id })}
            >
              <span className="sm-font-sample" style={{ fontFamily: f.css }}>{f.sample}</span>
              <span className="sm-font-name">{f.name}</span>
            </button>
          ))}
        </div>
      </SmRow>

      <SmSectionHead title="Text size" hint="// 12–18px · scales table + body text" />
      <SmRow>
        <SmSlider
          min={12} max={18} step={1} value={fontSize}
          onChange={(v) => upd({ fontSize: v })}
          ticks={['12', '13', '14', '15', '16', '17', '18']} unit="px"
        />
      </SmRow>
      <div className="sm-font-preview" style={{ fontFamily: fontCss, fontSize }}>
        MYR 1,234.56 · EXPENSES · CREDIT CARDS · 08/2026
      </div>

      <SmSectionHead title="Density" hint="// row height & padding across every table" />
      <SmRow>
        <SmSegmented
          value={density} onChange={(v) => upd({ density: v })}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'default', label: 'Default' },
            { value: 'relaxed', label: 'Relaxed' },
          ]}
        />
      </SmRow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  PREFERENCES TAB
// ════════════════════════════════════════════════════════════════════
function PreferencesTab({ settings, update }) {
  const incomeLayout = settings.incomeLayout || DEFAULT_SETTINGS.incomeLayout
  const activeIncome = INCOME_LAYOUTS.find((l) => l.value === incomeLayout)
  const expensesLayout = settings.expensesLayout || DEFAULT_SETTINGS.expensesLayout
  const activeExpenses = EXPENSES_LAYOUTS.find((l) => l.value === expensesLayout)
  const investmentsLayout = settings.investmentsLayout || DEFAULT_SETTINGS.investmentsLayout
  const activeInvestments = INVESTMENTS_LAYOUTS.find((l) => l.value === investmentsLayout)
  const creditCardsLayout = settings.creditCardsLayout || DEFAULT_SETTINGS.creditCardsLayout
  const activeCreditCards = CREDIT_CARDS_LAYOUTS.find((l) => l.value === creditCardsLayout)
  return (
    <div className="sm-tab-content">
      <SmSectionHead title="Income Layout" hint="// how the Income tab displays your salary" />
      <SmField label="Layout" hint={activeIncome?.hint}>
        <SmSegmented
          value={incomeLayout} onChange={(v) => update({ incomeLayout: v })}
          options={INCOME_LAYOUTS.map((l) => ({ value: l.value, label: l.label }))}
        />
      </SmField>

      <SmSectionHead title="Expenses Layout" hint="// how the Expenses tab displays your spending" />
      <SmField label="Layout" hint={activeExpenses?.hint}>
        <SmSegmented
          value={expensesLayout} onChange={(v) => update({ expensesLayout: v })}
          options={EXPENSES_LAYOUTS.map((l) => ({ value: l.value, label: l.label }))}
        />
      </SmField>

      <SmSectionHead title="Investments Layout" hint="// how the Investments tab displays your savings" />
      <SmField label="Layout" hint={activeInvestments?.hint}>
        <SmSegmented
          value={investmentsLayout} onChange={(v) => update({ investmentsLayout: v })}
          options={INVESTMENTS_LAYOUTS.map((l) => ({ value: l.value, label: l.label }))}
        />
      </SmField>

      <SmSectionHead title="Credit Cards Layout" hint="// how the Credit Cards tab displays your transactions" />
      <SmField label="Layout" hint={activeCreditCards?.hint}>
        <SmSegmented
          value={creditCardsLayout} onChange={(v) => update({ creditCardsLayout: v })}
          options={CREDIT_CARDS_LAYOUTS.map((l) => ({ value: l.value, label: l.label }))}
        />
      </SmField>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  ACCOUNT TAB
// ════════════════════════════════════════════════════════════════════
function AccountTab({ uid, onClose }) {
  const user = auth.currentUser
  const [resetSent, setResetSent] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleResetPassword() {
    await sendPasswordResetEmail(auth, user.email)
    setResetSent(true)
  }

  async function handleDeleteAccount(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, password)
      await reauthenticateWithCredential(user, credential)

      // Identity confirmed — erase every collection under this user, then the
      // auth account itself. Firestore rules require auth.uid to still match,
      // so data must go first. Local cache goes too, or a reload would just
      // treat it as an unsynced device and try to push it all back.
      await clearAllCloudData(uid)
      clearLocalData(uid)
      await deleteUser(user)
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
      setBusy(false)
    }
  }

  return (
    <div className="sm-tab-content">
      <SmSectionHead title="Account" hint="// signed in as" />
      <SmField label={user?.email || '—'} hint="Your account email — contact support to change it." />

      <SmSectionHead title="Password" hint="// reset via email link" />
      <SmField
        label="Send a password reset link"
        hint={resetSent ? 'Check your inbox for a reset link.' : 'Emails a reset link to your account address.'}
      >
        <button className="cb-btn-ghost" onClick={handleResetPassword} disabled={resetSent}>
          {resetSent ? 'SENT' : 'SEND RESET EMAIL'}
        </button>
      </SmField>

      <SmSectionHead title="Account" hint="// danger zone" />
      {!confirmDelete ? (
        <button
          type="button" className="sm-delete-trigger"
          onClick={() => { setConfirmDelete(true); setError(''); setPassword('') }}
        >
          <span className="sm-delete-trigger-label">Delete account &amp; all data</span>
          <span className="sm-delete-trigger-hint">Permanently removes your account and every collection under it. This cannot be undone.</span>
        </button>
      ) : (
        <form className="sm-delete-confirm" onSubmit={handleDeleteAccount}>
          <div className="sm-delete-warn">⚠ Confirm your identity</div>
          <div className="sm-delete-body">Enter your password to permanently delete your account and all data.</div>
          <input
            type="password" className="sm-input" placeholder="Your password"
            value={password} disabled={busy} required
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginTop: 10 }}
          />
          {error && (
            <div className="sm-delete-body" style={{ color: '#ef4444', marginTop: 8, marginBottom: 0 }}>⚠ {error}</div>
          )}
          <div className="sm-delete-actions" style={{ marginTop: 10 }}>
            <button
              type="button" className="cb-btn-ghost" disabled={busy}
              onClick={() => { setConfirmDelete(false); setPassword(''); setError('') }}
            >Cancel</button>
            <button type="submit" className="cb-btn-danger" disabled={busy || !password}>
              {busy ? 'DELETING…' : 'DELETE ACCOUNT'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  ABOUT TAB
// ════════════════════════════════════════════════════════════════════
function AboutTab({ pwaUpdate }) {
  const { current, needRefresh, updateServiceWorker, checkForUpdate, checkingUpdate, updateChecked } = pwaUpdate
  const [showHistory, setShowHistory] = useState(false)
  const currentEntry = CHANGELOG.find((e) => e.current) || CHANGELOG[CHANGELOG.length - 1]
  const pastEntries = CHANGELOG.filter((e) => e !== currentEntry).slice().reverse()

  return (
    <div className="sm-tab-content">
      <SmSectionHead title="App" hint="// about" />
      <SmField label="Version"><span className="sm-version-tag">{APP_VERSION}</span></SmField>
      <SmField label="Part of ClaudeBorne" hint="Shares brand and visual language with eLogBook and SuperApp." />

      <SmSectionHead title="App update" hint="// check for new version" />
      <SmField
        label={`Current build: ${current.version}`}
        hint={needRefresh ? 'A new version is ready to install.' : 'You have the latest version.'}
      >
        {needRefresh ? (
          <button className="cb-btn-primary" onClick={() => updateServiceWorker(true)}>UPDATE NOW</button>
        ) : (
          <button className="cb-btn-ghost" onClick={checkForUpdate} disabled={checkingUpdate}>
            {checkingUpdate ? 'CHECKING…' : 'CHECK FOR UPDATES'}
          </button>
        )}
      </SmField>
      {updateChecked && !needRefresh && <div className="sm-hint" style={{ color: 'var(--cb-mint)' }}>✓ Up to date</div>}
      {needRefresh && !checkingUpdate && <div className="sm-hint" style={{ color: 'var(--cb-mint)' }}>New version available</div>}

      <SmSectionHead title="Changelog" hint="// version history" />
      <div className="sm-changelog">
        <article className="sm-cl-entry current">
          <div className="sm-cl-head">
            <span className="sm-cl-v">{currentEntry.v}</span>
            <span className="sm-cl-date">{currentEntry.date}</span>
            <span className="sm-cl-now">// you are here</span>
          </div>
          <h4 className="sm-cl-title">{currentEntry.title}</h4>
          <ul className="sm-cl-notes">
            {currentEntry.notes.map((n, i) => <li key={i}>{renderNote(n)}</li>)}
          </ul>
        </article>

        {pastEntries.length > 0 && (
          <button className="sm-cl-history-toggle" onClick={() => setShowHistory((v) => !v)}>
            <span>{showHistory ? '▲' : '▼'}</span>
            <span>{showHistory ? 'Hide' : 'Show'} previous versions ({pastEntries.length})</span>
          </button>
        )}

        {showHistory && pastEntries.map((e) => (
          <article key={e.v} className="sm-cl-entry">
            <div className="sm-cl-head">
              <span className="sm-cl-v">{e.v}</span>
              <span className="sm-cl-date">{e.date}</span>
            </div>
            <h4 className="sm-cl-title">{e.title}</h4>
            <ul className="sm-cl-notes">
              {e.notes.map((n, i) => <li key={i}>{renderNote(n)}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
