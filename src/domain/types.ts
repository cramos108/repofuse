export type Tier = "free" | "pro"

export type OperatorRole = "collections" | "field"

export type NoticeKind =
  | "right_to_cure"
  | "intent_to_dispose"
  | "storage"
  | "personal_property"
  | "deficiency_surplus"

export type NoticeMethod = "certified_mail" | "first_class" | "personal" | "other"

export type ContactChannel = "phone" | "text" | "email" | "in_person" | "letter"

export type Stage =
  | "notice_due"
  | "cure_active"
  | "guardrails_open"
  | "ready_for_recovery"
  | "recovered"
  | "redeemed"
  | "disposed"
  | "closed"

export type CheckPhase = "pre_recovery" | "post_recovery"

export interface Workspace {
  id: "workspace"
  dealershipName: string
  lotCity: string
  stateCode: string
  setupComplete: boolean
  contractualGraceDays: number
  armedCureDays: number | null
  armedDispositionWaitDays: number
  cureWaived: boolean
  cureWaivedReason: string
  counselConfirmedAt: string | null
  counselConfirmedBy: string
  operatorName: string
  operatorRole: OperatorRole
  tier: Tier
  proEmail: string | null
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: string
  createdAt: string
  updatedAt: string
  sample: boolean
  borrowerName: string
  accountNumber: string
  phone: string
  address: string
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  vin: string
  stockNumber: string
  amountPastDueCents: number
  payoffCents: number
  defaultDate: string
  lastCureOn: string | null
  closedAs: "redeemed" | "disposed" | "closed" | null
  recoveredAt: string | null
  propertyHoldStartsOn: string | null
  propertyHoldDays: number | null
  storageFacility: string
  storageDailyCents: number
  storageAsOf: string | null
  unearnedCreditCents: number
  dispositionWaitOverride: number | null
  dispositionWaitReason: string
  saleProceedsCents: number | null
  saleOn: string | null
  notes: string
}

export interface AuditEvent {
  id: string
  accountId: string
  at: string
  kind:
    | "account_opened"
    | "account_updated"
    | "notice"
    | "contact"
    | "checklist"
    | "cure_received"
    | "spot"
    | "inventory"
    | "recovery"
    | "worksheet"
    | "disposition"
    | "override"
    | "deleted"
  summary: string
}

export interface NoticeRecord {
  id: string
  accountId: string
  kind: NoticeKind
  method: NoticeMethod
  trackingNumber: string
  sentOn: string
  mailedOutOfState: boolean
  notes: string
  createdAt: string
  voided: boolean
}

export interface ContactRecord {
  id: string
  accountId: string
  at: string
  channel: ContactChannel
  summary: string
}

export interface ChecklistAck {
  id: string
  accountId: string
  itemKey: string
  phase: CheckPhase
  ackedAt: string
  operatorName: string
  statement: string
  voided: boolean
}

export interface SpotRecord {
  id: string
  accountId: string
  at: string
  latitude: number | null
  longitude: number | null
  accuracyMeters: number | null
  placeNote: string
  observation: string
  authorityAttested: boolean
  photoIds: string[]
}

export interface PhotoRecord {
  id: string
  accountId: string
  spotId: string | null
  createdAt: string
  fileName: string
  mime: string
  blob: Blob
}

export interface InventoryItem {
  id: string
  accountId: string
  description: string
  condition: string
  storageLocation: string
  status: "held" | "released"
  createdAt: string
  releasedAt: string | null
  releasedTo: string
}

export interface ExpenseLine {
  id: string
  accountId: string
  label: string
  amountCents: number
}

export interface LotSnapshot {
  format: "repofuse-lot"
  version: 1
  exportedAt: string
  workspace: Workspace
  accounts: Account[]
  notices: NoticeRecord[]
  contacts: ContactRecord[]
  checks: ChecklistAck[]
  spots: SpotRecord[]
  inventory: InventoryItem[]
  expenses: ExpenseLine[]
  events: AuditEvent[]
  photos: PhotoSnapshot[]
}

export interface PhotoSnapshot {
  id: string
  accountId: string
  spotId: string | null
  createdAt: string
  fileName: string
  mime: string
  base64: string
}
