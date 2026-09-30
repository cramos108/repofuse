import type { PropertyHold } from "../domain/propertyHold"

export function PropertyHoldFlag({ hold }: { hold: PropertyHold }) {
  if (hold.flag === "unset") return null
  const warn = hold.flag === "soon" || hold.flag === "expired"
  return (
    <span className={`badge ${warn ? "border-rose-500/50 text-rose-700 dark:border-rose-400/60 dark:text-rose-200" : ""}`}>
      <span aria-hidden className={`status-dot ${warn ? "text-rose-400" : "text-cyan-300"}`} />
      {hold.label}
    </span>
  )
}
