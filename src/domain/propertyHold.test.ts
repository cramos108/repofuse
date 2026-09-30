import { describe, expect, it } from "vitest"
import { propertyHold } from "./propertyHold"
import { accessFor } from "./roles"

describe("property hold", () => {
  it("counts calendar days from the start date through the hold length", () => {
    const hold = propertyHold({
      recoveredAt: "2026-01-01T15:00:00.000Z",
      profileHoldDays: 30,
      today: "2026-01-01",
    })
    expect(hold.expiresOn).toBe("2026-01-31")
    expect(hold.daysRemaining).toBe(30)
    expect(hold.flag).toBe("holding")
  })

  it("flags the last three days and the day after expiry", () => {
    const soon = propertyHold({
      recoveredAt: null,
      holdStartsOn: "2026-01-01",
      holdDays: 30,
      profileHoldDays: 10,
      today: "2026-01-31",
    })
    expect(soon.flag).toBe("soon")
    expect(soon.label).toBe("Property hold expiring soon")
    const expired = propertyHold({
      recoveredAt: null,
      holdStartsOn: "2026-01-01",
      profileHoldDays: 30,
      today: "2026-02-01",
    })
    expect(expired.flag).toBe("expired")
  })

  it("stays quiet until a start date and a day count exist", () => {
    expect(propertyHold({ recoveredAt: null, profileHoldDays: 30 }).flag).toBe("unset")
    expect(propertyHold({ recoveredAt: "2026-01-01", profileHoldDays: null }).flag).toBe("unset")
  })
})

describe("roles", () => {
  it("lets internal staff write the lot and reserves teammate oversight for a Pro manager", () => {
    expect(accessFor({ tier: "free", operatorRole: "specialist" })).toMatchObject({ ledger: true, field: true, team: false })
    expect(accessFor({ tier: "pro", operatorRole: "manager" })).toMatchObject({ team: true, oversight: true })
    expect(accessFor({ tier: "pro", operatorRole: "specialist" }, "member")).toMatchObject({ team: false, ledger: true })
  })
})
