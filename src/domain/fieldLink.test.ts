import { describe, expect, it } from "vitest"
import { accessFor, roleOf } from "./roles"
import {
  buildFieldSnapshot,
  decodeFieldReturn,
  decodeFieldSnapshot,
  encodeFieldReturn,
  encodeFieldSnapshot,
  fieldStatusFor,
} from "./fieldLink"
import type { Account, InventoryItem, SpotRecord } from "./types"

const account = {
  borrowerName: "Avery Quinn",
  vehicleYear: "2014",
  vehicleMake: "Honda",
  vehicleModel: "Accord",
  vin: "1HGCM82633A004352",
  stockNumber: "S-21",
} as Pick<Account, "borrowerName" | "vehicleYear" | "vehicleMake" | "vehicleModel" | "vin" | "stockNumber">

describe("field link", () => {
  it("round-trips a vehicle snapshot without the ledger", () => {
    const snapshot = buildFieldSnapshot({
      token: "fld_test",
      dealership: "North Lot",
      agency: "Ridge Recovery",
      account,
      spots: [
        {
          id: "s",
          accountId: "a",
          at: "2026-03-01T15:00:00.000Z",
          latitude: 32.7,
          longitude: -96.8,
          accuracyMeters: 12,
          placeNote: "Lot C",
          observation: "Seen at the curb",
          authorityAttested: true,
          photoIds: [],
        } satisfies SpotRecord,
      ],
      inventory: [
        {
          id: "i",
          accountId: "a",
          description: "Car seat",
          condition: "worn",
          storageLocation: "Cage 2",
          status: "held",
          createdAt: "2026-03-02T00:00:00.000Z",
          releasedAt: null,
          releasedTo: "",
        } satisfies InventoryItem,
      ],
      status: "assigned",
    })
    const encoded = JSON.stringify(snapshot)
    expect(encoded).not.toMatch(/phone|address|payoff|notes/i)
    const decoded = decodeFieldSnapshot(encodeFieldSnapshot(snapshot))
    expect(decoded?.vin).toBe(account.vin)
    expect(decoded?.spots[0]?.place).toBe("Lot C")
    expect(decoded?.property[0]?.description).toBe("Car seat")
    expect(decodeFieldSnapshot("not-a-link")).toBeNull()
  })

  it("round-trips a secured update code", () => {
    const code = encodeFieldReturn({
      v: 1,
      token: "fld_test",
      status: "secured",
      at: "2026-03-03T12:00:00.000Z",
      note: "In the yard",
    })
    expect(decodeFieldReturn(code)?.status).toBe("secured")
    expect(decodeFieldReturn("nope")).toBeNull()
  })

  it("reports a live secured grant ahead of an open assignment", () => {
    expect(
      fieldStatusFor(
        [
          {
            id: "a",
            accountId: "file",
            createdAt: "2026-01-01",
            revokedAt: null,
            agencyLabel: "A",
            status: "assigned",
            statusAt: null,
            statusNote: "",
          },
          {
            id: "b",
            accountId: "file",
            createdAt: "2026-01-02",
            revokedAt: null,
            agencyLabel: "B",
            status: "secured",
            statusAt: "2026-01-03",
            statusNote: "",
          },
        ],
        "file",
      ),
    ).toBe("secured")
  })
})

describe("internal seats", () => {
  it("keeps Free to one collector and gives Pro manager oversight", () => {
    expect(roleOf({ operatorRole: "field" })).toBe("specialist")
    expect(roleOf({ operatorRole: "collections" })).toBe("specialist")
    expect(accessFor({ tier: "free", operatorRole: "specialist" })).toMatchObject({
      ledger: true,
      field: true,
      team: false,
    })
    expect(accessFor({ tier: "pro", operatorRole: "manager" })).toMatchObject({ team: true, oversight: true })
    expect(accessFor({ tier: "pro", operatorRole: "specialist" }, "member")).toMatchObject({
      ledger: true,
      field: true,
      team: false,
    })
  })
})
