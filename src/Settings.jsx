import { useState } from 'react'
import {
  EmailAuthProvider, reauthenticateWithCredential, deleteUser,
  sendPasswordResetEmail, signOut,
} from 'firebase/auth'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { ACCENT_PRESETS, FONT_CHOICES } from './theme'
import { useCategories } from './useCategories'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_CARD_CATEGORIES } from './categories'

const TABS = ['Appearance', 'Preferences', 'Account', 'About']
const APP_VERSION = '0.1.0'

export default function Settings({ uid, settings, update, onClose }) {
  const [tab, setTab] = useState('Appearance')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Settings</h3>
          <button className="modal-x" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-tabs">
          {TABS.map((t) => (
            <button key={t} className={`mtab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="modal-body">
          {tab === 'Appearance' && <AppearanceTab settings={settings} update={update} />}
          {tab === 'Preferences' && <PreferencesTab uid={uid} />}
          {tab === 'Account' && <AccountTab uid={uid} onClose={onClose} />}
          {tab === 'About' && <AboutTab />}
        </div>
      </div>
    </div>
  )
}

function AppearanceTab({ settings, update }) {
  return (
    <>
      <div className="setting-row">
        <span className="setting-label">Theme</span>
        <div className="seg">
          {['dark', 'light'].map((v) => (
            <button key={v} className={settings.theme === v ? 'on' : ''} onClick={() => update({ theme: v })}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">Accent</span>
        <div className="swatches">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`swatch${settings.accentPreset === p.id ? ' on' : ''}`}
              style={{ background: p.colors.length > 1 ? `linear-gradient(135deg, ${p.colors.join(', ')})` : p.single }}
              onClick={() => update({ accentPreset: p.id })}
              aria-label={p.name}
            />
          ))}
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">Font</span>
        <div className="chips">
          {FONT_CHOICES.map((f) => (
            <button key={f.id} className={`chip${settings.fontFamily === f.id ? ' on' : ''}`} onClick={() => update({ fontFamily: f.id })}>
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">Font size — {settings.fontSize}px</span>
        <input type="range" min="12" max="18" value={settings.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })} />
      </div>

      <div className="setting-row">
        <span className="setting-label">Density</span>
        <div className="seg">
          {['compact', 'default', 'relaxed'].map((v) => (
            <button key={v} className={settings.density === v ? 'on' : ''} onClick={() => update({ density: v })}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function PreferencesTab({ uid }) {
  const expense = useCategories(uid, 'expenseCategories', DEFAULT_EXPENSE_CATEGORIES)
  const card = useCategories(uid, 'cardCategories', DEFAULT_CARD_CATEGORIES)

  return (
    <>
      <CategoryList
        label="Expense categories"
        hint="Grouped in the Expenses grid (e.g. Loans, Utilities & Fees)."
        items={expense.items} onAdd={expense.add} onRemove={expense.remove}
        withGroup
      />
      <CategoryList
        label="Credit card categories"
        items={card.items} onAdd={card.add} onRemove={card.remove}
      />
    </>
  )
}

function CategoryList({ label, hint, items, onAdd, onRemove, withGroup }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(withGroup ? { name: name.trim(), group: group.trim() || null } : { name: name.trim() })
    setName('')
    setGroup('')
  }

  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <div className="cat-list">
        {items.map((c) => (
          <span key={c.id} className="cat-pill">
            {c.name}{withGroup && c.group ? <span className="cat-pill-group"> · {c.group}</span> : ''}
            <span className="cat-pill-x" onClick={() => onRemove(c.id)}>×</span>
          </span>
        ))}
        {items.length === 0 && <span className="hint">None yet.</span>}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 6 }}>
        <input placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
        {withGroup && (
          <input placeholder="Group (optional)" value={group} onChange={(e) => setGroup(e.target.value)} style={{ flex: 1 }} />
        )}
        <button type="submit" className="cb-btn">ADD</button>
      </form>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

function AccountTab({ uid, onClose }) {
  const user = auth.currentUser
  const [resetSent, setResetSent] = useState(false)
  const [confirming, setConfirming] = useState(false)
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
      // so data must go first.
      const collections = ['expenses', 'cardTransactions', 'cards', 'income', 'settings']
      for (const name of collections) {
        const snap = await getDocs(collection(db, 'users', uid, name))
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
      }
      await deleteUser(user)
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
      setBusy(false)
    }
  }

  return (
    <>
      <div className="setting-row">
        <span className="setting-label">Signed in as</span>
        <span style={{ color: 'var(--cb-ink)' }}>{user?.email}</span>
      </div>

      <div className="setting-row">
        <span className="setting-label">Password</span>
        <button className="cb-btn" onClick={handleResetPassword}>SEND RESET EMAIL</button>
        {resetSent && <span className="hint">Check your inbox for a reset link.</span>}
      </div>

      <div className="setting-row">
        <button className="cb-btn" onClick={() => { signOut(auth); onClose() }}>SIGN OUT</button>
      </div>

      <div className="setting-row" style={{ borderTop: '1px solid var(--cb-line)', paddingTop: 16 }}>
        <span className="setting-label" style={{ color: '#ff6b6b' }}>Delete account</span>
        {!confirming ? (
          <button className="cb-btn cb-btn--danger-outline" onClick={() => setConfirming(true)}>DELETE MY ACCOUNT</button>
        ) : (
          <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="hint">This permanently erases all your data. Enter your password to confirm.</span>
            <input type="password" placeholder="Password" value={password} required
              onChange={(e) => setPassword(e.target.value)} />
            {error && <span className="hint" style={{ color: '#ff6b6b' }}>{error}</span>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="cb-btn cb-btn--danger-outline" disabled={busy}>CONFIRM DELETE</button>
              <button type="button" className="cb-btn" onClick={() => setConfirming(false)}>CANCEL</button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}

function AboutTab() {
  return (
    <>
      <div className="setting-row">
        <span className="setting-label">Version</span>
        <span className="cb-mono" style={{ color: 'var(--cb-ink)' }}>{APP_VERSION}</span>
      </div>
      <div className="setting-row">
        <span className="setting-label">Part of ClaudeBorne</span>
        <span className="hint">Shares brand and visual language with eLogBook and SuperApp.</span>
      </div>
    </>
  )
}
