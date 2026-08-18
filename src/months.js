export function currentMonth() { return new Date().toISOString().slice(0, 7) }

export function addMonths(monthStr, n) {
  const [y, m] = monthStr.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthRange(from, to) {
  const months = []
  let cur = from
  let guard = 0
  while (cur <= to && guard++ < 60) {
    months.push(cur)
    cur = addMonths(cur, 1)
  }
  return months
}

export function monthLabel(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short', year: 'numeric' })
}

export const RANGE_MONTHS = { '3M': 3, '6M': 6, '12M': 12 }

// Resolves a range chip ('3M'|'6M'|'12M'|'YTD') to a [from, to] month pair
// ending at the current month.
export function resolveRange(range) {
  const to = currentMonth()
  const from = range === 'YTD' ? `${to.slice(0, 4)}-01` : addMonths(to, -(RANGE_MONTHS[range] - 1))
  return { from, to }
}

// January through the current month, current year — never a future month.
export function currentYearToDate() {
  const to = currentMonth()
  return monthRange(`${to.slice(0, 4)}-01`, to)
}
