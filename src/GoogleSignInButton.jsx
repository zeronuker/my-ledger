import { useEffect, useRef, useState } from 'react'

// Google Identity Services (GIS) sign-in button — ported from eLogBook's
// GoogleSignInButton.jsx as-is. GIS returns the ID token via a same-context
// callback rather than Firebase's popup/redirect flow, which is what makes
// it work inside installed PWAs (no cross-origin storage dependency).

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Load the GIS client script once; resolve when window.google.accounts.id is ready.
let gisPromise = null
function loadGis() {
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const existing = document.getElementById('gis-client-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const s = document.createElement('script')
    s.id = 'gis-client-script'
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
  return gisPromise
}

// GIS initialize() registers a single global callback. Route it through a
// module-level pointer so whichever button is currently active receives the
// credential (only one auth screen is visible at a time).
let gisInitialized = false
let activeCredentialHandler = null

function ensureGisInit() {
  if (gisInitialized) return
  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (resp) => {
      if (resp?.credential && activeCredentialHandler) activeCredentialHandler(resp.credential)
    },
    auto_select: false,
    itp_support: true,
  })
  gisInitialized = true
}

/**
 * @param onCredential (idToken: string) => void  — called with the Google ID token (JWT)
 * @param onFallback   () => void                 — used only if no Client ID is configured
 * @param active       boolean                    — true when this button's screen is visible
 * @param disabled     boolean
 * @param width        number                     — button width in px (200–400)
 */
export default function GoogleSignInButton({ onCredential, onFallback, active = true, disabled = false, width = 300 }) {
  const ref = useRef(null)
  const [gisFailed, setGisFailed] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID || !active || gisFailed) return
    let cancelled = false
    activeCredentialHandler = onCredential
    loadGis()
      .then(() => {
        if (cancelled || !ref.current) return
        ensureGisInit()
        activeCredentialHandler = onCredential
        ref.current.innerHTML = ''
        window.google.accounts.id.renderButton(ref.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width,
        })
      })
      .catch(() => {
        if (!cancelled) setGisFailed(true)
      })
    return () => { cancelled = true }
  }, [active, width, onCredential, gisFailed])

  // Fallback (no Client ID configured, or GIS script failed to load): render the
  // legacy popup-based button so Google sign-in still works where GIS can't run.
  if (!CLIENT_ID || gisFailed) {
    return (
      <button type="button" className="auth-btn-google" onClick={onFallback} disabled={disabled}>
        <span style={{ fontSize: 14, color: '#e8453c', fontWeight: 700 }}>G</span>CONTINUE WITH GOOGLE
      </button>
    )
  }

  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
}
