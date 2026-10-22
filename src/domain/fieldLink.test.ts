import { describe, expect, it } from "vitest"
import { accessFor, roleOf } from "./roles"
import {
  buildFieldSnapshot,
  decodeFieldReturn,
  decodeFieldSnapshot,
  encodeFieldReturn,
  encodeFieldSnapshot,
  fieldLinkUrl,
  fieldStatusFor,
  readFieldSnapshotFromLocation,
} from "./fieldLink"
import type { Account, SpotRecord } from "./types"

const account = {
  vehicleYear: "2014",
  vehicleMake: "Honda",
  vehicleModel: "Accord",
  vin: "1HGCM82633A004352",
  stockNumber: "S-21",
  borrowerName: "Avery Quinn",
  phone: "2145550100",
  address: "1 Main St",
  payoffCents: 9400,
  notes: "internal collections log",
} as Pick<Account, "vehicleYear" | "vehicleMake" | "vehicleModel" | "vin" | "stockNumber"> & {
  borrowerName: string
  phone: string
  address: string
  payoffCents: number
  notes: string
}

const spot: SpotRecord = {
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
}

function sampleSnapshot() {
  return buildFieldSnapshot({
    token: "fld_test",
    dealership: "North Lot",
    agency: "Ridge Recovery",
    account,
    spots: [spot],
    status: "assigned",
  })
}

describe("field link", () => {
  it("round-trips a vehicle snapshot without the ledger", () => {
    const snapshot = sampleSnapshot()
    const encoded = JSON.stringify(snapshot)
    expect(Object.keys(snapshot).sort()).toEqual(
      ["agency", "dealership", "make", "model", "photos", "spots", "status", "stock", "token", "v", "vehicle", "vin", "year"].sort(),
    )
    expect(encoded).not.toMatch(/phone|address|payoff|Avery|collections log|borrower|property/i)
    const decoded = decodeFieldSnapshot(encodeFieldSnapshot(snapshot))
    expect(decoded?.vin).toBe(account.vin)
    expect(decoded?.make).toBe("Honda")
    expect(decoded?.model).toBe("Accord")
    expect(decoded?.spots[0]?.place).toBe("Lot C")
    expect(decoded?.spots[0]?.note).toBe("Seen at the curb")
    expect(decoded?.photos).toEqual([])
    expect(decoded && "borrower" in decoded).toBe(false)
    expect(decoded && "property" in decoded).toBe(false)
    expect(decodeFieldSnapshot("not-a-link")).toBeNull()
  })

  it("puts the snapshot in the URL hash so the path does not carry vehicle data", () => {
    const snapshot = sampleSnapshot()
    const url = fieldLinkUrl("https://repofuse.example", snapshot)
    expect(url.startsWith("https://repofuse.example/go/fld_test#")).toBe(true)
    const hash = url.slice(url.indexOf("#") + 1)
    expect(decodeFieldSnapshot(hash)?.vin).toBe(account.vin)
    expect(url.slice(0, url.indexOf("#"))).not.toContain(account.vin)
    expect(readFieldSnapshotFromLocation({ hash: `#${hash}`, pathname: "/go/fld_test" })?.vin).toBe(account.vin)
    expect(readFieldSnapshotFromLocation({ hash: `#${hash}`, pathname: "/go/other-token" })).toBeNull()
  })

  it("drops stuffed ledger fields from a decoded snapshot", () => {
    const stuffed = {
      ...sampleSnapshot(),
      borrower: "Avery Quinn",
      phone: "2145550100",
      notes: "internal collections log",
      property: [{ description: "Car seat", where: "Cage 2", status: "held" }],
      accounts: [{ id: "secret-file" }],
      settings: { apiKey: "not-for-agency" },
    }
    const decoded = decodeFieldSnapshot(encodeFieldSnapshot(stuffed))
    expect(decoded && "borrower" in decoded).toBe(false)
    expect(decoded && "property" in decoded).toBe(false)
    expect(decoded && "accounts" in decoded).toBe(false)
    expect(decoded && "settings" in decoded).toBe(false)
    expect(JSON.stringify(decoded)).not.toMatch(/Avery Quinn|2145550100|Car seat|apiKey|internal collections log/)
  })

  it("embeds vehicle photos in the snapshot", () => {
    const photo = { name: "lot.jpg", dataUrl: "data:image/jpeg;base64,aaaa" }
    const snapshot = buildFieldSnapshot({
      token: "fld_test",
      dealership: "North Lot",
      agency: "Ridge Recovery",
      account,
      spots: [],
      status: "assigned",
      photos: [photo],
    })
    expect(decodeFieldSnapshot(encodeFieldSnapshot(snapshot))?.photos).toEqual([photo])
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
    expect(decodeFieldReturn(code)?.photos).toEqual([])
    expect(decodeFieldReturn("nope")).toBeNull()
  })

  it("keeps condition photos on the update code", () => {
    const photo = { name: "condition.jpg", dataUrl: "data:image/jpeg;base64,aaaa" }
    const code = encodeFieldReturn({
      v: 1,
      token: "fld_test",
      status: "secured",
      at: "2026-03-03T12:00:00.000Z",
      note: "Driver door dent",
      photos: [photo],
    })
    expect(decodeFieldReturn(code)?.photos).toEqual([photo])
    expect(
      decodeFieldReturn(
        encodeFieldReturn({
          v: 1,
          token: "fld_test",
          status: "secured",
          at: "2026-03-03T12:00:00.000Z",
          note: "too many",
          photos: [photo, photo, photo, photo],
        }),
      ),
    ).toBeNull()
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
