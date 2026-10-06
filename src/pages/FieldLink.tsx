import { useMemo, useState, type ReactNode } from "react"
import { useParams } from "react-router-dom"
import { Area, Button, Field, TextInput, ThemeToggle, Wordmark, errorText, usePageTitle } from "../components/ui"
import { formatStamp } from "../domain/dates"
import {
  MAX_CONDITION_PHOTOS,
  buildFieldSnapshot,
  conditionPhotosFrom,
  decodeFieldSnapshot,
  encodeFieldReturn,
  type ConditionPhoto,
  type FieldSnapshot,
} from "../domain/fieldLink"
import { blobToJpegDataUrl } from "../lib/images"
import { useStore } from "../state/Store"

export default function FieldLinkPage() {
  usePageTitle("Field link")
  const { token = "" } = useParams()
  const store = useStore()
  const [note, setNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [returnCode, setReturnCode] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const remote = useMemo(() => decodeFieldSnapshot(window.location.hash.replace(/^#/, "")), [])

  if (!store.ready) {
    return <p className="mx-auto max-w-lg px-4 py-16 text-sm">Opening this field link…</p>
  }

  const grant = store.fieldGrants.find((item) => item.id === token)
  const account = grant ? store.accounts.find((item) => item.id === grant.accountId) : undefined
  if (grant?.revokedAt) {
    return (
      <Shell>
        <h1 className="font-display text-4xl">This field link was revoked</h1>
        <p className="mt-3 text-sm leading-6">The dealership closed it on their device. Ask them for a new link.</p>
      </Shell>
    )
  }

  const live =
    grant && account && store.workspace
      ? buildFieldSnapshot({
          token,
          dealership: store.workspace.dealershipName,
          agency: grant.agencyLabel,
          account,
          spots: store.spots.filter((spot) => spot.accountId === account.id),
          inventory: store.inventory.filter((item) => item.accountId === account.id),
          status: grant.status,
        })
      : null
  const view = live ?? (remote && remote.token === token ? remote : null)
  if (!view) {
    return (
      <Shell>
        <h1 className="font-display text-4xl">This field link has no vehicle snapshot</h1>
        <p className="mt-3 text-sm leading-6">
          Ask the dealership for the full link, including the part after #. That part stays in the browser and is not uploaded.
        </p>
      </Shell>
    )
  }

  const onDevice = Boolean(live)

  async function mark(status: "secured" | "unable") {
    setFormError(null)
    setReturnCode(null)
    let photos: ConditionPhoto[] = []
    try {
      photos = await readConditionPhotos(files)
    } catch (reason) {
      setFormError(errorText(reason))
      return
    }
    if (onDevice) {
      try {
        await store.applyFieldStatus(token, status, note, photos)
        setFiles([])
        setMessage(
          status === "secured"
            ? "Marked secured on the dealership device. The recovery note and photos stayed here."
            : "Status saved on the dealership device. The recovery note and photos stayed here.",
        )
      } catch (reason) {
        setFormError(errorText(reason))
      }
      return
    }
    const code = encodeFieldReturn({
      v: 1,
      token,
      status,
      at: new Date().toISOString(),
      note: note.trim().slice(0, 500),
      photos,
    })
    setReturnCode(code)
    try {
      await navigator.clipboard.writeText(code)
      setMessage("Update code copied. Send it back to the dealership. They apply the note and photos on their device. Nothing was uploaded.")
    } catch {
      setMessage("Send this update code back to the dealership. They apply the note and photos on their device. Nothing was uploaded.")
    }
  }

  return (
    <Shell>
      <p className="badge">One assigned vehicle · no login</p>
      <h1 className="mt-3 font-display text-4xl">{view.vehicle || "Vehicle"}</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {view.dealership ? `${view.dealership} · ` : ""}
        {view.agency ? `${view.agency} · ` : ""}
        {view.borrower}
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <Row label="VIN" value={view.vin || "Not on this snapshot"} />
        <Row label="Stock" value={view.stock || "Not on this snapshot"} />
        <Row label="Status" value={labelFor(view.status)} />
      </dl>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Last known locations</h2>
        {view.spots.length === 0 ? <p className="mt-2 text-sm">No location was included.</p> : null}
        <ul className="mt-2 space-y-3">
          {view.spots.map((spot) => (
            <li key={`${spot.at}-${spot.place}`} className="panel p-4 text-sm">
              <p className="font-semibold">{spot.at ? formatStamp(spot.at) : "Time not noted"}</p>
              <p className="mt-1">
                {spot.place || "Place not noted"}
                {spot.latitude != null && spot.longitude != null ? ` · ${spot.latitude.toFixed(5)}, ${spot.longitude.toFixed(5)}` : ""}
              </p>
              {spot.note ? <p className="mt-1 leading-6">{spot.note}</p> : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Personal property</h2>
        {view.property.length === 0 ? <p className="mt-2 text-sm">No property notes were included.</p> : null}
        <ul className="mt-2 space-y-3">
          {view.property.map((item) => (
            <li key={`${item.description}-${item.where}`} className="panel p-4 text-sm">
              <p className="font-semibold">{item.description || "Item"}</p>
              <p className="mt-1">{item.condition || "Condition not noted"} · {item.where || "Location not noted"} · {item.status}</p>
            </li>
          ))}
        </ul>
      </section>
      <form
        className="panel mt-6 space-y-3 p-4"
        onSubmit={(event) => {
          event.preventDefault()
          void mark("secured")
        }}
      >
        <h2 className="text-lg font-semibold">Recovery log</h2>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {onDevice
            ? "This browser has the lot file, so the note and photos write here. This page still does not open the dashboard."
            : "This phone does not have the lot file and cannot sign in. The note and photos go back as a code the dealership applies. They are not uploaded."}
        </p>
        <Field label="Recovery note">
          <Area value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <Field label="Condition photos" hint={`Up to ${MAX_CONDITION_PHOTOS}. They stay with this update and are not uploaded.`}>
          <input
            className="block w-full text-sm"
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, MAX_CONDITION_PHOTOS))}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Mark secured</Button>
          <Button type="button" variant="secondary" onClick={() => void mark("unable")}>
            Could not secure
          </Button>
        </div>
        {returnCode ? (
          <TextInput readOnly value={returnCode} aria-label="Update code" onFocus={(event) => event.currentTarget.select()} />
        ) : null}
        {message ? <p className="text-sm leading-6">{message}</p> : null}
        {formError ? <p role="alert" className="text-sm font-semibold text-rose">{formError}</p> : null}
      </form>
    </Shell>
  )
}

function labelFor(status: FieldSnapshot["status"]): string {
  if (status === "secured") return "Secured"
  if (status === "unable") return "Could not secure"
  return "Assigned"
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <Wordmark />
        <ThemeToggle />
      </div>
      <div className="mt-8">{children}</div>
      <p className="mt-8 text-sm leading-6 text-zinc-500">
        This link is one assigned vehicle. It is not a dealership sign-in. Phone, address, balances, and other files are not on this page.
      </p>
    </div>
  )
}

async function readConditionPhotos(files: File[]): Promise<ConditionPhoto[]> {
  if (files.length > MAX_CONDITION_PHOTOS) throw new Error(`Add up to ${MAX_CONDITION_PHOTOS} condition photos.`)
  const photos: ConditionPhoto[] = []
  for (const file of files) {
    const compressed = await blobToJpegDataUrl(file)
    if (!compressed) throw new Error("Could not read a condition photo.")
    photos.push({ name: (file.name || "condition.jpg").slice(0, 80), dataUrl: compressed.dataUrl })
  }
  const clean = conditionPhotosFrom(photos)
  if (!clean) throw new Error("Those photos are too large to keep with this update. Use fewer shots.")
  return clean
}
