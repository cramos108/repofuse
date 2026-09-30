import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { FieldStatusFlag } from "../components/FieldLinkPanel"
import { PropertyHoldFlag } from "../components/PropertyHoldFlag"
import { Banner, Button, Card, StagePill, StatusDot, TextInput, usePageTitle } from "../components/ui"
import { FREE_OPEN_ACCOUNT_LIMIT } from "../domain/copy"
import { getProfile } from "../domain/profiles"
import { fieldStatusFor } from "../domain/fieldLink"
import { propertyHold } from "../domain/propertyHold"
import { accessFor } from "../domain/roles"
import { computeStage } from "../domain/stage"
import { remainingOpenSlots } from "../domain/limits"
import type { Stage } from "../domain/types"
import { useStore } from "../state/Store"

const filters: { id: "all" | Stage; label: string }[] = [
  { id: "all", label: "All" },
  { id: "notice_due", label: "Notice due" },
  { id: "cure_active", label: "Cure active" },
  { id: "guardrails_open", label: "Guardrails" },
  { id: "ready_for_recovery", label: "Ready" },
  { id: "recovered", label: "Recovered" },
]

export default function Dashboard() {
  usePageTitle("Lot")
  const store = useStore()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all")
  const [sampleError, setSampleError] = useState<string | null>(null)
  const profile = getProfile(store.workspace?.stateCode ?? "TX")
  const workspace = store.workspace
  const rows = useMemo(() => {
    if (!workspace) return []
    return store.accounts
      .map((account) => ({
        account,
        stage: computeStage({
          account,
          profile,
          workspace,
          notices: store.notices,
          checks: store.checks,
        }),
      }))
      .sort((a, b) => rank(a.stage.stage) - rank(b.stage.stage) || b.account.updatedAt.localeCompare(a.account.updatedAt))
  }, [profile, store.accounts, store.checks, store.notices, workspace])

  const visible = rows.filter(({ account, stage }) => {
    const haystack = `${account.borrowerName} ${account.vin} ${account.accountNumber} ${account.stockNumber}`.toLowerCase()
    const matchesQuery = haystack.includes(query.trim().toLowerCase())
    const matchesFilter = filter === "all" || stage.stage === filter
    return matchesQuery && matchesFilter
  })
  const slots = workspace ? remainingOpenSlots(store.accounts, workspace.tier) : null
  const access = workspace ? accessFor(workspace, store.seat) : null
  const holdsFlagged = rows.filter(({ account }) => {
    const flag = propertyHold({
      recoveredAt: account.recoveredAt,
      holdStartsOn: account.propertyHoldStartsOn,
      holdDays: account.propertyHoldDays,
      profileHoldDays: profile.personalPropertyHoldDays,
    }).flag
    return flag === "soon" || flag === "expired"
  }).length
  const metrics = [
    { label: "Cure active", value: rows.filter((row) => row.stage.stage === "cure_active").length, dot: "text-cyan-300" },
    { label: "Guardrails", value: rows.filter((row) => row.stage.stage === "guardrails_open").length, dot: "text-cyan-300" },
    { label: "Ready", value: rows.filter((row) => row.stage.stage === "ready_for_recovery").length, dot: "text-emerald-400" },
    { label: "Property holds", value: holdsFlagged, dot: holdsFlagged > 0 ? "text-rose-400" : "text-cyan-300" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="badge">
            <StatusDot />
            Local-first · UCC Article 9
          </p>
          <h1 className="mt-3 font-display text-4xl">Active delinquencies</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Cure windows and breach-of-peace guardrails, counted on this device.
            {" "}
            {workspace?.stateCode} worksheet
            {slots == null ? " · unlimited open files" : ` · ${slots} of ${FREE_OPEN_ACCOUNT_LIMIT} open slots left`}
          </p>
        </div>
        {access?.ledger ? (
          <Link to="/app/accounts/new" className="cta">
            New file
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="panel flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase dark:text-zinc-400">{metric.label}</p>
              <p className="mt-1 font-display text-3xl">{metric.value}</p>
            </div>
            <StatusDot className={metric.dot} />
          </article>
        ))}
      </div>
      {!workspace?.counselConfirmedAt ? (
        <Banner tone="warn">
          Day counts are not marked counsel-confirmed. The countdown still runs. The packet will say confirmation is missing.
        </Banner>
      ) : null}
      <TextInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search borrower, VIN, account, stock"
        aria-label="Search the lot file"
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            className={filter === item.id ? "chip-on" : "chip"}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <Card>
          <h2 className="font-display text-3xl">The lot file is empty.</h2>
          <p className="mt-2 text-sm leading-6">
            Open a real account, or load two fictional sample buyers so you can see the countdown and the guardrails. Samples stay on this device.
          </p>
          {sampleError ? <p className="mt-3 text-sm font-semibold text-rose">{sampleError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {access?.ledger ? (
              <Link to="/app/accounts/new" className="cta">
                New file
              </Link>
            ) : null}
            {access?.ledger ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSampleError(null)
                  void store.loadSample().catch((reason: unknown) => {
                    setSampleError(reason instanceof Error ? reason.message : "Could not load samples.")
                  })
                }}
              >
                Load sample lot
              </Button>
            ) : (
              <p className="text-sm leading-6">New files need the collections role. This seat can still open files already on the device.</p>
            )}
          </div>
        </Card>
      ) : null}
      <div className="grid gap-3">
        {visible.map(({ account, stage }) => (
          <Link key={account.id} to={hrefFor(stage.stage, account.id)} className="block">
            <Card className="transition hover:border-cyan-400/60 dark:hover:shadow-cyan-400/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{account.borrowerName}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {account.vehicleYear} {account.vehicleMake} {account.vehicleModel} · {account.vin}
                  </p>
                </div>
                <StagePill stage={stage.stage} label={stage.label} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-sm">
                  {stage.stage === "cure_active" && stage.daysRemaining != null
                    ? `${stage.daysRemaining} day${stage.daysRemaining === 1 ? "" : "s"} left in the cure window`
                    : stage.blockers[0] ?? stage.label}
                </p>
                <PropertyHoldFlag
                  hold={propertyHold({
                    recoveredAt: account.recoveredAt,
                    holdStartsOn: account.propertyHoldStartsOn,
                    holdDays: account.propertyHoldDays,
                    profileHoldDays: profile.personalPropertyHoldDays,
                  })}
                />
                <FieldStatusFlag status={fieldStatusFor(store.fieldGrants, account.id)} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {rows.length > 0 && visible.length === 0 ? <p className="text-sm">No files match that search.</p> : null}
    </div>
  )
}

function rank(stage: Stage): number {
  const order: Record<Stage, number> = {
    cure_active: 0,
    notice_due: 1,
    guardrails_open: 2,
    ready_for_recovery: 3,
    recovered: 4,
    redeemed: 5,
    disposed: 6,
    closed: 7,
  }
  return order[stage]
}

function hrefFor(stage: Stage, id: string): string {
  if (stage === "guardrails_open" || stage === "ready_for_recovery") return `/app/accounts/${id}/guardrails`
  if (stage === "recovered" || stage === "redeemed" || stage === "disposed") return `/app/accounts/${id}/post-repo`
  return `/app/accounts/${id}`
}
