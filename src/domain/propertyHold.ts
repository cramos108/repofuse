import { addDays, calendarDaysBetween, todayIso } from "./dates"

export type PropertyHoldFlag = "unset" | "holding" | "soon" | "expired"

export interface PropertyHold {
  startsOn: string | null
  holdDays: number | null
  expiresOn: string | null
  daysRemaining: number | null
  flag: PropertyHoldFlag
  label: string
}

const SOON_DAYS = 3

export function propertyHold(input: {
  recoveredAt: string | null
  holdStartsOn?: string | null
  holdDays?: number | null
  profileHoldDays: number | null
  today?: string
}): PropertyHold {
  const startsOn = input.holdStartsOn || (input.recoveredAt ? input.recoveredAt.slice(0, 10) : null)
  const holdDays = input.holdDays ?? input.profileHoldDays
  if (!startsOn || holdDays == null || holdDays < 1) {
    return { startsOn, holdDays, expiresOn: null, daysRemaining: null, flag: "unset", label: "" }
  }
  const expiresOn = addDays(startsOn, holdDays)
  const daysRemaining = calendarDaysBetween(input.today ?? todayIso(), expiresOn)
  const flag: PropertyHoldFlag = daysRemaining < 0 ? "expired" : daysRemaining <= SOON_DAYS ? "soon" : "holding"
  const label =
    flag === "expired"
      ? "Property hold expired"
      : flag === "soon"
        ? "Property hold expiring soon"
        : `Property hold · ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`
  return { startsOn, holdDays, expiresOn, daysRemaining, flag, label }
}
