// Same 10 curated presets as eLogBook's Settings modal.
export const ACCENT_PRESETS = [
  { id: 'gradient', name: 'ClaudeBorne', colors: ['#3FE0C5', '#3B8DFF', '#5B6BFF'], single: '#3FE0C5' },
  { id: 'mint',     name: 'Mint',        colors: ['#3FE0C5'], single: '#3FE0C5' },
  { id: 'blue',     name: 'Blue',        colors: ['#3B8DFF'], single: '#3B8DFF' },
  { id: 'violet',   name: 'Violet',      colors: ['#5B6BFF'], single: '#5B6BFF' },
  { id: 'amber',    name: 'Amber',       colors: ['#FFB37C'], single: '#FFB37C' },
  { id: 'emerald',  name: 'Emerald',     colors: ['#10d983'], single: '#10d983' },
  { id: 'rose',     name: 'Rose',        colors: ['#f43f5e'], single: '#f43f5e' },
  { id: 'cyan',     name: 'Cyan',        colors: ['#06b6d4'], single: '#06b6d4' },
  { id: 'gold',     name: 'Gold',        colors: ['#eab308'], single: '#eab308' },
  { id: 'coral',    name: 'Coral',       colors: ['#f97316'], single: '#f97316' },
]

export const FONT_CHOICES = [
  { id: 'jetbrains', name: 'JetBrains Mono', sample: '0123 ABab', css: "'JetBrains Mono', monospace" },
  { id: 'ibmplex',   name: 'IBM Plex Mono',  sample: '0123 ABab', css: "'IBM Plex Mono', monospace" },
  { id: 'roboto',    name: 'Roboto Mono',    sample: '0123 ABab', css: "'Roboto Mono', monospace" },
  { id: 'space',     name: 'Space Mono',     sample: '0123 ABab', css: "'Space Mono', monospace" },
  { id: 'courier',   name: 'Courier New',    sample: '0123 ABab', css: "'Courier Prime', 'Courier New', monospace" },
]

export const DENSITY_PAD = {
  compact:  '4px 8px',
  default:  '8px 10px',
  relaxed:  '12px 12px',
}

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  accentPreset: 'gradient',
  fontFamily: 'jetbrains',
  fontSize: 14,
  density: 'default',
  incomeLayout: 'grid',
  expensesLayout: 'grid',
}

export const INCOME_LAYOUTS = [
  { value: 'grid', label: 'Grid', hint: 'All months as columns — the default' },
  { value: 'card', label: 'Card', hint: 'One month at a time, stepped with arrows' },
  { value: 'dashboard', label: 'Dashboard', hint: 'This month as stat tiles plus a trend line' },
  { value: 'timeline', label: 'Timeline', hint: 'Every month as a collapsible row' },
]

export const EXPENSES_LAYOUTS = [
  { value: 'grid', label: 'Grid', hint: 'All months as columns — the default' },
  { value: 'month', label: 'Month', hint: 'One month at a time, stat tiles plus category totals' },
]

function resolveAccent(settings) {
  const preset = ACCENT_PRESETS.find((p) => p.id === settings.accentPreset) || ACCENT_PRESETS[0]
  const grad = preset.colors.length > 1
    ? `linear-gradient(135deg, ${preset.colors.join(', ')})`
    : preset.single
  return { accent: preset.single, grad }
}

// Generates the CSS custom-property overrides driven by user Appearance
// settings — same technique as elogbook, so the two apps feel identical.
export function makeThemeCss(settings = DEFAULT_SETTINGS) {
  const isDark = (settings.theme || 'dark') === 'dark'
  const fontSize = Math.min(18, Math.max(12, Number(settings.fontSize) || 14))
  const fontFamily = (FONT_CHOICES.find((f) => f.id === settings.fontFamily) || FONT_CHOICES[0]).css
  const cellPad = DENSITY_PAD[settings.density] || DENSITY_PAD.default
  const { accent, grad } = resolveAccent(settings)

  const surf = isDark
    ? { s0: '#0a1020', s1: '#141a2e', s2: '#1b2340', s3: '#232c4d',
        ink: '#e8ecf5', ink2: '#b8c0d4', inkD: '#7c87a3',
        line: 'rgba(255,255,255,0.07)', line2: 'rgba(255,255,255,0.12)' }
    : { s0: '#f4f6fb', s1: '#ffffff', s2: '#ebeef7', s3: '#dfe3f0',
        ink: '#0a1020', ink2: '#3a4258', inkD: '#6b7488',
        line: 'rgba(10,16,32,0.08)', line2: 'rgba(10,16,32,0.16)' }

  return `
    :root {
      --cb-surface-0:${surf.s0}; --cb-surface-1:${surf.s1};
      --cb-surface-2:${surf.s2}; --cb-surface-3:${surf.s3};
      --cb-ink:${surf.ink}; --cb-ink-2:${surf.ink2}; --cb-ink-dim:${surf.inkD};
      --cb-line:${surf.line}; --cb-line-2:${surf.line2};
      --cb-mint:${accent}; --cb-grad:${grad};
      --cb-update-accent:${accent};
      --cb-font-body:${fontFamily};
      --cb-font-mono:${fontFamily};
      --fs:${(fontSize / 14).toFixed(4)};
      --cell-pad:${cellPad};
    }
  `
}
