import { findItem } from "./checklists"
import { LEGAL_DISCLAIMER, PRIVACY_BODY, PROFILE_REVISION } from "./copy"
import { formatLongDate, formatStamp, storageDayCount, todayIso } from "./dates"
import { CHANNEL_LABEL, METHOD_LABEL, NOTICE_LABEL } from "./labels"
import {
  formatMoney,
  redemptionTotal,
  reinstatementTotal,
  saleBalance,
  storageCents,
  type WorksheetInput,
} from "./money"
import type { StateProfile } from "./profiles"
import { computeStage, earliestDispositionOn } from "./stage"
import type {
  Account,
  ChecklistAck,
  ContactRecord,
  ExpenseLine,
  InventoryItem,
  NoticeRecord,
  SpotRecord,
  Workspace,
  AuditEvent,
} from "./types"

export interface PacketModel {
  title: string
  generatedAt: string
  freeBanner: boolean
  dealership: string
  operator: string
  stateLine: string
  counselLine: string
  waiverLine: string | null
  accountRows: { label: string; value: string }[]
  stageLine: string
  warnings: string[]
  notices: string[]
  contacts: string[]
  checks: string[]
  spots: string[]
  inventory: string[]
  worksheet: { label: string; value: string }[]
  events: string[]
  disclaimer: string
  privacy: string
}

export function buildPacketModel(input: {
  workspace: Workspace
  profile: StateProfile
  account: Account
  notices: NoticeRecord[]
  contacts: ContactRecord[]
  checks: ChecklistAck[]
  spots: SpotRecord[]
  inventory: InventoryItem[]
  expenses: ExpenseLine[]
  events: AuditEvent[]
  now?: Date
}): PacketModel {
  const now = input.now ?? new Date()
  const notices = input.notices.filter((row) => row.accountId === input.account.id)
  const contacts = input.contacts.filter((row) => row.accountId === input.account.id)
  const checks = input.checks.filter((row) => row.accountId === input.account.id)
  const spots = input.spots.filter((row) => row.accountId === input.account.id)
  const inventory = input.inventory.filter((row) => row.accountId === input.account.id)
  const expenses = input.expenses.filter((row) => row.accountId === input.account.id)
  const events = input.events.filter((row) => row.accountId === input.account.id)
  const stage = computeStage({
    account: input.account,
    profile: input.profile,
    workspace: input.workspace,
    notices,
    checks,
    now,
  })
  const worksheet = worksheetInput(input.account, expenses, now)
  const redemption = redemptionTotal(worksheet)
  const balance = saleBalance(worksheet)
  const wait =
    input.account.dispositionWaitOverride ?? input.workspace.armedDispositionWaitDays
  const saleEarliest = earliestDispositionOn({
    profile: input.profile,
    waitDays: wait,
    notices,
  })

  const accountRows = [
    ["Borrower", input.account.borrowerName],
    ["Account", input.account.accountNumber || "—"],
    ["Phone", input.account.phone || "—"],
    ["Address", input.account.address || "—"],
    [
      "Vehicle",
      `${input.account.vehicleYear} ${input.account.vehicleMake} ${input.account.vehicleModel}`.trim(),
    ],
    ["VIN", input.account.vin || "—"],
    ["Stock", input.account.stockNumber || "—"],
    ["Default date", formatLongDate(input.account.defaultDate)],
    ["Amount past due", formatMoney(input.account.amountPastDueCents)],
    ["Payoff worksheet", formatMoney(input.account.payoffCents)],
  ].map(([label, value]) => ({ label, value }))

  const worksheetRows: { label: string; value: string }[] = [
    { label: "Payoff", value: formatMoney(worksheet.payoffCents) },
    { label: "Expenses", value: formatMoney(worksheet.expenseCents) },
    {
      label: "Storage",
      value: `${worksheet.storageDays} days × ${formatMoney(worksheet.storageDailyCents)} = ${formatMoney(storageCents(worksheet.storageDays, worksheet.storageDailyCents))}`,
    },
    { label: "Unearned credit", value: formatMoney(worksheet.unearnedCreditCents) },
    { label: "Redemption worksheet", value: formatMoney(redemption) },
  ]
  if (input.profile.reinstatement !== "none") {
    worksheetRows.push({
      label: "Reinstatement worksheet",
      value: formatMoney(reinstatementTotal(worksheet)),
    })
  }
  worksheetRows.push({
    label: "Earliest disposition date on this worksheet",
    value: saleEarliest ? formatLongDate(saleEarliest) : "Log a notice of intent to dispose",
  })
  if (input.account.dispositionWaitOverride != null) {
    worksheetRows.push({
      label: "Disposition-wait override",
      value: `${input.account.dispositionWaitOverride} days. ${input.account.dispositionWaitReason}`,
    })
  }
  if (balance) {
    worksheetRows.push({
      label: balance.kind === "deficiency" ? "Deficiency worksheet" : balance.kind === "surplus" ? "Surplus worksheet" : "Sale balance",
      value: formatMoney(balance.cents),
    })
  }

  return {
    title: "RepoFuse operational compliance log",
    generatedAt: formatStamp(now.toISOString()),
    freeBanner: input.workspace.tier !== "pro",
    dealership: `${input.workspace.dealershipName} · ${input.workspace.lotCity}`,
    operator: input.workspace.operatorName,
    stateLine: `${input.profile.name} worksheet · revised ${PROFILE_REVISION} · ${input.profile.confidence}`,
    counselLine: input.workspace.counselConfirmedAt
      ? `Counsel confirmation recorded ${formatStamp(input.workspace.counselConfirmedAt)} by ${input.workspace.counselConfirmedBy || "the operator"}.`
      : "Counsel confirmation is not recorded on this device.",
    waiverLine: input.workspace.cureWaived
      ? `Statutory cure window waived on this device. Reason: ${input.workspace.cureWaivedReason}`
      : null,
    accountRows,
    stageLine: stage.label,
    warnings: stage.warnings,
    notices: notices.map(formatNotice),
    contacts: contacts.map(
      (row) => `${formatStamp(row.at)} · ${CHANNEL_LABEL[row.channel]} · ${row.summary}`,
    ),
    checks: checks.map((row) => formatCheck(row, input.profile, input.workspace)),
    spots: spots.map(formatSpot),
    inventory: inventory.map(formatItem),
    worksheet: worksheetRows,
    events: [...events]
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((row) => `${formatStamp(row.at)} · ${row.summary}`),
    disclaimer: LEGAL_DISCLAIMER,
    privacy: PRIVACY_BODY,
  }
}

