// Seeded once per user the first time each list is empty — editable
// afterward from Settings > Preferences. Mirrors the groupings in the
// user's real EXPENSE 2026 / CREDIT CARD 2026 sheets.
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Rent / Mortgage', group: 'Utilities & Fees' },
  { name: 'Utilities', group: 'Utilities & Fees' },
  { name: 'Insurance', group: 'Utilities & Fees' },
  { name: 'Subscriptions', group: 'Utilities & Fees' },
  { name: 'Loan Payment', group: 'Loans' },
  { name: 'Family Support', group: 'Family & Savings' },
  { name: 'Savings', group: 'Family & Savings' },
  { name: 'Miscellaneous', group: 'Misc Bills' },
]

export const DEFAULT_CARD_CATEGORIES = [
  { name: 'Food' },
  { name: 'Groceries' },
  { name: 'Fuel' },
  { name: 'Shopping' },
  { name: 'Bills' },
  { name: 'Utilities' },
  { name: 'Entertainment' },
]
