import { useState } from "react"
import { Button, Card, Field, TextInput, errorText } from "./ui"
import { buildFieldSnapshot, fieldLinkUrl, type FieldAgentStatus } from "../domain/fieldLink"
import { useStore } from "../state/Store"

export function FieldStatusFlag({ status }: { status: FieldAgentStatus | null }) {
  if (status !== "secured") return null
  return (
    <span className="badge border-emerald-500/40 text-emerald-800 dark:text-emerald-200">
      <span aria-hidden className="status-dot text-emerald-400" />
      Field secured
    </span>
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
        A recovery agency opens this link with no account. They see the VIN, the last locations on this device, and the personal-property notes. They can mark the vehicle secured. The snapshot stays in the link. It is not uploaded.
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
        <Field label="Update code from the agency" hint="Paste the code they send back after marking the vehicle secured.">
          <TextInput value={returnCode} onChange={(event) => setReturnCode(event.target.value)} />
        </Field>
        <Button type="submit" variant="secondary">Apply field update</Button>
      </form>
      {message ? <p className="mt-3 text-sm leading-6">{message}</p> : null}
      {formError ? <p role="alert" className="mt-3 text-sm font-semibold text-rose">{formError}</p> : null}
    </Card>
  )
}
