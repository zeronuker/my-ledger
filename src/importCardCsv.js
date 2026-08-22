// Parses the "CREDIT CARD 2026" Google Sheet export into plain transaction
// rows. Pure/no-React so it can run under node for a sanity check against
// the real export before ever touching the app's data.

// Minimal CSV line splitter — handles quoted fields containing commas
// (e.g. "MYR 2,850.00") and escaped "" quotes, which is all this export uses.
function parseCsvLine(line) {
  const fields = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = false }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  fields.push(cur)
  return fields
}

function parseMoney(s) {
  if (!s) return 0
  const n = parseFloat(s.replace(/MYR/i, '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

// "DD/MM/YYYY" -> "YYYY-MM-DD"
function parseDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s || '').trim())
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

const HEADER_ROW = 'Month,,#,Date,Description,Credit Card,Category,Amount,Paid ,Balance,Run Balance'

// Returns { transactions, cardNames, categoryNames } — transactions reference
// cards/categories by name only; resolving those to ids happens in the app
// once any missing cards/categories are created.
export function parseCardCsv(text) {
  const lines = text.split(/\r?\n/)
  const headerIdx = lines.findIndex((l) => l.replace(/\r$/, '') === HEADER_ROW)
  if (headerIdx === -1) throw new Error('Could not find the transaction header row in this CSV')

  const transactions = []
  const cardNames = new Set()
  const categoryNames = new Set()

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const cols = parseCsvLine(line)
    // [Month, '', #, Date, Description, Credit Card, Category, Amount, Paid, Balance, Run Balance]
    const date = parseDate(cols[3])
    const description = (cols[4] || '').trim()
    const cardName = (cols[5] || '').trim()
    const categoryName = (cols[6] || '').trim()
    if (!date || !description || !cardName) continue // divider/blank rows

    const amount = parseMoney(cols[7])
    const paid = parseMoney(cols[8])

    cardNames.add(cardName)
    if (categoryName) categoryNames.add(categoryName)

    transactions.push({
      date, description, cardName, categoryName: categoryName || null, amount,
      payments: paid > 0 ? [{ date, amount: Math.min(paid, amount) }] : [],
    })
  }

  return { transactions, cardNames: [...cardNames], categoryNames: [...categoryNames] }
}

export function demo(csvText) {
  const { transactions, cardNames, categoryNames } = parseCardCsv(csvText)
  console.log('transactions:', transactions.length)
  console.log('cards:', cardNames)
  console.log('categories:', categoryNames)
  const byCard = {}
  for (const t of transactions) byCard[t.cardName] = (byCard[t.cardName] || 0) + t.amount
  console.log('total amount per card:', byCard)
  const totalAmount = transactions.reduce((s, t) => s + t.amount, 0)
  console.log('grand total amount:', totalAmount.toFixed(2))
  return { transactions, cardNames, categoryNames }
}
