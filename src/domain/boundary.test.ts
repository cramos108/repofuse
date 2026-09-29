import { describe, expect, it } from "vitest"
import source from "../lib/supabase.ts?raw"
import { settingsPayload } from "./syncPayload"
import { buildPacketModel } from "./packet"
import { getProfile } from "./profiles"
import type { Account, Workspace } from "./types"

describe("cloud boundary", () => {
  it("sends only dealership name and state", () => {
    expect(
      Object.keys(settingsPayload({ dealershipName: "North Lot", stateCode: "TX" })).sort(),
    ).toEqual(["dealership_name", "state_code"])
  })

  it("keeps borrower tables out of the Supabase client", () => {
    expect(source).toContain('from("licenses")')
    expect(source).toContain('from("workspace_settings")')
    expect(source).not.toMatch(/from\("[a-z_]*(account|notice|borrower|inventory|checklist|photo)/)
    expect(source).not.toMatch(/\bvin\b/i)
  })

  it("prints the on-device promise into the packet", () => {
    const workspace: Workspace = {
      id: "workspace",
      dealershipName: "Example Motors",
      lotCity: "Dallas",
      stateCode: "TX",
      setupComplete: true,
      contractualGraceDays: 0,
      armedCureDays: null,
      armedDispositionWaitDays: 15,
      cureWaived: false,
      cureWaivedReason: "",
      counselConfirmedAt: null,
      counselConfirmedBy: "",
      operatorName: "Casey",
      tier: "free",
      proEmail: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }
    const account: Account = {
      id: "a",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      sample: false,
      borrowerName: "Avery Quinn",
      accountNumber: "1001",
      phone: "",
      address: "",
      vehicleYear: "2014",
      vehicleMake: "Honda",
      vehicleModel: "Accord",
      vin: "SAMPLEVIN0000001",
      stockNumber: "",
      amountPastDueCents: 0,
      payoffCents: 100,
      defaultDate: "2026-01-01",
      lastCureOn: null,
      closedAs: null,
      recoveredAt: null,
      storageFacility: "",
      storageDailyCents: 0,
      storageAsOf: null,
      unearnedCreditCents: 0,
      dispositionWaitOverride: null,
      dispositionWaitReason: "",
      saleProceedsCents: null,
      saleOn: null,
      notes: "",
    }
    const model = buildPacketModel({
      workspace,
      profile: getProfile("TX"),
      account,
      notices: [],
      contacts: [],
      checks: [],
      spots: [],
      inventory: [],
      expenses: [],
      events: [],
      now: new Date(2026, 0, 15, 12, 0, 0),
    })
    expect(model.accountRows.map((row) => row.value)).toContain("Avery Quinn")
    expect(model.privacy).toMatch(/IndexedDB/)
    expect(model.privacy).toMatch(/localStorage/)
    expect(model.freeBanner).toBe(true)
    expect(model.disclaimer).toMatch(/not legal advice/)
  })
})
