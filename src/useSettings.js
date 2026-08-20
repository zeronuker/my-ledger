import { useLedgerData } from './LedgerDataContext'
import { DEFAULT_SETTINGS } from './theme'

// Single settings doc at users/{uid}/settings/appearance, merged over
// DEFAULT_SETTINGS so new setting keys added later don't need a migration.
export function useSettings(uid) {
  const ctx = useLedgerData()
  const settings = { ...DEFAULT_SETTINGS, ...ctx.settings }

  function update(patch) {
    ctx.updateSettings(patch)
  }

  return { settings, update }
}
