// Version scheme: first commit is v1.0. Each subsequent commit is +0.1, up
// to a max of x.10 — the commit after any x.10 rolls to (x+1).0. One entry
// per commit, oldest first below (rendered newest-first in the UI).
export const CHANGELOG = [
  {
    v: 'v1.0', date: 'Aug 2026', title: 'Initial scaffold',
    notes: [
      'NEW: Vite + React + Firebase PWA scaffold with Expenses, Credit Cards, Income, and Dashboard modules, each isolated per-user via auth.uid-scoped Firestore paths.',
      'NEW: ClaudeBorne brand-kit wired in as a submodule — fonts, icons, manifest, and banner tokens shared with sibling apps.',
    ],
  },
  {
    v: 'v1.1', date: 'Aug 2026', title: 'Firebase config guard',
    notes: [
      'FIX: initializeApp/getAuth threw synchronously on an invalid or empty API key, blanking the whole app before .env.local was filled in — now shows a "not configured" screen instead.',
    ],
  },
  {
    v: 'v1.2', date: 'Aug 2026', title: 'Income and card-transaction data fixes',
    notes: [
      "FIX: Dashboard's income query ordered by a field income docs don't have — Firestore silently drops docs missing the order-by field, so income always read back empty.",
      'FIX: Card transactions were never written with a currency, showing "undefined" in dashboard totals.',
    ],
  },
  {
    v: 'v1.3', date: 'Aug 2026', title: 'eLogBook-matched theme system & Settings modal',
    notes: [
      'NEW: Per-user Appearance settings (theme, accent, font, size, density) persisted to Firestore and injected as CSS custom properties.',
      'NEW: Settings modal with Appearance / Account / About tabs.',
      'NEW: Topbar now renders the real shared BrandBanner component.',
      'IMP: Added the 4 missing mono fonts so all 5 font choices in Settings actually work.',
    ],
  },
  {
    v: 'v1.4', date: 'Aug 2026', title: 'Managed categories & Expenses month grid',
    notes: [
      'NEW: Per-user category lists (expenses vs credit cards), auto-seeded with defaults, editable from Settings.',
      'NEW: Expenses category is now a managed select; new Grid view pivots categories × months with a date-range picker.',
    ],
  },
  {
    v: 'v1.5', date: 'Aug 2026', title: 'Credit card partial payments',
    notes: [
      'NEW: Card transactions track a payment history log instead of a boolean paid flag — amount paid, remaining, and status are always derived.',
      'NEW: Credit Cards reworked into a feed — partial payments show a progress bar; fully-paid entries collapse to a single line.',
      "FIX: Dashboard's unpaid card balance now sums remaining amount instead of filtering on a boolean, so partial payments count correctly.",
    ],
  },
  {
    v: 'v1.6', date: 'Aug 2026', title: 'Income statement & dashboard rollups',
    notes: [
      'NEW: Income rebuilt as a monthly statement with configurable Earnings/Deductions — gross, deductions, net, and YTD net are always derived.',
      'FIX: Dashboard\'s "Income this month" now reads the derived net instead of summing flat entries.',
    ],
  },
  {
    v: 'v1.7', date: 'Aug 2026', title: 'Credit Cards: Active/Paid tabs & sorting',
    notes: [
      'NEW: Active/Paid tab split — paid entries move out of the working list entirely.',
      'NEW: Transactions grouped by month, sortable, filterable by date range.',
      'IMP: Shared month-range helpers used by both Expenses and Credit Cards instead of duplicated.',
    ],
  },
  {
    v: 'v1.8', date: 'Aug 2026', title: 'Credit Cards: scale fixes',
    notes: [
      'IMP: Card transaction queries scoped instead of downloading every transaction for every card on every load.',
      'IMP: Months collapse by default; only the newest auto-expands; entries beyond 25 stay behind "show more."',
      'FIX: Auto-expand logic could fire on a transient empty Firestore cache snapshot before real data arrived.',
    ],
  },
  {
    v: 'v1.9', date: 'Aug 2026', title: 'Credit Cards: Paid/Balance placement',
    notes: [
      'IMP: Paid-so-far/balance breakdown moved to a stacked block under the amount, shown for every active entry.',
    ],
  },
  {
    v: 'v1.10', date: 'Aug 2026', title: 'Expenses: spreadsheet-style grid',
    notes: [
      'NEW: One doc per category+month instead of a list of dated transactions — one number per cell.',
      'IMP: Removed the add-entry form; grid cells are directly editable.',
      'FIX: Amount cells silently broke Ctrl+A/Home/End editing — switched input type to fix it.',
    ],
  },
  {
    v: 'v2.0', date: 'Aug 2026', title: 'Expenses: category vs sub-category',
    notes: [
      'NEW: "+ Add category" creates a top-level section with zero sub-categories.',
      'FIX: "Add category"/"Add sub-category" labels were inverted.',
    ],
  },
  {
    v: 'v2.1', date: 'Aug 2026', title: 'Expenses: paid/unpaid dot toggle',
    notes: [
      'NEW: Paid/unpaid dot toggle per cell, whole cell tints mint/amber by paid state.',
      "FIX: Writes now merge so editing an already-paid cell's amount doesn't wipe its paid flag.",
    ],
  },
  {
    v: 'v2.2', date: 'Aug 2026', title: 'Expenses: paid badge matches eLogBook',
    notes: [
      "IMP: Replaced the dot toggle with a native select styled like eLogBook's capacity selector.",
    ],
  },
  {
    v: 'v2.3', date: 'Aug 2026', title: 'Dev server LAN access',
    notes: [
      'IMP: Vite dev server binds to all interfaces for testing from a phone/tablet on the same Wi-Fi.',
    ],
  },
  {
    v: 'v2.4', date: 'Aug 2026', title: 'Expenses: paid badge correction',
    notes: [
      "FIX: Reverted the select-based toggle — dot toggles paid state, eLogBook's tint applies to the amount input directly.",
    ],
  },
  {
    v: 'v2.5', date: 'Aug 2026', title: 'Expenses: checkbox toggle & floating add/arrange modal',
    notes: [
      'NEW: Paid/unpaid dot replaced with a real checkbox.',
      'NEW: Floating "+" button opens an Add/Arrange modal for categories and sub-categories.',
      'NEW: Grid always shows January through the current month, with hide/reveal chips for past months.',
      'IMP: Type-scale pass across category headers, sub-category rows, and column headers.',
      'FIX: One-time category-group backfill could produce duplicate docs from a transient Firestore snapshot — rewritten as a guarded one-shot read.',
    ],
  },
  {
    v: 'v2.6', date: 'Aug 2026', title: 'Expenses: per-category colors',
    notes: [
      'NEW: Each category cycles through a fixed 6-hue palette; sub-categories inherit the hue at lower opacity.',
    ],
  },
  {
    v: 'v2.7', date: 'Aug 2026', title: 'Expenses: sub-category border placement',
    notes: [
      "FIX: Sub-category's colored border now hugs its text instead of sitting flush with the cell edge.",
    ],
  },
  {
    v: 'v2.8', date: 'Aug 2026', title: 'Expenses: year dropdown',
    notes: [
      'IMP: Default view is Jan–Dec of a selected year via dropdown, replacing the fixed chip row.',
    ],
  },
  {
    v: 'v2.9', date: 'Aug 2026', title: 'Expenses: collapsed month stubs',
    notes: [
      'IMP: Hiding a past month collapses its column to a narrow labeled stub instead of removing it.',
    ],
  },
  {
    v: 'v2.10', date: 'Aug 2026', title: 'Rebrand to CirrusStratus',
    notes: [
      'NEW: Wordmark changed to "Cirrus/Stratus," matching sibling apps\' naming convention.',
    ],
  },
  {
    v: 'v3.0', date: 'Aug 2026', title: 'Icon text sizing',
    notes: [
      'FIX: Shrunk the wordmark so "Stratus" no longer touches the bracket border.',
    ],
  },
  {
    v: 'v3.1', date: 'Aug 2026', title: 'Icon bracket sizing',
    notes: [
      'FIX: Enlarged the bracket box 18% for more clearance around the wordmark.',
    ],
  },
  {
    v: 'v3.2', date: 'Aug 2026', title: 'Housekeeping',
    notes: [
      'IMP: Ignore the local .vercel project-link directory.',
    ],
  },
  {
    v: 'v3.3', date: 'Aug 2026', title: 'Offline-first data layer & cloud sync',
    notes: [
      'NEW: Every collection now lives in a local-first store — works fully offline, syncs to Firestore explicitly.',
      'NEW: Account-wide conflict detection — silent pull when only the cloud changed, Keep Local/Keep Cloud prompt when both sides did.',
      'FIX: Delete-account flow was deleting a Firestore collection name that doesn\'t exist and missing three others.',
    ],
  },
  {
    v: 'v3.4', date: 'Aug 2026', title: 'Same-tab account-switch fix',
    notes: [
      "FIX: Switching accounts in the same tab could briefly show the previous user's data before the new account's cache loaded.",
    ],
  },
  {
    v: 'v3.5', date: 'Aug 2026', title: 'PWA update prompt',
    notes: [
      'NEW: Shared update toast (same as eLogBook) with a 15s countdown/auto-update.',
      'NEW: Settings > About gains a "Check for updates" control.',
    ],
  },
  {
    v: 'v3.6', date: 'Aug 2026', title: 'Sync toolbar & conflict modal match eLogBook',
    notes: [
      'IMP: Toolbar sync chip, SYNC button, and OFFLINE badge now match eLogBook exactly.',
      "IMP: Conflict modal matches eLogBook's layout, copy, and timestamp footer.",
    ],
  },
  {
    v: 'v3.7', date: 'Aug 2026', title: 'Auth flow matches eLogBook',
    notes: [
      'NEW: Landing, Login, Sign-up, and Signed-out screens replace the single inline form.',
      'NEW: Sign-out confirmation screen with a 3-second auto-return to landing.',
    ],
  },
  {
    v: 'v3.8', date: 'Aug 2026', title: 'Settings modal matches eLogBook',
    notes: [
      "NEW: Settings modal reskinned with eLogBook's tab bar, section-head, and field styling.",
      'NEW: Appearance tab is now a live-previewed draft with explicit Save / Cancel / Reset tab.',
      'IMP: Added the 3 accent presets and font-sample previews eLogBook has that were missing here.',
    ],
  },
  {
    v: 'v3.9', date: 'Aug 2026', current: true, title: 'Changelog',
    notes: [
      "NEW: Settings > About gains a version-history changelog matching eLogBook's format — current version highlighted, past versions collapsed behind a \"Show previous versions\" toggle.",
    ],
  },
]
