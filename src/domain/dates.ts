export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function todayIso(now = new Date()): string {
  return formatIsoDate(now)
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso)
  date.setDate(date.getDate() + days)
  return formatIsoDate(date)
}

export function calendarDaysBetween(startIso: string, endIso: string): number {
  const start = parseIsoDate(startIso)
  const end = parseIsoDate(endIso)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

/** First date the armed window is clear: notice date + N days + 1. */
export function earliestReadyDate(sentOn: string, days: number): string {
  return addDays(sentOn, days + 1)
}

export function formatLongDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatStamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function storageDayCount(recoveredAtIso: string, asOfIso: string): number {
  const start = recoveredAtIso.slice(0, 10)
  const end = asOfIso.slice(0, 10)
  if (end < start) return 0
  return calendarDaysBetween(start, end) + 1
}
