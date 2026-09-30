import { useEffect, useState, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import { FieldLinkPanel } from "../components/FieldLinkPanel"
import { Banner, Button, Card, Field, TextInput, Area, errorText } from "../components/ui"
import { formatStamp } from "../domain/dates"
import { accessFor } from "../domain/roles"
import { getPhoto } from "../lib/db"
import { useStore } from "../state/Store"

export default function FieldPage() {
  const { id = "" } = useParams()
  const store = useStore()
  const account = store.accounts.find((item) => item.id === id)
  const [attested, setAttested] = useState(false)
  const [place, setPlace] = useState("")
  const [observation, setObservation] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [condition, setCondition] = useState("")
  const [location, setLocation] = useState("")
  const [releaseName, setReleaseName] = useState("")

  if (!account) return null
  const access = store.workspace ? accessFor(store.workspace, store.seat) : null
  const spots = store.spots.filter((spot) => spot.accountId === account.id).sort((a, b) => b.at.localeCompare(a.at))
  const items = store.inventory.filter((item) => item.accountId === account.id)

  function capture() {
    setGeoError(null)
    if (!navigator.geolocation) {
      setGeoError("This browser has no location API. Type the place instead.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setAccuracy(position.coords.accuracy)
      },
      () => setGeoError("Location was denied. The spot can still be saved with a written place."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  async function onSpot(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await store.addSpot({
        accountId: account!.id,
        latitude,
        longitude,
        accuracyMeters: accuracy,
        placeNote: place,
        observation,
        authorityAttested: attested,
        files,
      })
      setPlace("")
      setObservation("")
      setFiles([])
      setAttested(false)
      setLatitude(null)
      setLongitude(null)
    } catch (reason) {
      setFormError(errorText(reason))
    }
  }

  return (
    <div className="space-y-4">
      <FieldLinkPanel accountId={account.id} />
      <Card>
        <h2 className="text-lg font-semibold">Field spot</h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft dark:text-paper/70">
          Location is captured only when you tap the button. Map tiles are not loaded, so the coordinates are not sent to a map provider.
        </p>
        {access?.field ? (
        <form onSubmit={(event) => void onSpot(event)} className="mt-4 space-y-3">
          <label className="flex items-start gap-3 text-sm leading-6">
            <input type="checkbox" className="mt-1" checked={attested} onChange={(event) => setAttested(event.target.checked)} />
            I am logging this spot for an account this dealership services as secured party or its authorized agent. I will not use RepoFuse to follow anyone this lot is not authorized to locate.
          </label>
          <Button type="button" variant="secondary" onClick={capture}>
            Use this device’s location
          </Button>
          {latitude != null && longitude != null ? (
            <p className="text-sm">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
              {accuracy != null ? ` · about ${Math.round(accuracy)} m` : ""}
            </p>
          ) : null}
          {geoError ? <p className="text-sm text-rose">{geoError}</p> : null}
          <Field label="Place note">
            <TextInput value={place} onChange={(event) => setPlace(event.target.value)} />
          </Field>
          <Field label="What you saw">
            <Area value={observation} onChange={(event) => setObservation(event.target.value)} />
          </Field>
          <Field label="Photos" hint="Up to 6. They are compressed and stored in IndexedDB.">
            <input
              className="block w-full text-sm"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </Field>
          {formError ? <p role="alert" className="text-sm font-semibold text-rose">{formError}</p> : null}
          <Button type="submit">Save spot on this device</Button>
        </form>
        ) : (
          <Banner>This seat can read spots. Saving a spot needs the field role. A Pro owner can write both.</Banner>
        )}
      </Card>

      {spots.map((spot) => (
        <Card key={spot.id}>
          <p className="text-sm font-semibold">{formatStamp(spot.at)}</p>
          <p className="mt-1 text-sm">
            {spot.latitude != null && spot.longitude != null
              ? `${spot.latitude.toFixed(5)}, ${spot.longitude.toFixed(5)}`
              : "No coordinates"}
            {spot.placeNote ? ` · ${spot.placeNote}` : ""}
          </p>
          <p className="mt-2 text-sm leading-6">{spot.observation}</p>
          <PhotoStrip ids={spot.photoIds} />
        </Card>
      ))}

      <Card>
        <h2 className="text-lg font-semibold">Personal property inventory</h2>
        <p className="mt-1 text-sm leading-6">Itemize property left in the vehicle. This receipt is part of the on-device packet. The hold countdown is on After recovery.</p>
        {access?.field ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void store
              .addInventory({ accountId: account.id, description, condition, storageLocation: location })
              .then(() => {
                setDescription("")
                setCondition("")
                setLocation("")
              })
              .catch((reason: unknown) => setFormError(errorText(reason)))
          }}
        >
          <Field label="Item">
            <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Field label="Condition">
            <TextInput value={condition} onChange={(event) => setCondition(event.target.value)} />
          </Field>
          <Field label="Where it is stored">
            <TextInput value={location} onChange={(event) => setLocation(event.target.value)} />
          </Field>
          <Button type="submit">Add item</Button>
        </form>
        ) : (
          <p className="mt-3 text-sm leading-6">Adding or releasing property needs the field role.</p>
        )}
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <p className="font-semibold">{item.description}</p>
              <p>{item.condition || "Condition not noted"} · {item.storageLocation || "Location not noted"} · {item.status}</p>
              {item.status !== "held" ? (
                <p className="mt-1">Released to {item.releasedTo || "unnamed"}</p>
              ) : access?.field ? (
                <form
                  className="mt-2 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void store.releaseInventory(item.id, releaseName)
                  }}
                >
                  <TextInput value={releaseName} onChange={(event) => setReleaseName(event.target.value)} placeholder="Released to" aria-label="Released to" />
                  <Button type="submit" variant="secondary">Mark released</Button>
                </form>
              ) : (
                <p className="mt-1">Still held on this device.</p>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function PhotoStrip({ ids }: { ids: string[] }) {
  const [urls, setUrls] = useState<{ id: string; url: string }[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const created: string[] = []
    void (async () => {
      const next: { id: string; url: string }[] = []
      for (const id of ids) {
        const photo = await getPhoto(id)
        if (!photo) continue
        const url = URL.createObjectURL(photo.blob)
        created.push(url)
        next.push({ id, url })
      }
      if (cancelled) {
        for (const url of created) URL.revokeObjectURL(url)
        return
      }
      setUrls(next)
    })()
    return () => {
      cancelled = true
      for (const url of created) URL.revokeObjectURL(url)
      setUrls([])
    }
  }, [ids, open])

  if (ids.length === 0) return null
  return (
    <div className="mt-3">
      <button type="button" className="text-sm font-semibold underline" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide photos" : `Show ${ids.length} photo${ids.length === 1 ? "" : "s"}`}
      </button>
      {open ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {urls.map((photo) => (
            <img key={photo.id} src={photo.url} alt="Field evidence stored on this device" className="aspect-square w-full rounded-xl object-cover" />
          ))}
        </div>
      ) : null}
    </div>
  )
}
