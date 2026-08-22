// Server-side proxy for Public Gold's 999/916 sell/buy price table — same
// table the source Google Sheet reads via IMPORTHTML(publicgold.com.my, "table", 4).
// Runs server-side because the page has no API and no CORS headers, so the
// browser can't fetch it directly.

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim()
}

function tryParseTable(table) {
  const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) || []
  const result = {}
  for (const row of rows) {
    const cells = (row.match(/<td[\s\S]*?<\/td>/gi) || []).map((c) => stripTags(c))
    if (cells.length < 3) continue
    const purity = parseInt(cells[0], 10)
    const sell = parseFloat(cells[1].replace(/,/g, ''))
    const buy = parseFloat(cells[2].replace(/,/g, ''))
    if ((purity === 999 || purity === 916) && Number.isFinite(sell) && Number.isFinite(buy)) {
      result[purity] = { sell, buy }
    }
  }
  return result[999] && result[916] ? result : null
}

function parseGoldTable(html) {
  // The page repeats several "PG Sell / PG Buy" priced tables (per-gram bars,
  // per-Dinar coins, etc) — only the 999/916-purity one is the price we want,
  // so try every candidate table and keep the first that actually yields
  // both purities, rather than trusting a fixed table index or the first
  // header match.
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || []
  for (const table of tables) {
    if (!/PG Sell/i.test(table) || !/PG Buy/i.test(table)) continue
    const result = tryParseTable(table)
    if (result) return result
  }
  return null
}

export default async function handler(req, res) {
  try {
    const upstream = await fetch('https://publicgold.com.my/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ClaudeBorneLedger/1.0)' },
    })
    if (!upstream.ok) throw new Error(`upstream status ${upstream.status}`)
    const html = await upstream.text()
    const prices = parseGoldTable(html)
    if (!prices) throw new Error('gold price table not found on page')

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({ ...prices, fetchedAt: new Date().toISOString() })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
