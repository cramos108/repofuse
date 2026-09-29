export function parseDollars(input: string): number | null {
  const cleaned = input.trim().replace(/[$,]/g, "")
  if (!cleaned) return 0
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [dollars, cents = ""] = cleaned.split(".")
  const padded = `${cents}00`.slice(0, 2)
  return Number(dollars) * 100 + Number(padded)
}

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const absolute = Math.abs(cents)
  const dollars = Math.floor(absolute / 100)
  const remainder = String(absolute % 100).padStart(2, "0")
  return `${sign}$${dollars.toLocaleString("en-US")}.${remainder}`
}

export function dollarsInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

export interface WorksheetInput {
  payoffCents: number
  pastDueCents: number
  expenseCents: number
  storageDays: number
  storageDailyCents: number
  unearnedCreditCents: number
  saleProceedsCents: number | null
}

export function storageCents(days: number, dailyCents: number): number {
  return Math.max(0, Math.round(days)) * Math.max(0, dailyCents)
}

/** Payoff + expenses + storage − unearned credit. A worksheet, not a legal quote. */
export function redemptionTotal(input: WorksheetInput): number {
  return (
    input.payoffCents +
    input.expenseCents +
    storageCents(input.storageDays, input.storageDailyCents) -
    input.unearnedCreditCents
  )
}

/** Past due + expenses + storage. Credits are left off this line. */
export function reinstatementTotal(input: WorksheetInput): number {
  return (
    input.pastDueCents +
    input.expenseCents +
    storageCents(input.storageDays, input.storageDailyCents)
  )
}

export interface BalanceResult {
  kind: "deficiency" | "surplus" | "even"
  cents: number
}

export function saleBalance(input: WorksheetInput): BalanceResult | null {
  if (input.saleProceedsCents == null) return null
  const gap = redemptionTotal(input) - input.saleProceedsCents
  if (gap > 0) return { kind: "deficiency", cents: gap }
  if (gap < 0) return { kind: "surplus", cents: Math.abs(gap) }
  return { kind: "even", cents: 0 }
}
