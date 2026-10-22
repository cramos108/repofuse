import { useMemo, useState, type ReactNode } from "react"
import { useParams } from "react-router-dom"
import { Area, Button, Field, TextInput, ThemeToggle, Wordmark, errorText, usePageTitle } from "../components/ui"
import { formatStamp } from "../domain/dates"
import {
  MAX_CONDITION_PHOTOS,
  conditionPhotosFrom,
  encodeFieldReturn,
  readFieldSnapshotFromLocation,
  type ConditionPhoto,
  type FieldSnapshot,
} from "../domain/fieldLink"
import { blobToJpegDataUrl } from "../lib/images"
import { useStore } from "../state/Store"

export default function FieldLinkPage() {
  usePageTitle("Field assignment")
  const { token = "" } = useParams()
  const store = useStore()
  const [note, setNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [returnCode, setReturnCode] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [copiedVin, setCopiedVin] = useState(false)
  const view = useMemo(() => readFieldSnapshotFromLocation(), [])

  const grant = store.ready ? store.fieldGrants.find((item) => item.id === token) : undefined
  const revoked = Boolean(grant?.revokedAt)
  const onDevice = Boolean(grant && !grant.revokedAt)

  if (revoked) {
    return (
      <Shell>
        <h1 className="font-display text-3xl sm:text-4xl">This field link was revoked</h1>
        <p className="mt-3 text-base leading-6">The dealership closed it on their device. Ask them for a new link.</p>
      </Shell>
    )
  }

  if (!view) {
    return (
      <Shell>
        <h1 className="font-display text-3xl sm:text-4xl">This field link has no vehicle snapshot</h1>
        <p className="mt-3 text-base leading-6">
          Ask the dealership for the full link, including the part after #. That snapshot stays in the browser and is not
          uploaded.
        </p>
      </Shell>
    )
  }

  const snapshot = view
  const lastSpot = snapshot.spots[0]
  const earlierSpots = snapshot.spots.slice(1)

  async function copyVin() {
    if (!snapshot.vin) return
    try {
      await navigator.clipboard.writeText(snapshot.vin)
      setCopiedVin(true)
      window.setTimeout(() => setCopiedVin(false), 2000)
    } catch {
      setCopiedVin(false)
    }
  }

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
            ? "Marked secured on this device. The recovery note and photos stayed here."
            : "Status saved on this device. The recovery note and photos stayed here.",
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
      setMessage("Update code copied. Send it back to the dealership. Nothing was uploaded.")
    } catch {
      setMessage("Send this update code back to the dealership. Nothing was uploaded.")
    }
  }

  return (
    <Shell>
      <p className="badge">One vehicle · no login</p>
      <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{headingFor(snapshot)}</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {[snapshot.dealership, snapshot.agency].filter(Boolean).join(" · ") || "Assigned vehicle"}
      </p>

      <div className="mt-5 space-y-3 text-base">
        <Row label="Make" value={snapshot.make || "Not on this snapshot"} />
        <Row label="Model" value={snapshot.model || "Not on this snapshot"} />
        <Row
          label="VIN"
          value={
            snapshot.vin ? (
              <button type="button" className="w-full text-right font-mono text-base font-semibold tracking-wide break-all text-zinc-950 touch-manipulation dark:text-zinc-50" onClick={() => void copyVin()}>
                {snapshot.vin}
                <span className="mt-1 block font-sans text-xs font-medium tracking-normal text-zinc-500">
                  {copiedVin ? "Copied" : "Tap to copy"}
                </span>
              </button>
            ) : (
              "Not on this snapshot"
            )
          }
        />
        {snapshot.stock ? <Row label="Stock" value={snapshot.stock} /> : null}
        <Row label="Status" value={labelFor(snapshot.status)} />
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Last spotted</h2>
        {lastSpot ? (
          <SpotCard spot={lastSpot} featured />
        ) : (
          <p className="mt-2 text-base leading-6">No location was included.</p>
        )}
        {earlierSpots.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {earlierSpots.map((spot) => (
              <li key={`${spot.at}-${spot.place}`}>
                <SpotCard spot={spot} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Photos</h2>
        {snapshot.photos.length === 0 ? <p className="mt-2 text-base leading-6">No photos were included.</p> : null}
        {snapshot.photos.length > 0 ? (
          <ul className="mt-3 grid grid-cols-1 gap-3">
            {snapshot.photos.map((photo, index) => (
              <li key={`${photo.name}-${index}`}>
                <img
                  src={photo.dataUrl}
                  alt={photo.name || `Vehicle photo ${index + 1}`}
                  className="w-full rounded-xl object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <form
        className="panel mt-6 space-y-3 p-4"
        onSubmit={(event) => {
          event.preventDefault()
          void mark("secured")
        }}
      >
        <h2 className="text-lg font-semibold">Send an update</h2>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {onDevice
            ? "This browser already has the assigned grant, so the note and photos write here. This page does not open the lot file."
            : "This phone does not sign in and does not upload. The note and photos go back as a code the dealership applies on their device."}
        </p>
        <Field label="Recovery note">
          <Area value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <Field label="Condition photos" hint={`Up to ${MAX_CONDITION_PHOTOS}. They stay with this update and are not uploaded.`}>
          <input
            className="block w-full text-base"
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, MAX_CONDITION_PHOTOS))}
          />
        </Field>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" className="min-h-12 w-full touch-manipulation sm:w-auto">
            Mark secured
          </Button>
          <Button type="button" variant="secondary" className="min-h-12 w-full touch-manipulation sm:w-auto" onClick={() => void mark("unable")}>
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

function headingFor(view: FieldSnapshot): string {
  const named = `${view.year} ${view.make} ${view.model}`.trim()
  return named || view.vehicle || "Assigned vehicle"
}

function labelFor(status: FieldSnapshot["status"]): string {
  if (status === "secured") return "Secured"
  if (status === "unable") return "Could not secure"
  return "Assigned"
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid w-full grid-cols-[7rem_1fr] items-start gap-x-3 text-base">
      <span className="pt-0.5 text-zinc-500">{label}</span>
      <span className="min-w-0 text-right font-semibold break-words text-zinc-950 dark:text-zinc-50">{value}</span>
    </div>
  )
}

function SpotCard({
  spot,
  featured = false,
}: {
  spot: FieldSnapshot["spots"][number]
  featured?: boolean
}) {
  const mapsHref =
    spot.latitude != null && spot.longitude != null ? `geo:${spot.latitude},${spot.longitude}` : null
  return (
    <div className={`panel mt-2 p-4 text-base ${featured ? "border-cyan-400/50" : ""}`}>
      <p className="font-semibold">{spot.at ? formatStamp(spot.at) : "Time not noted"}</p>
      <p className="mt-1 leading-6">{spot.place || "Place not noted"}</p>
      {spot.latitude != null && spot.longitude != null ? (
        <p className="mt-1 font-mono text-sm">
          {spot.latitude.toFixed(5)}, {spot.longitude.toFixed(5)}
        </p>
      ) : null}
      {spot.note ? (
        <div className="mt-2">
          <p className="text-sm font-semibold text-zinc-500">Notes</p>
          <p className="mt-1 leading-6">{spot.note}</p>
        </div>
      ) : null}
      {mapsHref ? (
        <a className="mt-3 inline-flex min-h-11 items-center font-semibold underline touch-manipulation" href={mapsHref}>
          Open in maps
        </a>
      ) : null}
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <Wordmark />
        <ThemeToggle />
      </div>
      <div className="mt-6">{children}</div>
      <p className="mt-8 text-sm leading-6 text-zinc-500">
        This page is one assigned vehicle. It is not a dealership sign-in. Dealership settings, collections logs, and
        other lot files are not on this page.
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
