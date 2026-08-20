import { useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from './firebase'
import { LoginIcon, SignupIcon, LogoutIcon } from './authIcons.jsx'
import BrandBanner from '@brand/BrandBanner'

// Landing / Login / Sign up / Signed-out flow, matching eLogBook's
// OnboardingFlow screens (same card layout, badges, copy shape, and the
// signed-out door-icon confirmation). Sign up is left deliberately minimal —
// eLogBook's multi-step wizard doesn't apply here; that gets built out later.
export default function Auth({ justSignedOut, onSignedOutDone }) {
  const [screen, setScreen] = useState(justSignedOut ? 'signedout' : 'landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Auto-return to landing a few seconds after a deliberate sign-out.
  useEffect(() => {
    if (screen !== 'signedout') return
    const t = setTimeout(() => {
      onSignedOutDone?.()
      setScreen('landing')
    }, 3000)
    return () => clearTimeout(t)
  }, [screen, onSignedOutDone])

  function goTo(next) {
    setScreen(next)
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (screen === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      {screen === 'landing' && <Landing goTo={goTo} />}
      {(screen === 'login' || screen === 'signup') && (
        <LoginOrSignup
          screen={screen} goTo={goTo} submit={submit}
          email={email} setEmail={setEmail} password={password} setPassword={setPassword}
          error={error} busy={busy}
        />
      )}
      {screen === 'signedout' && <SignedOut />}
    </div>
  )
}

function Landing({ goTo }) {
  return (
    <div className="auth-land">
      <div className="auth-land-logo"><BrandBanner subtitle="LEDGER" /></div>
      <div className="auth-land-ver">eLEDGER V0.1.0 · PERSONAL FINANCE</div>
      <div className="auth-land-tag">
        Your personal expense &amp; income tracker.<br />
        Accessible anywhere. Works offline. Sync on demand.
      </div>
      <div className="auth-badges">
        <span className="auth-badge auth-badge-blue">✓ MULTI-DEVICE SYNC</span>
        <span className="auth-badge auth-badge-green">✓ FREE</span>
        <span className="auth-badge auth-badge-green">✓ OFFLINE-FIRST</span>
      </div>
      <div className="auth-land-btns">
        <div className="auth-lbtn" onClick={() => goTo('login')}>
          <div className="auth-lbtn-icon"><LoginIcon size={36} /></div>
          <div className="auth-lbtn-title">LOG IN</div>
          <div className="auth-lbtn-sub">Access your existing ledger</div>
        </div>
        <div className="auth-lbtn signup" onClick={() => goTo('signup')}>
          <div className="auth-lbtn-icon"><SignupIcon size={36} /></div>
          <div className="auth-lbtn-title">SIGN UP FREE</div>
          <div className="auth-lbtn-sub">Create your personal ledger today</div>
        </div>
      </div>
      <div className="auth-land-legal">
        By continuing you agree to our Terms of Service.<br />
        Your data is stored securely and privately.
      </div>
    </div>
  )
}

function LoginOrSignup({ screen, goTo, submit, email, setEmail, password, setPassword, error, busy }) {
  const isLogin = screen === 'login'
  return (
    <div className="auth-card-wrap">
      <button type="button" className="auth-back" onClick={() => goTo('landing')}>← BACK</button>
      <div className="auth-card">
        <div className="auth-cbar" />
        <div className="auth-cbody">
          <div className="auth-eyebrow">{isLogin ? 'RETURNING USER' : 'NEW USER'}</div>
          <div className="auth-title">{isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}</div>
          <div className="auth-subtitle">
            {isLogin ? 'Sign in to access your ledger from any device.' : 'Set up your personal ledger in a few seconds.'}
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={submit}>
            <div className="auth-field">
              <label>EMAIL ADDRESS</label>
              <input
                type="email" placeholder="your@email.com" value={email} required
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label>PASSWORD</label>
              <input
                type="password" placeholder={isLogin ? '••••••••' : 'At least 6 characters'}
                value={password} required minLength={6}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="auth-btn-primary" disabled={busy}>
              {busy ? (isLogin ? 'LOGGING IN…' : 'CREATING…') : (isLogin ? 'LOG IN →' : 'CREATE ACCOUNT →')}
            </button>
          </form>

          <div className="auth-toggle">
            {isLogin ? (
              <>No account? <span onClick={() => goTo('signup')}>SIGN UP FREE</span></>
            ) : (
              <>Already have an account? <span onClick={() => goTo('login')}>SIGN IN</span></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SignedOut() {
  return (
    <div className="auth-done">
      <div className="auth-done-icon"><LogoutIcon size={64} /></div>
      <div className="auth-done-ttl">YOU'VE BEEN SIGNED OUT</div>
      <div className="auth-done-sub">See you next time.</div>
      <div className="auth-done-note">Returning to login in 3 seconds...</div>
    </div>
  )
}
