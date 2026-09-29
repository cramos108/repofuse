import { FREE_OPEN_ACCOUNT_LIMIT } from "./copy"
import { isOpenAccount } from "./stage"
import type { Account, Tier } from "./types"

export function remainingOpenSlots(accounts: Account[], tier: Tier): number | null {
  if (tier === "pro") return null
  const open = accounts.filter(isOpenAccount).length
  return Math.max(0, FREE_OPEN_ACCOUNT_LIMIT - open)
}

export class AccountLimitError extends Error {
  constructor() {
    super(
      `The Free lot file holds ${FREE_OPEN_ACCOUNT_LIMIT} open accounts. Close a file, or use Pro for a higher limit.`,
    )
    this.name = "AccountLimitError"
  }
}
