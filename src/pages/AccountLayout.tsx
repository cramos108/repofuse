import { NavLink, Outlet, useParams } from "react-router-dom"
import { StagePill } from "../components/ui"
import { formatMoney } from "../domain/money"
import { getProfile } from "../domain/profiles"
import { computeStage } from "../domain/stage"
import { useStore } from "../state/Store"

const tabClass = ({ isActive }: { isActive: boolean }) => (isActive ? "chip-on" : "chip")

export default function AccountLayout() {
  const { id } = useParams()
  const store = useStore()
  const account = store.accounts.find((item) => item.id === id)
  const workspace = store.workspace
  if (!account || !workspace) return <p>That file is not on this device.</p>
  const stage = computeStage({
    account,
    profile: getProfile(workspace.stateCode),
    workspace,
    notices: store.notices,
    checks: store.checks,
  })

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">{account.borrowerName}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {account.vehicleYear} {account.vehicleMake} {account.vehicleModel} · {account.vin || "No VIN"} · {formatMoney(account.amountPastDueCents)} past due
          </p>
        </div>
        <StagePill stage={stage.stage} label={stage.label} />
      </div>
      {stage.stage === "cure_active" && stage.daysRemaining != null ? (
        <p className="mt-3 text-sm font-semibold">
          {stage.daysRemaining} day{stage.daysRemaining === 1 ? "" : "s"} left · clears {stage.earliestReadyOn}
        </p>
      ) : null}
      <nav className="no-print mt-4 flex gap-2 overflow-x-auto pb-1">
        <NavLink to={`/app/accounts/${account.id}`} end className={tabClass}>
          Timeline
        </NavLink>
        <NavLink to={`/app/accounts/${account.id}/guardrails`} className={tabClass}>
          Guardrails
        </NavLink>
        <NavLink to={`/app/accounts/${account.id}/field`} className={tabClass}>
          Field
        </NavLink>
        <NavLink to={`/app/accounts/${account.id}/post-repo`} className={tabClass}>
          After recovery
        </NavLink>
        <NavLink to={`/app/accounts/${account.id}/packet`} className={tabClass}>
          Packet
        </NavLink>
      </nav>
      <div className="mt-5">
        <Outlet />
      </div>
    </div>
  )
}
