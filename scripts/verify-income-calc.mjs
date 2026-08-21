// Regression check for src/incomeCalc.js against real Jan-Jul 2026 payslip
// figures. Run with: node scripts/verify-income-calc.mjs
//
// PCB is a month-independent approximation of LHDN's fully cumulative
// year-to-date formula (see incomeCalc.js comment on computePcb) — expect
// a few cents of drift per month, covered in the app by the Adjustment
// field. Gross/EPF/SOCSO/EIS/Net should always match exactly.
import assert from 'node:assert/strict'
import { computeYear, emptyMonthInput } from '../src/incomeCalc.js'

const REAL = [
  { month: '2026-01', hours: 70.17002, sectors: 23, ns: [1, 1, 2, 0], bonus: 20500, gross: 62293.56, epf: 6853, pcb: 9458.40, net: 45440.51 },
  { month: '2026-02', hours: 54.25002, sectors: 13, ns: [0, 0, 2, 1], bonus: 0,     gross: 35658.76, epf: 3923, pcb: 3663.35, net: 27530.76 },
  { month: '2026-03', hours: 56.42,    sectors: 17, ns: [1, 0, 0, 3], bonus: 0,     gross: 37012.30, epf: 4072, pcb: 3848.80, net: 28549.85 },
  { month: '2026-04', hours: 70.68335, sectors: 21, ns: [0, 2, 0, 2], bonus: 0,     gross: 41925.26, epf: 4612, pcb: 4301.25, net: 32470.36 },
  { month: '2026-05', hours: 62.83002, sectors: 13, ns: [0, 1, 2, 1], bonus: 0,     gross: 38481.46, epf: 4233, pcb: 3874.95, net: 29831.86 },
  { month: '2026-06', hours: 65.67002, sectors: 24, ns: [0, 1, 1, 0], bonus: 0,     gross: 40266.06, epf: 4430, pcb: 4239.75, net: 31010.01 },
  { month: '2026-07', hours: 57.42,    sectors: 14, ns: [2, 0, 1, 2], bonus: 0,     gross: 36947.30, epf: 4065, pcb: 3780.85, net: 28515.15 },
]

const inputs = []
for (let m = 1; m <= 12; m++) {
  const key = `2026-${String(m).padStart(2, '0')}`
  const real = REAL.find((r) => r.month === key)
  if (real) {
    inputs.push({
      month: key, hours: real.hours, sectors: real.sectors,
      nightstopDom: real.ns[0], nightstopIntl1: real.ns[1], nightstopIntl2: real.ns[2], nightstopIntl3: real.ns[3],
      bonus: real.bonus, adjustment: 0,
    })
  } else {
    inputs.push(emptyMonthInput(key))
  }
}

const results = computeYear(inputs)

let allPass = true
console.log('month     | field   |   computed |       real |    diff')
console.log('----------|---------|------------|------------|--------')
for (const real of REAL) {
  const r = results.find((x) => x.month === real.month)
  for (const [field, realVal, tolerance] of [
    ['gross', real.gross, 0.005], ['epf', real.epf, 0.005], ['pcb', real.pcb, 0.15], ['net', real.net, 0.15],
  ]) {
    const computed = field === 'epf' ? r.epfEmployee : field === 'gross' ? r.gross : field === 'pcb' ? r.pcb : r.net
    const diff = +(computed - realVal).toFixed(2)
    const ok = Math.abs(diff) <= tolerance
    if (!ok) allPass = false
    console.log(`${real.month} | ${field.padEnd(7)} | ${computed.toFixed(2).padStart(10)} | ${realVal.toFixed(2).padStart(10)} | ${ok ? 'OK' : 'FAIL ' + diff}`)
  }
}

assert.ok(allPass, 'income calc drifted outside tolerance vs real payslips — see FAILs above')
console.log('\nAll fields within tolerance of real payslips.')
