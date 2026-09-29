import { describe, expect, it } from "vitest"
import { addDays, calendarDaysBetween, earliestReadyDate, storageDayCount } from "./dates"

describe("dates", () => {
  it("counts the armed window through the following day", () => {
    expect(earliestReadyDate("2026-01-01", 15)).toBe("2026-01-17")
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01")
  })

  it("stays on calendar days across daylight saving", () => {
    expect(calendarDaysBetween("2026-03-07", "2026-03-09")).toBe(2)
  })

  it("counts the recovery date as a storage day", () => {
    expect(storageDayCount("2026-03-01T22:00:00.000Z", "2026-03-01")).toBe(1)
    expect(storageDayCount("2026-03-01T22:00:00.000Z", "2026-03-03")).toBe(3)
  })
})
