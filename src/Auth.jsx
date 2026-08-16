import { useState } from 'react'
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from './firebase'

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signin') {
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
      <div className="auth-card">
        <span className="cb-logo">
          <span className="cb-logo__mark" aria-hidden="true" />
          <span className="cb-logo__wordmark">CLAUDEBORNE</span>
        </span>
        <div className="cb-eyebrow" style={{ marginTop: 8 }}>LEDGER</div>

        <form onSubmit={submit} className="auth-form">
          <input
            type="email" placeholder="Email" value={email} required
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password" placeholder="Password" value={password} required minLength={6}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="cb-btn cb-btn--primary" disabled={busy}>
            {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <button
          type="button" className="auth-switch"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
