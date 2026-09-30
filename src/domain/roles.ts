import type { OperatorRole, Tier, Workspace } from "./types"

export type { OperatorRole }
export type Seat = "owner" | "member"

export function roleOf(workspace: { operatorRole?: OperatorRole | null }): OperatorRole {
  return workspace.operatorRole === "field" ? "field" : "collections"
}

export function roleLabel(role: OperatorRole | null | undefined): string {
  return role === "field" ? "Field" : "Collections"
}

export function roleTitle(role: OperatorRole | null | undefined): string {
  return role === "field" ? "Repo Specialist / Field Agent" : "Collections Manager / Specialist"
}

export function accessFor(
  workspace: { operatorRole?: OperatorRole | null; tier: Tier },
  seat: Seat = "owner",
) {
  const role = roleOf(workspace)
  const pro = workspace.tier === "pro"
  const both = pro && seat === "owner"
  return {
    role,
    multi: pro,
    ledger: both || role === "collections",
    field: both || role === "field",
    team: pro && seat === "owner",
  }
}

export function assertAccess(workspace: Workspace, kind: "ledger" | "field", seat: Seat = "owner"): void {
  const access = accessFor(workspace, seat)
  if (kind === "ledger" && !access.ledger) {
    throw new Error("This seat is the field role. New delinquencies and ledger notes need the collections role. A Pro owner can use both.")
  }
  if (kind === "field" && !access.field) {
    throw new Error("This seat is the collections role. Recovery and personal-property logs need the field role. A Pro owner can use both.")
  }
}
