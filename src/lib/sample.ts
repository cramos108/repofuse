import { preItems } from "../domain/checklists"
import { addDays, todayIso } from "../domain/dates"
import type { StateProfile } from "../domain/profiles"
import type { Account, AuditEvent, ChecklistAck, NoticeRecord, Workspace } from "../domain/types"

export interface SampleBundle {
  accounts: Account[]
  notices: NoticeRecord[]
  checks: ChecklistAck[]
  events: AuditEvent[]
}

export function buildSample(workspace: Workspace, profile: StateProfile, now = new Date()): SampleBundle {
  const today = todayIso(now)
  const stamp = now.toISOString()
  const cureDays = profile.preRepoCure === "statutory" ? workspace.armedCureDays : null
  const avery = account({
    id: "sample_avery",
    borrowerName: "Sample Buyer — Avery Quinn",
    accountNumber: "SAMPLE-1001",
    phone: "555-0148",
    address: `100 Example Street, ${workspace.lotCity}, ${workspace.stateCode}`,
    vehicleYear: "2014",
    vehicleMake: "Honda",
    vehicleModel: "Accord",
    vin: "SAMPLEVIN0000001",
    stockNumber: "S-21",
    amountPastDueCents: 48600,
    payoffCents: 812500,
    defaultDate: addDays(today, -20),
    createdAt: stamp,
    updatedAt: stamp,
  })
  const blake = account({
    id: "sample_blake",
    borrowerName: "Sample Buyer — Blake Moreno",
    accountNumber: "SAMPLE-1002",
    phone: "555-0199",
    address: `200 Example Street, ${workspace.lotCity}, ${workspace.stateCode}`,
    vehicleYear: "2012",
    vehicleMake: "Ford",
    vehicleModel: "Fusion",
    vin: "SAMPLEVIN0000002",
    stockNumber: "S-22",
    amountPastDueCents: 91000,
    payoffCents: 540000,
    defaultDate: addDays(today, -50),
    createdAt: stamp,
    updatedAt: stamp,
  })

  const notices: NoticeRecord[] = []
  if (cureDays != null && cureDays > 0) {
    notices.push(
      makeNotice("sample_notice_avery", avery.id, addDays(today, -3), stamp),
      makeNotice("sample_notice_blake", blake.id, addDays(today, -40), stamp),
    )
  }

  const checks: ChecklistAck[] = preItems(profile, workspace).map((item, index) => ({
    id: `sample_check_${index}`,
    accountId: blake.id,
    itemKey: item.key,
    phase: item.phase,
    ackedAt: stamp,
    operatorName: workspace.operatorName || "Sample operator",
    statement: item.statement,
    voided: false,
  }))

  const events: AuditEvent[] = [
    event("sample_event_avery", avery.id, stamp, "Sample file opened for Avery Quinn."),
    event("sample_event_blake", blake.id, stamp, "Sample file opened for Blake Moreno."),
  ]

  return { accounts: [avery, blake], notices, checks, events }
}

function account(partial: Omit<Account, "sample" | "lastCureOn" | "closedAs" | "recoveredAt" | "propertyHoldStartsOn" | "propertyHoldDays" | "storageFacility" | "storageDailyCents" | "storageAsOf" | "unearnedCreditCents" | "dispositionWaitOverride" | "dispositionWaitReason" | "saleProceedsCents" | "saleOn" | "notes">): Account {
  return {
    sample: true,
    lastCureOn: null,
    closedAs: null,
    recoveredAt: null,
    propertyHoldStartsOn: null,
    propertyHoldDays: null,
    storageFacility: "",
    storageDailyCents: 2500,
    storageAsOf: null,
    unearnedCreditCents: 0,
    dispositionWaitOverride: null,
    dispositionWaitReason: "",
    saleProceedsCents: null,
    saleOn: null,
    notes: "Fictional sample. Remove it before you log a real borrower.",
    ...partial,
  }
}

function makeNotice(id: string, accountId: string, sentOn: string, createdAt: string): NoticeRecord {
  return {
    id,
    accountId,
    kind: "right_to_cure",
    method: "certified_mail",
    trackingNumber: "SAMPLE-TRACKING",
    sentOn,
    mailedOutOfState: false,
    notes: "Sample notice. Not mailed.",
    createdAt,
    voided: false,
  }
}

function event(id: string, accountId: string, at: string, summary: string): AuditEvent {
  return { id, accountId, at, kind: "account_opened", summary }
}
