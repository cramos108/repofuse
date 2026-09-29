import type { StateProfile } from "./profiles"

export interface CureSettings {
  cureWaived: boolean
  armedCureDays: number | null
  contractualGraceDays: number
}

/**
 * Days the lot has armed. Null means no pre-recovery waiting window.
 * A statutory profile and a contractual grace use the longer of the two.
 */
export function armedCureLength(
  profile: StateProfile,
  settings: CureSettings,
): number | null {
  if (settings.cureWaived) {
    return settings.contractualGraceDays > 0 ? settings.contractualGraceDays : null
  }
  const statutory =
    profile.preRepoCure === "statutory" &&
    settings.armedCureDays != null &&
    settings.armedCureDays > 0
      ? settings.armedCureDays
      : null
  const contractual =
    settings.contractualGraceDays > 0 ? settings.contractualGraceDays : null
  if (statutory == null && contractual == null) return null
  return Math.max(statutory ?? 0, contractual ?? 0)
}

export function cureMisconfigured(
  profile: StateProfile,
  settings: CureSettings,
): boolean {
  return (
    profile.preRepoCure === "statutory" &&
    !settings.cureWaived &&
    (settings.armedCureDays == null || settings.armedCureDays < 1)
  )
}
