import { useId } from 'react'

// Ported from eLogBook's OnboardingFlow.jsx (LoginIcon/SignupIcon/LogoutIcon)
// — same brand-gradient line icons, generic enough (no aviation imagery) to
// reuse as-is for a ledger app.
const GRAD_STOPS = (
  <>
    <stop offset="0%" stopColor="var(--cb-mint)" />
    <stop offset="55%" stopColor="var(--cb-blue)" />
    <stop offset="100%" stopColor="var(--cb-violet)" />
  </>
)

export function LoginIcon({ size = 40 }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1="6" y1="6" x2="58" y2="58">{GRAD_STOPS}</linearGradient></defs>
      <polygon points="14,6 50,6 58,14 58,50 50,58 14,58 6,50 6,14" fill="none" stroke={`url(#${id})`} strokeWidth="3.2" strokeLinejoin="miter" />
      <polygon points="17,11 47,11 53,17 53,47 47,53 17,53 11,47 11,17" fill="none" stroke={`url(#${id})`} strokeWidth="2" strokeLinejoin="miter" />
      <g transform="rotate(-45 32 32)">
        <polygon points="19.75,43.03 45.48,32 19.75,20.98 19.75,29.55 38.13,32 19.75,34.45" fill={`url(#${id})`} />
      </g>
    </svg>
  )
}

export function SignupIcon({ size = 40 }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1="4" y1="18" x2="56" y2="44">{GRAD_STOPS}</linearGradient></defs>
      <polygon points="8,18 40,18 42,21 44,18 52,18 56,22 56,40 52,44 44,44 42,41 40,44 8,44 4,40 4,22" fill={`url(#${id})`} />
      <line x1="42" y1="21" x2="42" y2="41" stroke="var(--cb-surface-0)" strokeWidth="1.6" strokeDasharray="3,3" />
      <line x1="9" y1="24" x2="30" y2="24" stroke="#000" strokeWidth="2" strokeLinecap="square" />
      <line x1="9" y1="30" x2="34" y2="30" stroke="#000" strokeWidth="2" strokeLinecap="square" />
      <line x1="9" y1="36" x2="26" y2="36" stroke="#000" strokeWidth="2" strokeLinecap="square" />
      <line x1="45" y1="25" x2="53" y2="25" stroke="#000" strokeWidth="1.6" strokeLinecap="square" />
      <line x1="45" y1="29" x2="51" y2="29" stroke="#000" strokeWidth="1.6" strokeLinecap="square" />
      <line x1="45" y1="33" x2="53" y2="33" stroke="#000" strokeWidth="1.6" strokeLinecap="square" />
      <line x1="45" y1="37" x2="49" y2="37" stroke="#000" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  )
}

export function LogoutIcon({ size = 64 }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="66 0 64 64" aria-hidden="true">
      <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1="74" y1="8" x2="122" y2="56">{GRAD_STOPS}</linearGradient></defs>
      <polyline points="95,16 107,16 107,23" fill="none" stroke={`url(#${id})`} strokeWidth="2" strokeLinejoin="miter" />
      <polyline points="107,41 107,48 95,48" fill="none" stroke={`url(#${id})`} strokeWidth="2" strokeLinejoin="miter" />
      <path fillRule="evenodd" d="M92,11 L92,53 Q92,56 89.26,54.78 L76.74,49.22 Q74,48 74,45 L74,19 Q74,16 76.74,14.78 L89.26,9.22 Q92,8 92,11 Z M86,32 A2.2,2.2 0 1 0 86,31.9" fill={`url(#${id})`} />
      <polygon points="95,29 108,29 108,25 118,32 108,39 108,35 95,35" fill={`url(#${id})`} />
    </svg>
  )
}
