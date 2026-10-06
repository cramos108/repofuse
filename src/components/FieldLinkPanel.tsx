import { useState } from "react"
import { Link } from "react-router-dom"
import { Button, Card, Field, TextInput, errorText } from "./ui"
import { buildFieldSnapshot, fieldLinkUrl, type FieldAgentStatus } from "../domain/fieldLink"
import { useStore } from "../state/Store"

export function FieldStatusFlag({ status }: { status: FieldAgentStatus | null }) {
  if (!status) return null
  if (status === "secured") {
    return (
      <span className="badge border-emerald-500/40 text-emerald-800 dark:text-emerald-200">
        <span aria-hidden className="status-dot text-emerald-400" />
        Field secured
      </span>
    )
  }
  if (status === "unable") {
    return (
      <span className="badge border-rose-500/40 text-rose-700 dark:text-rose-200">
        <span aria-hidden className="status-dot text-rose-400" />
        Could not secure
      </span>
    )
  }
  return (
    <span className="badge">
      <span aria-hidden className="status-dot text-cyan-300" />
      Assigned
    </span>
  )
}

export function FieldAssignments() {
  const store = useStore()
  const assignments = store.fieldGrants.filter((grant) => !grant.revokedAt)
  return (
    <Card>
      <h2 className="text-lg font-semibold">Field assignments</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Signed-in collectors keep the ledger and this dashboard. An outside recovery agent does not sign in. A field link assigns one vehicle. The agent can leave a recovery note and condition photos. Phone, address, balances, and every other file stay on this device.
      </p>
      {assignments.length === 0 ? (
        <p className="mt-3 text-sm">No active assignments. Open a file and generate a field link.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {assignments.map((grant) => {
            const account = store.accounts.find((item) => item.id === grant.accountId)
            const vehicle = account ? `${account.vehicleYear} ${account.vehicleMake} ${account.vehicleModel}`.trim() : "Vehicle"
            return (
              <li key={grant.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <Link to={`/app/accounts/${grant.accountId}/field`} className="font-semibold">
                  {vehicle || "Vehicle"} · {grant.agencyLabel}
                </Link>
                <FieldStatusFlag status={grant.status} />
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function FieldLinkPanel({ accountId }: { accountId: string }) {
  const store = useStore()
  const account = store.accounts.find((item) => item.id === accountId)
  const workspace = store.workspace
  const grants = store.fieldGrants.filter((grant) => grant.accountId === accountId)
  const [agency, setAgency] = useState("")
  const [freshUrl, setFreshUrl] = useState<string | null>(null)
  const [returnCode, setReturnCode] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  if (!account || !workspace) return null

  function urlFor(token: string, agencyLabel: string, status: FieldAgentStatus) {
    return fieldLinkUrl(
      window.location.origin,
      buildFieldSnapshot({
        token,
        dealership: workspace!.dealershipName,
        agency: agencyLabel,
        account: account!,
        spots: store.spots.filter((spot) => spot.accountId === accountId),
        inventory: store.inventory.filter((item) => item.accountId === accountId),
        status,
      }),
    )
  }

  async function copy(url: string) {
    setFreshUrl(url)
    try {
      await navigator.clipboard.writeText(url)
      setMessage("Field link copied. Send the whole address, including the part after #.")
    } catch {
      setMessage("Copy the field link below. Include the part after #.")
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Agency field link</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Assign one vehicle to an outside recovery agent. They open the link on a phone, with no dashboard login. They see this vehicle, the last locations, and the property notes. They can add a recovery note and condition photos. They do not see phone numbers, addresses, balances, or any other file. The snapshot stays in the link. It is not uploaded.
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          setFormError(null)
          void store
            .createFieldLink(accountId, agency)
            .then((url) => {
              setAgency("")
              return copy(url)
            })
            .catch((reason: unknown) => setFormError(errorText(reason)))
        }}
      >
        <Field label="Agency or agent" hint="Shown on the link. Two characters or more.">
          <TextInput value={agency} onChange={(event) => setAgency(event.target.value)} />
        </Field>
        <Button type="submit">Generate field link</Button>
      </form>
      {freshUrl ? (
        <TextInput className="mt-3" readOnly value={freshUrl} aria-label="Field link" onFocus={(event) => event.currentTarget.select()} />
      ) : null}
      <ul className="mt-4 space-y-3 text-sm">
        {grants.map((grant) => (
          <li key={grant.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="font-semibold">
              {grant.agencyLabel} · {grant.revokedAt ? "Revoked" : grant.status}
            </p>
            {grant.statusNote ? <p className="mt-1">{grant.statusNote}</p> : null}
            <div className="mt-2 flex flex-wrap gap-3">
              {!grant.revokedAt ? (
                <button type="button" className="font-semibold underline" onClick={() => void copy(urlFor(grant.id, grant.agencyLabel, grant.status))}>
                  Copy fresh link
                </button>
              ) : null}
              {!grant.revokedAt ? (
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => void store.revokeFieldLink(grant.id).catch((reason: unknown) => setFormError(errorText(reason)))}
                >
                  Revoke
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          setFormError(null)
          void store
            .applyFieldReturn(returnCode)
            .then(() => {
              setReturnCode("")
              setMessage("Field update applied on this device.")
            })
            .catch((reason: unknown) => setFormError(errorText(reason)))
        }}
      >
        <Field label="Update code from the agency" hint="Paste the code they send back. It can include the recovery note and condition photos. Nothing is uploaded.">
          <TextInput value={returnCode} onChange={(event) => setReturnCode(event.target.value)} />
        </Field>
        <Button type="submit" variant="secondary">Apply field update</Button>
      </form>
      {message ? <p className="mt-3 text-sm leading-6">{message}</p> : null}
      {formError ? <p role="alert" className="mt-3 text-sm font-semibold text-rose">{formError}</p> : null}
    </Card>
  )
}
