import type { OperatorRole, Tier, Workspace } from "./types"

export type { OperatorRole }
export type Seat = "owner" | "member"

/** Legacy field and collections values stay readable. External agencies use a field link, not a seat. */
export function roleOf(workspace: { operatorRole?: string | null }): OperatorRole {
  return workspace.operatorRole === "manager" ? "manager" : "specialist"
}

export function roleLabel(role: OperatorRole | string | null | undefined): string {
  return roleOf({ operatorRole: role }) === "manager" ? "Manager" : "Specialist"
}

export function roleTitle(role: OperatorRole | string | null | undefined): string {
  return roleOf({ operatorRole: role }) === "manager" ? "Collections Manager" : "Collections Specialist"
}

export function accessFor(
  workspace: { operatorRole?: string | null; tier: Tier },
  seat: Seat = "owner",
) {
  const role = roleOf(workspace)
  const pro = workspace.tier === "pro"
  return {
    role,
    multi: pro,
    ledger: true,
    field: true,
    team: pro && seat === "owner" && role === "manager",
    oversight: pro && role === "manager",
  }
}

export function assertAccess(workspace: Workspace, kind: "ledger" | "field", seat: Seat = "owner"): void {
  const access = accessFor(workspace, seat)
  if (kind === "ledger" && !access.ledger) {
    throw new Error("New delinquencies and ledger notes need a signed-in collections seat.")
  }
  if (kind === "field" && !access.field) {
    throw new Error("Recovery logs need a signed-in collections seat. Outside agencies use a field link.")
  }
}
