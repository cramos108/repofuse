import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Banner, Button, Field, TextInput, Area, errorText, usePageTitle } from "../components/ui"
import { todayIso } from "../domain/dates"
import { parseDollars, dollarsInput } from "../domain/money"
import { AccountLimitError } from "../domain/limits"
import { useStore, type AccountInput } from "../state/Store"

export default function AccountForm({ mode }: { mode: "create" | "edit" }) {
  usePageTitle(mode === "create" ? "New file" : "Edit file")
  const { id } = useParams()
  const navigate = useNavigate()
  const store = useStore()
  const existing = store.accounts.find((account) => account.id === id)
  const [form, setForm] = useState<AccountInput>(emptyInput)
  const [pastDue, setPastDue] = useState("")
  const [payoff, setPayoff] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [limitHit, setLimitHit] = useState(false)
  const [deleteText, setDeleteText] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (mode !== "edit" || !existing) return
    setForm({
      borrowerName: existing.borrowerName,
      accountNumber: existing.accountNumber,
      phone: existing.phone,
      address: existing.address,
      vehicleYear: existing.vehicleYear,
      vehicleMake: existing.vehicleMake,
      vehicleModel: existing.vehicleModel,
      vin: existing.vin,
      stockNumber: existing.stockNumber,
      amountPastDueCents: existing.amountPastDueCents,
      payoffCents: existing.payoffCents,
      defaultDate: existing.defaultDate,
      notes: existing.notes,
    })
    setPastDue(dollarsInput(existing.amountPastDueCents))
    setPayoff(dollarsInput(existing.payoffCents))
  }, [existing, mode])

  function set<K extends keyof AccountInput>(key: K, value: AccountInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setLimitHit(false)
    if (!form.borrowerName.trim() || !form.vehicleMake.trim() || !form.defaultDate) {
      setFormError("Borrower, vehicle make, and default date are required.")
      return
    }
    const amountPastDueCents = parseDollars(pastDue)
    const payoffCents = parseDollars(payoff)
    if (amountPastDueCents == null || payoffCents == null) {
      setFormError("Enter dollar amounts like 1250.00.")
      return
    }
    const input = { ...form, amountPastDueCents, payoffCents }
    setSaving(true)
    try {
      if (mode === "create") {
        const nextId = await store.createAccount(input)
        navigate(`/app/accounts/${nextId}`)
      } else if (existing) {
        await store.updateAccount(existing.id, input)
        navigate(`/app/accounts/${existing.id}`)
      }
    } catch (reason) {
      setLimitHit(reason instanceof AccountLimitError)
      setFormError(errorText(reason))
      setSaving(false)
    }
  }

  if (mode === "edit" && !existing) {
    return <p>That file is not on this device.</p>
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mx-auto max-w-2xl space-y-4">
      <Link to={existing ? `/app/accounts/${existing.id}` : "/app"} className="text-sm font-semibold underline">
        Back
      </Link>
      <h1 className="font-display text-4xl">{mode === "create" ? "New delinquency" : "Edit file"}</h1>
      <Field label="Borrower">
        <TextInput value={form.borrowerName} onChange={(event) => set("borrowerName", event.target.value)} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account number">
          <TextInput value={form.accountNumber} onChange={(event) => set("accountNumber", event.target.value)} />
        </Field>
        <Field label="Phone">
          <TextInput value={form.phone} onChange={(event) => set("phone", event.target.value)} inputMode="tel" />
        </Field>
      </div>
      <Field label="Address">
        <TextInput value={form.address} onChange={(event) => set("address", event.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Year">
          <TextInput value={form.vehicleYear} onChange={(event) => set("vehicleYear", event.target.value)} />
        </Field>
        <Field label="Make">
          <TextInput value={form.vehicleMake} onChange={(event) => set("vehicleMake", event.target.value)} required />
        </Field>
        <Field label="Model">
          <TextInput value={form.vehicleModel} onChange={(event) => set("vehicleModel", event.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="VIN" hint={form.vin && form.vin.length !== 17 ? "VINs are usually 17 characters. You can still save." : undefined}>
          <TextInput value={form.vin} onChange={(event) => set("vin", event.target.value.toUpperCase())} />
        </Field>
        <Field label="Stock">
          <TextInput value={form.stockNumber} onChange={(event) => set("stockNumber", event.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount past due">
          <TextInput inputMode="decimal" value={pastDue} onChange={(event) => setPastDue(event.target.value)} />
        </Field>
        <Field label="Payoff worksheet">
          <TextInput inputMode="decimal" value={payoff} onChange={(event) => setPayoff(event.target.value)} />
        </Field>
      </div>
      <Field label="Default date">
        <TextInput type="date" value={form.defaultDate} onChange={(event) => set("defaultDate", event.target.value)} required />
      </Field>
      <Field label="Notes">
        <Area value={form.notes} onChange={(event) => set("notes", event.target.value)} />
      </Field>
      {formError ? (
        <Banner tone="warn">
          {formError}
          {limitHit ? (
            <>
              {" "}
              <Link to="/app/settings?intent=pro" className="font-semibold underline">
                Review Pro
              </Link>
            </>
          ) : null}
        </Banner>
      ) : null}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving on this device…" : "Save file"}
      </Button>
      {existing ? (
        <div className="rounded-3xl border border-rose/30 p-4">
          <h2 className="font-semibold">Delete this file from the device</h2>
          <p className="mt-1 text-sm leading-6">Export a packet first. Type DELETE to remove the borrower file from this browser.</p>
          <TextInput className="mt-3" value={deleteText} onChange={(event) => setDeleteText(event.target.value)} aria-label="Type DELETE" />
          <Button
            type="button"
            variant="danger"
            className="mt-3"
            disabled={deleteText !== "DELETE"}
            onClick={() => {
              void store.deleteAccount(existing.id).then(() => navigate("/app"))
            }}
          >
            Delete file
          </Button>
        </div>
      ) : null}
    </form>
  )
}

function emptyInput(): AccountInput {
  return {
    borrowerName: "",
    accountNumber: "",
    phone: "",
    address: "",
    vehicleYear: "",
    vehicleMake: "",
    vehicleModel: "",
    vin: "",
    stockNumber: "",
    amountPastDueCents: 0,
    payoffCents: 0,
    defaultDate: todayIso(),
    notes: "",
  }
}
