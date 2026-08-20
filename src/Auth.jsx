import { useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithCredential, signInWithPopup,
  sendEmailVerification, reload,
} from 'firebase/auth'
import { auth } from './firebase'
import { LoginIcon, SignupIcon, LogoutIcon, EnvelopeIcon } from './authIcons.jsx'
import GoogleSignInButton from './GoogleSignInButton.jsx'
import BrandBanner from '@brand/BrandBanner'

// Landing / Login / Sign up / Signed-out flow, matching eLogBook's
// OnboardingFlow screens. VerifyEmailGate and WelcomeScreen are exported
// separately — App.jsx renders them once a user exists but isn't verified
// yet, since that gate has to live above the point where `user` becomes
// truthy (this component unmounts at that point).

function validatePassword(pwd) {
  const hasLength = pwd.length >= 8
  const hasLetter = /[a-zA-Z]/.test(pwd)
  const hasNumber = /[0-9]/.test(pwd)
  const hasSymbol = /[!@#$%^&*]/.test(pwd)
  return { isValid: hasLength && hasLetter && hasNumber && hasSymbol, hasLength, hasLetter, hasNumber, hasSymbol }
}

function friendlyAuthError(err) {
  const messages = {
    'auth/email-already-in-use': 'That email is already registered — try signing in instead.',
    'auth/invalid-email': "That doesn't look like a valid email address.",
    'auth/weak-password': 'Password is too weak.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts — wait a moment and try again.',
    'auth/network-request-failed': 'Network error — check your connection and try again.',
    'auth/popup-blocked': 'Popup was blocked. Allow popups for this site, or use email/password instead.',
  }
  return messages[err.code] || err.message.replace('Firebase: ', '')
}

// Flags a freshly created email/password account as still needing
// verification, scoped to this device via localStorage rather than a
// Firestore field so the check never depends on network access. Set only
// going forward from here — accounts created before this feature existed
// are never retroactively gated on a verification they were never asked
// to complete.
export const needsVerifyKey = (uid) => `ml_needs_verify_${uid}`

export default function Auth({ justSignedOut, onSignedOutDone }) {
  const [screen, setScreen] = useState(justSignedOut ? 'signedout' : 'landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        localStorage.setItem(needsVerifyKey(cred.user.uid), '1')
        await sendEmailVerification(cred.user)
        // No local screen transition — `user` is now truthy, so App.jsx
        // takes over and renders VerifyEmailGate instead of this component.
      }
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogleCredential(idToken) {
    setError('')
    setBusy(true)
    try {
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogleFallback() {
    setError('')
    setBusy(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(friendlyAuthError(err))
      }
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
          email={email} setEmail={setEmail}
          password={password} setPassword={setPassword}
          confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
          error={error} busy={busy}
          onGoogleCredential={handleGoogleCredential} onGoogleFallback={handleGoogleFallback}
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

function ReqItem({ done, text }) {
  return (
    <div className="auth-pwd-req-item">
      <div className={`auth-pwd-req-check${done ? ' done' : ''}`}>{done ? '✓' : ''}</div>
      <span>{text}</span>
    </div>
  )
}

function LoginOrSignup({
  screen, goTo, submit,
  email, setEmail, password, setPassword, confirmPassword, setConfirmPassword,
  error, busy, onGoogleCredential, onGoogleFallback,
}) {
  const isLogin = screen === 'login'
  const pwdCheck = validatePassword(password)
  const mismatch = !isLogin && confirmPassword && password !== confirmPassword
  const canSubmit = isLogin ? (email && password) : (email && pwdCheck.isValid && password === confirmPassword)

  return (
    <div className="auth-card-wrap">
      <button type="button" className="auth-back" onClick={() => goTo('landing')}>← BACK</button>
      <div className="auth-card">
        <div className="auth-cbar" />
        <div className="auth-cbody">
          <div className="auth-eyebrow">{isLogin ? 'RETURNING USER' : 'NEW USER'}</div>
          <div className="auth-title">{isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}</div>
          <div className="auth-subtitle">
            {isLogin ? 'Sign in to access your ledger from any device.' : 'Free forever. No credit card required.'}
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

            {isLogin ? (
              <div className="auth-field">
                <label>PASSWORD</label>
                <input
                  type="password" placeholder="••••••••" value={password} required
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : (
              <div className="auth-pwd-wrapper">
                <div className="auth-field" style={{ marginBottom: 0 }}>
                  <label>PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password" placeholder="Min. 8 chars, 1 letter, 1 number, 1 symbol"
                      value={password} required
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    {password && (
                      <div className={`auth-pwd-indicator ${pwdCheck.isValid ? 'auth-pwd-valid' : 'auth-pwd-invalid'}`}>
                        {pwdCheck.isValid ? '✓' : '✗'}
                      </div>
                    )}
                  </div>
                </div>
                {password && (
                  <div className="auth-pwd-requirements">
                    <ReqItem done={pwdCheck.hasLength} text="Min. 8 characters" />
                    <ReqItem done={pwdCheck.hasLetter} text="1 letter (a-z, A-Z)" />
                    <ReqItem done={pwdCheck.hasNumber} text="1 number (0-9)" />
                    <ReqItem done={pwdCheck.hasSymbol} text="1 symbol (!@#$%^&*)" />
                  </div>
                )}
              </div>
            )}

            {!isLogin && (
              <div className="auth-field">
                <label>CONFIRM PASSWORD</label>
                <input
                  type="password" placeholder="Repeat" value={confirmPassword} required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <button type="submit" className="auth-btn-primary" disabled={busy || !canSubmit}>
              {busy ? (isLogin ? 'LOGGING IN…' : 'CREATING ACCOUNT…') : (isLogin ? 'LOG IN →' : 'CREATE ACCOUNT →')}
            </button>
            {mismatch && <div className="auth-pwd-mismatch">⚠ Passwords don't match</div>}
          </form>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <div className="auth-divider-text">OR</div>
            <div className="auth-divider-line" />
          </div>
          <GoogleSignInButton onCredential={onGoogleCredential} onFallback={onGoogleFallback} disabled={busy} />

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

// Rendered by App.jsx when a signed-in user still needs to verify their
// email (see needsVerifyKey above). Not part of the Auth component's own
// screen state since it has to be reachable after `user` is already truthy.
export function VerifyEmailGate({ user, onVerified }) {
  const [resendState, setResendState] = useState('idle')
  const [cooldown, setCooldown] = useState(0)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function check() {
    setChecking(true)
    try {
      await reload(user)
      if (user.emailVerified) {
        localStorage.removeItem(needsVerifyKey(user.uid))
        onVerified()
      }
    } finally {
      setChecking(false)
    }
  }

  // Auto-recheck when the tab regains focus — catches the common case of
  // clicking the emailed link in a new tab, then returning to this one.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleResend() {
    if (cooldown > 0 || resendState === 'sending') return
    setResendState('sending')
    try {
      await sendEmailVerification(user)
      setResendState('sent')
      setCooldown(30)
    } catch {
      setResendState('error')
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-cbar" />
          <div className="auth-cbody">
            <div className="auth-eyebrow">ONE MORE STEP</div>
            <div className="auth-title">VERIFY YOUR EMAIL</div>
            <div className="auth-subtitle">We sent a verification link to your email. Click it, then come back here.</div>
            <div className="auth-email-box">
              <div className="auth-email-icon"><EnvelopeIcon size={40} /></div>
              <div className="auth-email-addr">{user.email}</div>
              <div className="auth-email-desc">Click the link in your email to continue. The link expires in 24 hours.</div>
            </div>
            <div className="auth-email-help">
              Didn't get it? Check spam, or{' '}
              {cooldown > 0 ? (
                <span style={{ opacity: 0.6 }}>resend in {cooldown}s</span>
              ) : (
                <span className="auth-email-help-link" onClick={handleResend}>
                  {resendState === 'sending' ? 'resending…' : 'resend verification email'}
                </span>
              )}
              {resendState === 'sent' && <div style={{ color: '#22c55e', marginTop: 6 }}>✓ Verification email sent</div>}
              {resendState === 'error' && <div style={{ color: '#ef4444', marginTop: 6 }}>Could not resend. Try again.</div>}
            </div>
            <button className="auth-btn-primary" onClick={check} disabled={checking}>
              {checking ? 'CHECKING…' : "I'VE VERIFIED — CONTINUE →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Brief confirmation shown once, right after VerifyEmailGate succeeds,
// before dropping into the app.
export function WelcomeScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="auth-screen">
      <div className="auth-done">
        <div className="auth-done-icon" style={{ fontSize: 48, color: 'var(--cb-mint)' }}>✓</div>
        <div className="auth-done-ttl" style={{ color: 'var(--cb-mint)' }}>YOU'RE ALL SET</div>
        <div className="auth-done-sub">Email verified — welcome to your ledger.</div>
      </div>
    </div>
  )
}
