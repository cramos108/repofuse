import { describe, expect, it } from "vitest"
import { preItems } from "./checklists"
import { getProfile } from "./profiles"
import { computeStage, earliestDispositionOn } from "./stage"
import type { Account, ChecklistAck, NoticeRecord, Workspace } from "./types"

function workspace(partial: Partial<Workspace> = {}): Workspace {
  return {
    id: "workspace",
    dealershipName: "Example Motors",
    lotCity: "Tampa",
    stateCode: "FL",
    setupComplete: true,
    contractualGraceDays: 0,
    armedCureDays: null,
    armedDispositionWaitDays: 15,
    cureWaived: false,
    cureWaivedReason: "",
    counselConfirmedAt: null,
    counselConfirmedBy: "",
    operatorName: "Casey Lot",
    tier: "free",
    proEmail: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  }
}

function account(partial: Partial<Account> = {}): Account {
  return {
    id: "acct_1",
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
    amountPastDueCents: 42000,
    payoffCents: 640000,
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
    ...partial,
  }
}

function notice(partial: Partial<NoticeRecord> = {}): NoticeRecord {
  return {
    id: "n1",
    accountId: "acct_1",
    kind: "right_to_cure",
    method: "certified_mail",
    trackingNumber: "9400111899562537861234",
    sentOn: "2026-01-01",
    mailedOutOfState: false,
    notes: "",
    createdAt: "2026-01-01T12:00:00.000Z",
    voided: false,
    ...partial,
  }
}

function ackAll(ws: Workspace, stateCode: string): ChecklistAck[] {
  const profile = getProfile(stateCode)
  return preItems(profile, ws).map((item, index) => ({
    id: `c${index}`,
    accountId: "acct_1",
    itemKey: item.key,
    phase: item.phase,
    ackedAt: "2026-02-01T00:00:00.000Z",
    operatorName: "Casey",
    statement: item.statement,
    voided: false,
  }))
}

describe("computeStage", () => {
  it("keeps a Florida file off Ready until every guardrail is acknowledged", () => {
    const ws = workspace()
    const result = computeStage({
      account: account(),
      profile: getProfile("FL"),
      workspace: ws,
      notices: [],
      checks: [],
      now: new Date(2026, 0, 20),
    })
    expect(result.stage).toBe("guardrails_open")
    expect(result.label).toBe("Guardrails open")
    expect(result.blockers).toContain("No secured or enclosed area")
  })

  it("marks Florida Ready when the guardrails are acknowledged and no cure is armed", () => {
    const ws = workspace()
    const result = computeStage({
      account: account(),
      profile: getProfile("FL"),
      workspace: ws,
      notices: [],
      checks: ackAll(ws, "FL"),
      now: new Date(2026, 0, 20),
    })
    expect(result.stage).toBe("ready_for_recovery")
  })

  it("holds a Colorado file in the cure window", () => {
    const ws = workspace({ stateCode: "CO", armedCureDays: 20 })
    const result = computeStage({
      account: account(),
      profile: getProfile("CO"),
      workspace: ws,
      notices: [notice()],
      checks: ackAll(ws, "CO"),
      now: new Date(2026, 0, 10),
    })
    expect(result.stage).toBe("cure_active")
    expect(result.earliestReadyOn).toBe("2026-01-22")
    expect(result.daysRemaining).toBe(12)
  })

  it("opens Colorado guardrails only after the armed window", () => {
    const ws = workspace({ stateCode: "CO", armedCureDays: 20 })
    const waiting = computeStage({
      account: account(),
      profile: getProfile("CO"),
      workspace: ws,
      notices: [notice()],
      checks: [],
      now: new Date(2026, 0, 25),
    })
    expect(waiting.stage).toBe("guardrails_open")
    expect(waiting.label).toBe("Notice sent")

    const ready = computeStage({
      account: account(),
      profile: getProfile("CO"),
      workspace: ws,
      notices: [notice()],
      checks: ackAll(ws, "CO"),
      now: new Date(2026, 0, 25),
    })
    expect(ready.stage).toBe("ready_for_recovery")
  })

  it("asks for a new notice after a logged cure", () => {
    const ws = workspace({ stateCode: "CO", armedCureDays: 20 })
    const result = computeStage({
      account: account({ lastCureOn: "2026-01-20" }),
      profile: getProfile("CO"),
      workspace: ws,
      notices: [notice({ sentOn: "2026-01-01" })],
      checks: ackAll(ws, "CO"),
      now: new Date(2026, 1, 1),
    })
    expect(result.stage).toBe("notice_due")
  })

  it("ignores a voided notice and a future notice date", () => {
    const ws = workspace({ stateCode: "IA", armedCureDays: 20 })
    const voided = computeStage({
      account: account(),
      profile: getProfile("IA"),
      workspace: ws,
      notices: [notice({ voided: true })],
      checks: [],
      now: new Date(2026, 2, 1),
    })
    expect(voided.stage).toBe("notice_due")

    const future = computeStage({
      account: account(),
      profile: getProfile("IA"),
      workspace: ws,
      notices: [notice({ sentOn: "2026-04-01" })],
      checks: [],
      now: new Date(2026, 2, 1),
    })
    expect(future.blockers).toContain("The notice date is in the future.")
  })

  it("lets a recorded waiver skip the statutory window", () => {
    const ws = workspace({
      stateCode: "CO",
      armedCureDays: 20,
      cureWaived: true,
      cureWaivedReason: "Counsel says this contract is outside the cure statute.",
    })
    const result = computeStage({
      account: account(),
      profile: getProfile("CO"),
      workspace: ws,
      notices: [],
      checks: ackAll(ws, "CO"),
      now: new Date(2026, 0, 20),
    })
    expect(result.stage).toBe("ready_for_recovery")
  })

  it("requires the Indiana sheriff item", () => {
    const ws = workspace({ stateCode: "IN" })
    const checks = ackAll(ws, "IN").map((check) =>
      check.itemKey === "sheriff_notice" ? { ...check, voided: true } : check,
    )
    const result = computeStage({
      account: account(),
      profile: getProfile("IN"),
      workspace: ws,
      notices: [],
      checks,
      now: new Date(2026, 0, 20),
    })
    expect(result.stage).toBe("guardrails_open")
    expect(result.blockers).toContain("Sheriff notice recorded")
  })

  it("uses 20 days for a California notice mailed outside the state", () => {
    const sent = "2026-01-01"
    const inState = earliestDispositionOn({
      profile: getProfile("CA"),
      waitDays: 15,
      notices: [notice({ kind: "intent_to_dispose", sentOn: sent })],
    })
    const outState = earliestDispositionOn({
      profile: getProfile("CA"),
      waitDays: 15,
      notices: [
        notice({ kind: "intent_to_dispose", sentOn: sent, mailedOutOfState: true }),
      ],
    })
    expect(inState).toBe("2026-01-17")
    expect(outState).toBe("2026-01-22")
  })

  it("warns when recovery was logged during an open cure window", () => {
    const ws = workspace({ stateCode: "WI", armedCureDays: 15 })
    const result = computeStage({
      account: account({ recoveredAt: "2026-01-05T15:00:00.000Z" }),
      profile: getProfile("WI"),
      workspace: ws,
      notices: [notice({ sentOn: "2026-01-02" })],
      checks: ackAll(ws, "WI"),
      now: new Date(2026, 0, 20),
    })
    expect(result.stage).toBe("recovered")
    expect(result.warnings[0]).toMatch(/before the armed cure window/)
  })
})
