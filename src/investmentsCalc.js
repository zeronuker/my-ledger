// Investments snapshot calc engine — reproduces the household savings Google
// Sheet's totals exactly, with one deliberate fix: the sheet's top "ASNB"
// tile was actually just Amir's own ASB+ASB2+ASM2 total (confirmed against
// the source numbers), duplicating the per-person ASB table below. Here the
// family-wide ASB total takes that tile's place directly, so Household Total
// no longer double-counts Amir's ASB.

export const ASB_PEOPLE = [
  { key: 'amir', label: 'Amir' },
  { key: 'adlina', label: 'Adlina' },
  { key: 'zhariff', label: 'Zhariff' },
  { key: 'asyha', label: 'Asyha' },
]
export const ASB_ACCOUNTS = ['asb', 'asb2', 'asm2']

export function emptySnapshot() {
  return {
    epf1: 0, epf2: 0, epf3: 0, sspn1: 0, sspn2: 0, unitTrust: 0,
    asb: Object.fromEntries(ASB_PEOPLE.map((p) => [p.key, { asb: 0, asb2: 0, asm2: 0 }])),
    goldPrice: { 999: { sell: 0, buy: 0 }, 916: { sell: 0, buy: 0 }, fetchedAt: null, manualOverride: false },
  }
}

function personAsbTotal(person) {
  return (person?.asb || 0) + (person?.asb2 || 0) + (person?.asm2 || 0)
}

export function computeAsbFamilyTotal(asb = {}) {
  return ASB_PEOPLE.reduce((sum, p) => sum + personAsbTotal(asb[p.key]), 0)
}

// Column totals (ASB / ASB2 / ASM2) across all people, for the table footer.
export function computeAsbColumnTotals(asb = {}) {
  const totals = { asb: 0, asb2: 0, asm2: 0 }
  for (const p of ASB_PEOPLE) {
    const row = asb[p.key] || {}
    for (const acc of ASB_ACCOUNTS) totals[acc] += row[acc] || 0
  }
  return totals
}

export function computeGoldItem(item, goldPrice) {
  const weight = item.weightGrams || 0
  const purchasedPrice = weight * (item.pricePerGram || 0)
  const currentPrice = weight * (goldPrice?.[item.purity]?.buy || 0)
  return { ...item, purchasedPrice, currentPrice }
}

// Total row's "Price Per Gram" is a plain average of the per-item price —
// not weighted by weight — matching the source sheet's own SUM/COUNT formula.
export function computeGoldSummary(items, goldPrice) {
  const computed = items.map((it) => computeGoldItem(it, goldPrice))
  const totalWeight = computed.reduce((s, it) => s + (it.weightGrams || 0), 0)
  const totalPurchased = computed.reduce((s, it) => s + it.purchasedPrice, 0)
  const totalCurrent = computed.reduce((s, it) => s + it.currentPrice, 0)
  const avgPricePerGram = computed.length ? computed.reduce((s, it) => s + (it.pricePerGram || 0), 0) / computed.length : 0
  const gainPct = totalPurchased ? ((totalCurrent - totalPurchased) / totalPurchased) * 100 : 0
  return { items: computed, totalWeight, totalPurchased, totalCurrent, avgPricePerGram, gainPct }
}

// Top-level instrument tiles + Household Total. `goldTotal` is the physical
// gold ledger's current value (computeGoldSummary(...).totalCurrent).
export function computeInstrumentTotals(snapshot, goldTotal) {
  const epf1 = snapshot.epf1 || 0, epf2 = snapshot.epf2 || 0, epf3 = snapshot.epf3 || 0
  const sspn1 = snapshot.sspn1 || 0, sspn2 = snapshot.sspn2 || 0
  const unitTrust = snapshot.unitTrust || 0
  const asbFamily = computeAsbFamilyTotal(snapshot.asb)

  const tiles = [
    { key: 'epf1', label: 'EPF 1', value: epf1 },
    { key: 'epf2', label: 'EPF 2', value: epf2 },
    { key: 'epf3', label: 'EPF 3', value: epf3 },
    { key: 'sspn1', label: 'SSPN', value: sspn1 },
    { key: 'sspn2', label: 'SSPN', value: sspn2 },
    { key: 'asbFamily', label: 'ASB (Family)', value: asbFamily },
    { key: 'unitTrust', label: 'Unit Trust', value: unitTrust },
    { key: 'gold', label: 'Gold', value: goldTotal },
  ]
  const householdTotal = tiles.reduce((s, t) => s + t.value, 0)
  return {
    tiles: tiles.map((t) => ({ ...t, pct: householdTotal ? (t.value / householdTotal) * 100 : 0 })),
    householdTotal,
  }
}

// Minimal self-check (no test runner in this repo) — run manually via
// `node -e "import('./src/investmentsCalc.js').then(m=>m.demo())"` if this
// file's math is ever in doubt.
export function demo() {
  const snapshot = {
    epf1: 876366.60, epf2: 94616.59, epf3: 2109.22, sspn1: 4000, sspn2: 4000, unitTrust: 115000,
    asb: {
      amir: { asb: 8217.63, asb2: 2565.08, asm2: 690.41 },
      adlina: { asb: 127117.28, asb2: 3875.42, asm2: 0 },
      zhariff: { asb: 7348.09, asb2: 4088.57, asm2: 0 },
      asyha: { asb: 8306.59, asb2: 0, asm2: 0 },
    },
  }
  const goldPrice = { 999: { sell: 650.00, buy: 591.00 }, 916: { sell: 618.00, buy: 537.00 } }
  const items = [
    { weightGrams: 4.25, purity: 999, pricePerGram: 263.53 },
    { weightGrams: 4.25, purity: 999, pricePerGram: 261.41 },
    { weightGrams: 4.25, purity: 999, pricePerGram: 265.18 },
    { weightGrams: 4.25, purity: 999, pricePerGram: 263.53 },
    { weightGrams: 20.00, purity: 999, pricePerGram: 544.50 },
    { weightGrams: 7.80, purity: 916, pricePerGram: 524.36 },
    { weightGrams: 1.89, purity: 999, pricePerGram: 684.13 },
    { weightGrams: 2.19, purity: 999, pricePerGram: 683.56 },
    { weightGrams: 2.32, purity: 916, pricePerGram: 660.78 },
  ]
  const gold = computeGoldSummary(items, goldPrice)
  console.assert(Math.abs(gold.totalCurrent - 29712.72) < 0.01, 'gold totalCurrent mismatch', gold.totalCurrent)
  // 0.03 off the sheet's flat sum — the sheet rounds each row to 2dp before
  // summing, this sums exact products first. Cosmetic only.
  console.assert(Math.abs(gold.totalPurchased - 23781.00) < 0.05, 'gold totalPurchased mismatch', gold.totalPurchased)
  console.assert(Math.abs(computeAsbFamilyTotal(snapshot.asb) - 162209.07) < 0.01, 'ASB family total mismatch')
  const { householdTotal } = computeInstrumentTotals(snapshot, gold.totalCurrent)
  console.assert(Math.abs(householdTotal - 1288014.20) < 0.01, 'household total mismatch', householdTotal)
  console.log('investmentsCalc demo OK')
}