function formatNotice(notice: NoticeRecord): string {
  const tracking = notice.trackingNumber ? ` · ${notice.trackingNumber}` : ""
  const outside = notice.mailedOutOfState ? " · mailed outside the state" : ""
  const voided = notice.voided ? "VOIDED · " : ""
  return `${voided}${formatLongDate(notice.sentOn)} · ${NOTICE_LABEL[notice.kind]} · ${METHOD_LABEL[notice.method]}${tracking}${outside}${notice.notes ? ` · ${notice.notes}` : ""}`
}

function formatCheck(
  check: ChecklistAck,
  profile: StateProfile,
  workspace: Workspace,
): string {
  const item = findItem(profile, workspace, check.itemKey)
  const title = item?.title ?? check.itemKey
  const voided = check.voided ? "VOIDED · " : ""
  return `${voided}${formatStamp(check.ackedAt)} · ${title} · ${check.operatorName}`
}

function formatSpot(spot: SpotRecord): string {
  const where =
    spot.latitude != null && spot.longitude != null
      ? `${spot.latitude.toFixed(5)}, ${spot.longitude.toFixed(5)}`
      : "location not captured"
  return `${formatStamp(spot.at)} · ${where} · ${spot.placeNote || "no place note"} · ${spot.observation} · photos ${spot.photoIds.length}`
}

function formatItem(item: InventoryItem): string {
  const release =
    item.status === "released"
      ? `released ${item.releasedAt ? formatStamp(item.releasedAt) : ""} to ${item.releasedTo || "unnamed"}`
      : "held"
  return `${item.description} · ${item.condition || "condition not noted"} · ${item.storageLocation || "location not noted"} · ${release}`
}

export function worksheetInput(
  account: Account,
  expenses: ExpenseLine[],
  now = new Date(),
): WorksheetInput {
  const asOf = account.storageAsOf || todayIso(now)
  const days = account.recoveredAt ? storageDayCount(account.recoveredAt, asOf) : 0
  return {
    payoffCents: account.payoffCents,
    pastDueCents: account.amountPastDueCents,
    expenseCents: expenses.reduce((sum, line) => sum + line.amountCents, 0),
    storageDays: days,
    storageDailyCents: account.storageDailyCents,
    unearnedCreditCents: account.unearnedCreditCents,
    saleProceedsCents: account.saleProceedsCents,
  }
}

