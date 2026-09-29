/** The only workspace fields a Pro browser may send. */
export interface SettingsPayload {
  dealership_name: string
  state_code: string
}

export function settingsPayload(input: {
  dealershipName: string
  stateCode: string
}): SettingsPayload {
  return {
    dealership_name: input.dealershipName,
    state_code: input.stateCode,
  }
}
