import { describe, expect, it } from "vitest"
import { formatMoney, parseDollars, redemptionTotal, saleBalance } from "./money"

describe("money worksheet", () => {
  it("parses dollars into cents without binary float drift", () => {
    expect(parseDollars("")).toBe(0)
    expect(parseDollars("10")).toBe(1000)
    expect(parseDollars("10.2")).toBe(1020)
    expect(parseDollars("$1,234.50")).toBe(123450)
    expect(parseDollars("10.999")).toBeNull()
    expect(parseDollars("abc")).toBeNull()
  })

  it("computes redemption, deficiency, and surplus", () => {
    const base = {
      payoffCents: 100000,
      pastDueCents: 20000,
      expenseCents: 5000,
      storageDays: 10,
      storageDailyCents: 1500,
      unearnedCreditCents: 2000,
      saleProceedsCents: null,
    }
    expect(redemptionTotal(base)).toBe(118000)
    expect(saleBalance({ ...base, saleProceedsCents: 100000 })).toEqual({
      kind: "deficiency",
      cents: 18000,
    })
    expect(saleBalance({ ...base, saleProceedsCents: 130000 })).toEqual({
      kind: "surplus",
      cents: 12000,
    })
    expect(formatMoney(-18000)).toBe("-$180.00")
  })
})
