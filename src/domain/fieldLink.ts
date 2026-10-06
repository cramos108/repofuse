import type { Account, FieldAgentStatus, FieldGrant, InventoryItem, SpotRecord } from "./types"

export type { FieldAgentStatus, FieldGrant }

export interface FieldSnapshot {
  v: 1
  token: string
  dealership: string
  agency: string
  borrower: string
  vehicle: string
  vin: string
  stock: string
  spots: { at: string; place: string; latitude: number | null; longitude: number | null; note: string }[]
  property: { description: string; condition: string; where: string; status: string }[]
  status: FieldAgentStatus
}

export interface ConditionPhoto {
  name: string
  dataUrl: string
}

export const MAX_CONDITION_PHOTOS = 3
const MAX_PHOTO_URL = 150_000

export interface FieldReturn {
  v: 1
  token: string
  status: "secured" | "unable"
  at: string
  note: string
  photos?: ConditionPhoto[]
}

function clip(value: string, max = 240): string {
  const text = value.trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function encodeJson(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ""
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index] ?? 0)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function decodeJson(raw: string): unknown {
  const padded = raw.replace(/-/g, "+").replace(/_/g, "/")
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

export function buildFieldSnapshot(input: {
  token: string
  dealership: string
  agency: string
  account: Pick<Account, "borrowerName" | "vehicleYear" | "vehicleMake" | "vehicleModel" | "vin" | "stockNumber">
  spots: SpotRecord[]
  inventory: InventoryItem[]
  status: FieldAgentStatus
}): FieldSnapshot {
  const spots = [...input.spots].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  return {
    v: 1,
    token: input.token,
    dealership: clip(input.dealership, 80),
    agency: clip(input.agency, 80),
    borrower: clip(input.account.borrowerName, 80),
    vehicle: clip(`${input.account.vehicleYear} ${input.account.vehicleMake} ${input.account.vehicleModel}`.trim(), 80),
    vin: clip(input.account.vin, 32),
    stock: clip(input.account.stockNumber, 40),
    spots: spots.map((spot) => ({
      at: spot.at,
      place: clip(spot.placeNote),
      latitude: spot.latitude,
      longitude: spot.longitude,
      note: clip(spot.observation),
    })),
    property: input.inventory.map((item) => ({
      description: clip(item.description),
      condition: clip(item.condition),
      where: clip(item.storageLocation),
      status: item.status,
    })),
    status: input.status,
  }
}

export function encodeFieldSnapshot(snapshot: FieldSnapshot): string {
  return encodeJson(snapshot)
}

export function decodeFieldSnapshot(raw: string): FieldSnapshot | null {
  if (!raw) return null
  try {
    const value = decodeJson(raw)
    if (!value || typeof value !== "object") return null
    const row = value as FieldSnapshot
    if (row.v !== 1 || typeof row.token !== "string" || !Array.isArray(row.spots) || !Array.isArray(row.property)) return null
    if (row.status !== "assigned" && row.status !== "secured" && row.status !== "unable") return null
    return row
  } catch {
    return null
  }
}

export function encodeFieldReturn(value: FieldReturn): string {
  return encodeJson(value)
}

export function conditionPhotosFrom(value: unknown): ConditionPhoto[] | null {
  if (value == null) return []
  if (!Array.isArray(value) || value.length > MAX_CONDITION_PHOTOS) return null
  const photos: ConditionPhoto[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const row = item as { name?: unknown; dataUrl?: unknown }
    if (typeof row.dataUrl !== "string" || !row.dataUrl.startsWith("data:image/jpeg;base64,")) return null
    if (row.dataUrl.length > MAX_PHOTO_URL) return null
    const name = typeof row.name === "string" && row.name.trim() ? row.name.trim().slice(0, 80) : "condition.jpg"
    photos.push({ name, dataUrl: row.dataUrl })
  }
  return photos
}

export function decodeFieldReturn(raw: string): FieldReturn | null {
  const text = raw.trim()
  if (!text) return null
  try {
    const value = decodeJson(text)
    if (!value || typeof value !== "object") return null
    const row = value as FieldReturn
    if (row.v !== 1 || typeof row.token !== "string") return null
    if (row.status !== "secured" && row.status !== "unable") return null
    if (typeof row.at !== "string" || typeof row.note !== "string") return null
    const photos = conditionPhotosFrom("photos" in row ? row.photos : undefined)
    if (!photos) return null
    return {
      v: 1,
      token: row.token,
      status: row.status,
      at: row.at,
      note: row.note.slice(0, 500),
      photos,
    }
  } catch {
    return null
  }
}

export function fieldLinkUrl(origin: string, snapshot: FieldSnapshot): string {
  return `${origin.replace(/\/$/, "")}/go/${snapshot.token}#${encodeFieldSnapshot(snapshot)}`
}

export function fieldStatusFor(grants: FieldGrant[], accountId: string): FieldAgentStatus | null {
  const active = grants.filter((grant) => grant.accountId === accountId && !grant.revokedAt)
  if (active.some((grant) => grant.status === "secured")) return "secured"
  if (active.some((grant) => grant.status === "unable")) return "unable"
  if (active.length > 0) return "assigned"
  return null
}
