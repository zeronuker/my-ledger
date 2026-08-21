// Pilot salary calculation engine — reproduces the SALARY 2026 Google Sheet's
// earnings/allowance formulas exactly. PCB (income tax) uses the sheet's own
// month-independent approach, refined with the official truncation and
// round-up-to-5-cents rounding rules from LHDN's spec (see computePcb below
// for why the fully cumulative year-to-date formula isn't used here).
//
// Source: https://www.hasil.gov.my/wp-content/uploads/spesifikasi-kaedah-pengiraan-berkomputer-pcb-2026.pdf

export const BASIC_SALARY = 16400
const MEAL_RATE_LOW = 315   // per flight hour, if hours < 80 this month
const MEAL_RATE_HIGH = 350  // per flight hour, if hours >= 80 this month
const NIGHTSTOP_RATES = { dom: 50, intl1: 120, intl2: 180, intl3: 250 }
const PERFORMANCE_RATE = 120 // per sector flown

const EPF_EMPLOYEE_RATE = 0.11
const EPF_EMPLOYER_RATE = 0.12
const EPF_RELIEF_CAP = 4000 // total EPF relief allowed per year, per LHDN spec

const SOCSO_EMPLOYEE = 29.75
const SOCSO_EMPLOYER = 104.15
const EIS_EMPLOYEE = 11.90
const EIS_EMPLOYER = 11.90

const SKBBK_EMPLOYEE = 44.65
const SKBBK_START_MONTH = '2026-06' // deduction began this month, ongoing every month since

export const ZAKAT_MONTHLY = 500

// Tax reliefs — Category 3 (married, spouse working/divorced/widowed): spouse
// relief is 0, self relief RM9,000, RM2,000 per qualifying child.
const RELIEF_INDIVIDUAL = 9000
const RELIEF_SPOUSE = 0
const RELIEF_PER_CHILD = 2000
const QUALIFYING_CHILDREN = 2
const TOTAL_RELIEF = RELIEF_INDIVIDUAL + RELIEF_SPOUSE + QUALIFYING_CHILDREN * RELIEF_PER_CHILD

// Table 1 (LHDN spec) — Category 1 & 3 values for B.
const TAX_BRACKETS = [
  { max: 5000,     M: 0,       R: 0,    B: 0 },
  { max: 20000,    M: 5000,    R: 0.01, B: -400 },
  { max: 35000,    M: 20000,   R: 0.03, B: -250 },
  { max: 50000,    M: 35000,   R: 0.06, B: 600 },
  { max: 70000,    M: 50000,   R: 0.11, B: 1500 },
  { max: 100000,   M: 70000,   R: 0.19, B: 3700 },
  { max: 400000,   M: 100000,  R: 0.25, B: 9400 },
  { max: 600000,   M: 400000,  R: 0.26, B: 84400 },
  { max: 2000000,  M: 600000,  R: 0.28, B: 136400 },
  { max: Infinity, M: 2000000, R: 0.30, B: 528400 },
]
function bracketFor(P) {
  return TAX_BRACKETS.find((b) => P <= b.max)
}

// Rule 1 of the spec's Terms & Conditions: every intermediate figure is
// truncated (not rounded) to 2 decimal places.
function trunc2(n) {
  return Math.trunc((n + 1e-9) * 100) / 100
}

// Rule 2: the final MTD amount is rounded UP to the nearest 5 cents (never
// down, and never to the nearest — 287.02 -> 287.05, 152.06 -> 152.10).
function roundUpTo5Cents(n) {
  const cents = Math.round(n * 100)
  return (Math.ceil(cents / 5) * 5) / 100
}

function roundUpToInt(n) {
  return Math.ceil(n - 1e-9)
}

// One month's raw pilot inputs — flat fields (not a nested nightstop object)
// so each field can be edited independently via a simple shallow merge.
// { month: 'YYYY-MM', hours, sectors, nightstopDom, nightstopIntl1, nightstopIntl2, nightstopIntl3, bonus, adjustment }

function earningsFor(input) {
  const meal = input.hours < 80 ? input.hours * MEAL_RATE_LOW : input.hours * MEAL_RATE_HIGH
  const nightstop = (input.nightstopDom || 0) * NIGHTSTOP_RATES.dom + (input.nightstopIntl1 || 0) * NIGHTSTOP_RATES.intl1
    + (input.nightstopIntl2 || 0) * NIGHTSTOP_RATES.intl2 + (input.nightstopIntl3 || 0) * NIGHTSTOP_RATES.intl3
  const productivity = meal + nightstop
  const performance = input.sectors * PERFORMANCE_RATE
  const bonus = input.bonus || 0
  const gross = BASIC_SALARY + productivity + performance + bonus
  // Only 30% of the combined Meal+Nightstop allowance is taxable; Basic and
  // Performance Allowance are fully taxable. Bonus is taxed separately below.
  const taxableNormal = BASIC_SALARY + productivity * 0.3 + performance
  return { meal, nightstop, productivity, performance, bonus, gross, taxableNormal }
}

