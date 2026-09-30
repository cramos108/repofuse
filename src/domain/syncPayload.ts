/** The only workspace fields a Pro browser may send. */
import type { OperatorRole } from "./types"

export interface SettingsPayload {
  dealership_name: string
  state_code: string
  operator_role: OperatorRole
}

export function settingsPayload(input: {
  dealershipName: string
  stateCode: string
  operatorRole?: OperatorRole | null
}): SettingsPayload {
  return {
    dealership_name: input.dealershipName,
    state_code: input.stateCode,
    operator_role: input.operatorRole === "field" ? "field" : "collections",
  }
}