// PCB (income tax) for a single month, treating this month's taxable income
// as representative of the whole year (×12) — same approach as the source
// spreadsheet, which cross-checked to within cents of 7 real payslips. LHDN's
// fully cumulative year-to-date formula is more "correct" on paper, but this
// month-independent version is the one actually verified against real pay,
// refined here with the official truncation and round-up-to-5-cents rules
// the sheet didn't apply. Residual drift (a few cents, occasionally more in
// a bonus month) is expected and covered by the manual Adjustment field.
function computePcb(taxableNormal, bonus) {
  const epfReliefFromSalary = Math.min(taxableNormal * EPF_EMPLOYEE_RATE * 12, EPF_RELIEF_CAP)
  const P_salary = trunc2(taxableNormal * 12 - epfReliefFromSalary - TOTAL_RELIEF)
  const bSalary = bracketFor(P_salary)
  const taxSalary = trunc2((P_salary - bSalary.M) * bSalary.R + bSalary.B)
  const mtdSalary = trunc2(taxSalary / 12 - ZAKAT_MONTHLY)

  let bonusTax = 0
  if (bonus > 0) {
    const bonusEpfRelief = Math.min(bonus * EPF_EMPLOYEE_RATE, Math.max(EPF_RELIEF_CAP - epfReliefFromSalary, 0))
    const P_total = trunc2(P_salary + bonus - bonusEpfRelief)
    const bTotal = bracketFor(P_total)
    const taxTotal = trunc2((P_total - bTotal.M) * bTotal.R + bTotal.B)
    bonusTax = trunc2(taxTotal - taxSalary)
  }

  return roundUpTo5Cents(Math.max(mtdSalary + bonusTax, 0))
}

// Computes every derived figure for a year of monthly inputs (any length,
// each independent of the others — no year-to-date state needed).
export function computeYear(inputs) {
  return inputs.map((input) => {
    const e = earningsFor(input)
    const epfEmployee = roundUpToInt(e.gross * EPF_EMPLOYEE_RATE)
    const epfEmployer = roundUpToInt(e.gross * EPF_EMPLOYER_RATE)
    const pcb = computePcb(e.taxableNormal, e.bonus)
    const skbbk = input.month >= SKBBK_START_MONTH ? SKBBK_EMPLOYEE : 0
    const adjustment = input.adjustment || 0
    const totalDeductions = trunc2(epfEmployee + SOCSO_EMPLOYEE + skbbk + EIS_EMPLOYEE + pcb + ZAKAT_MONTHLY + adjustment)
    const net = trunc2(e.gross - totalDeductions)

    return {
      month: input.month,
      hours: input.hours, sectors: input.sectors, bonus: e.bonus,
      basic: BASIC_SALARY, meal: e.meal, nightstopAllowance: e.nightstop,
      productivityAllowance: e.productivity, performanceAllowance: e.performance,
      gross: e.gross, taxableIncome: e.taxableNormal,
      epfEmployee, epfEmployer, socsoEmployee: SOCSO_EMPLOYEE, socsoEmployer: SOCSO_EMPLOYER,
      skbbk, eisEmployee: EIS_EMPLOYEE, eisEmployer: EIS_EMPLOYER,
      pcb, zakat: ZAKAT_MONTHLY, adjustment, totalDeductions, net,
    }
  })
}

// Running year-to-date totals for a computed year (index 0 = Jan, etc).
export function computeYtd(monthResults) {
  const fields = ['basic', 'gross', 'epfEmployee', 'epfEmployer', 'socsoEmployee', 'socsoEmployer', 'eisEmployee', 'eisEmployer', 'pcb', 'net']
  let running = Object.fromEntries(fields.map((f) => [f, 0]))
  return monthResults.map((m) => {
    running = Object.fromEntries(fields.map((f) => [f, trunc2(running[f] + (m[f] || 0))]))
    return { month: m.month, ...running }
  })
}

export function emptyMonthInput(month) {
  return { month, hours: 0, sectors: 0, nightstopDom: 0, nightstopIntl1: 0, nightstopIntl2: 0, nightstopIntl3: 0, bonus: 0, adjustment: 0 }
}
