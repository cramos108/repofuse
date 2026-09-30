import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ProfileCard } from "../components/ProfileCard"
import { Banner, Button, Field, SelectInput, TextInput, Wordmark, errorText, usePageTitle } from "../components/ui"
import { COUNTDOWN_RULE } from "../domain/copy"
import { PROFILES_BY_NAME, getProfile } from "../domain/profiles"
import { roleOf } from "../domain/roles"
import type { OperatorRole } from "../domain/types"
import { useStore } from "../state/Store"

export default function SetupPage() {
  usePageTitle("State setup")
  const navigate = useNavigate()
  const { ready, error, workspace, saveSetup } = useStore()
  const [dealershipName, setDealershipName] = useState(workspace?.dealershipName ?? "")
  const [lotCity, setLotCity] = useState(workspace?.lotCity ?? "")
  const [operatorName, setOperatorName] = useState(workspace?.operatorName ?? "")
  const [operatorRole, setOperatorRole] = useState<OperatorRole>(roleOf(workspace ?? {}))
  const [stateCode, setStateCode] = useState(workspace?.stateCode ?? "TX")
  const profile = useMemo(() => getProfile(stateCode), [stateCode])
  const [cureDays, setCureDays] = useState(String(workspace?.armedCureDays ?? profile.suggestedCureDays ?? 15))
  const [graceDays, setGraceDays] = useState(String(workspace?.contractualGraceDays ?? 0))
  const [waitDays, setWaitDays] = useState(String(workspace?.armedDispositionWaitDays ?? profile.dispositionWaitDays))
  const [waived, setWaived] = useState(workspace?.cureWaived ?? false)
  const [waiverReason, setWaiverReason] = useState(workspace?.cureWaivedReason ?? "")
  const [understood, setUnderstood] = useState(false)
  const [counsel, setCounsel] = useState(Boolean(workspace?.counselConfirmedAt))
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!workspace || hydrated.current) return
    hydrated.current = true
    setDealershipName(workspace.dealershipName)
    setLotCity(workspace.lotCity)
    setOperatorName(workspace.operatorName)
    setOperatorRole(roleOf(workspace))
    setStateCode(workspace.stateCode)
    const saved = getProfile(workspace.stateCode)
    setCureDays(String(workspace.armedCureDays ?? saved.suggestedCureDays ?? 15))
    setGraceDays(String(workspace.contractualGraceDays))
    setWaitDays(String(workspace.armedDispositionWaitDays))
    setWaived(workspace.cureWaived)
    setWaiverReason(workspace.cureWaivedReason)
    setCounsel(Boolean(workspace.counselConfirmedAt))
  }, [workspace])

  function onState(next: string) {
    setStateCode(next)
    const nextProfile = getProfile(next)
    setCureDays(String(nextProfile.suggestedCureDays ?? 15))
    setWaitDays(String(nextProfile.dispositionWaitDays))
    setWaived(false)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (!dealershipName.trim() || !operatorName.trim() || !lotCity.trim()) {
      setFormError("Dealership, city, and your name are required.")
      return
    }
    if (!understood) {
      setFormError("Confirm that this profile is a worksheet before opening the lot.")
      return
    }
    const armed = Number(cureDays)
    const grace = Number(graceDays)
    const wait = Number(waitDays)
    if (!Number.isInteger(grace) || grace < 0 || !Number.isInteger(wait) || wait < 1) {
      setFormError("Use whole days. The disposition wait has to be at least 1.")
      return
    }
    if (profile.preRepoCure === "statutory" && !waived && (!Number.isInteger(armed) || armed < 1)) {
      setFormError("Arm a cure window of at least 1 day, or record a counsel waiver.")
      return
    }
    if (waived && waiverReason.trim().length < 12) {
      setFormError("The waiver needs a short reason from counsel or compliance.")
      return
    }
    setSaving(true)
    try {
      await saveSetup({
        dealershipName,
        lotCity,
        operatorName,
        stateCode,
        armedCureDays: profile.preRepoCure === "statutory" ? armed : null,
        contractualGraceDays: grace,
        armedDispositionWaitDays: wait,
        cureWaived: waived,
        cureWaivedReason: waiverReason,
        counselConfirmed: counsel,
        operatorRole,
      })
      const intent = sessionStorage.getItem("repofuse-intent")
      sessionStorage.removeItem("repofuse-intent")
      navigate(intent === "pro" ? "/app/settings?intent=pro" : "/app")
    } catch (reason) {
      setFormError(errorText(reason))
      setSaving(false)
    }
  }

  if (error) {
    return <p className="mx-auto max-w-lg px-4 py-16">{error}</p>
  }
  if (!ready) {
    return <p className="mx-auto max-w-lg px-4 py-16">Opening on-device storage…</p>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between">
        <Wordmark />
        <Link to="/" className="text-sm font-semibold underline">
          Back
        </Link>
      </div>
      <p className="badge mt-8">
        <span aria-hidden className="status-dot text-cyan-300" />
        Local-first worksheet
      </p>
      <h1 className="mt-3 font-display text-4xl md:text-5xl">Choose the lot’s state.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft dark:text-paper/70">
        The worksheet arms cure countdowns, the disposition wait, and any extra guardrails for that
        state. {COUNTDOWN_RULE}
      </p>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-8 grid gap-6 md:grid-cols-[1fr_.9fr]">
        <div className="space-y-4">
          <Field label="Dealership">
            <TextInput value={dealershipName} onChange={(event) => setDealershipName(event.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City">
              <TextInput value={lotCity} onChange={(event) => setLotCity(event.target.value)} required />
            </Field>
            <Field label="Your name">
              <TextInput value={operatorName} onChange={(event) => setOperatorName(event.target.value)} required />
            </Field>
          </div>
          <Field label="Your role" hint="Free is one collections specialist. A Pro collections manager can add collector teammates. Outside agencies do not get a seat.">
            <SelectInput value={operatorRole} onChange={(event) => setOperatorRole(event.target.value as OperatorRole)}>
              <option value="specialist">Collections Specialist</option>
              <option value="manager">Collections Manager</option>
            </SelectInput>
          </Field>
          <Field label="Operating state">
            <SelectInput value={stateCode} onChange={(event) => onState(event.target.value)}>
              {PROFILES_BY_NAME.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          {profile.preRepoCure === "statutory" ? (
            <Field label="Armed cure days" hint={profile.cureFrequency}>
              <TextInput inputMode="numeric" value={cureDays} onChange={(event) => setCureDays(event.target.value)} />
            </Field>
          ) : (
            <Banner>This profile does not flag a statutory pre-repo cure.</Banner>
          )}
          <Field label="Contractual grace days" hint="Use 0 if the contract does not add its own cure. If both apply, RepoFuse uses the longer window.">
            <TextInput inputMode="numeric" value={graceDays} onChange={(event) => setGraceDays(event.target.value)} />
          </Field>
          <Field label="Disposition wait days" hint="Consumer files do not get the non-consumer 10-day safe harbor. 15 is the starting wait.">
            <TextInput inputMode="numeric" value={waitDays} onChange={(event) => setWaitDays(event.target.value)} />
          </Field>
          {profile.preRepoCure === "statutory" ? (
            <label className="flex items-start gap-3 text-sm leading-6">
              <input type="checkbox" className="mt-1" checked={waived} onChange={(event) => setWaived(event.target.checked)} />
              Counsel says this contract is outside the statutory cure. Arm no statutory window.
            </label>
          ) : null}
          {waived ? (
            <Field label="Waiver reason">
              <TextInput value={waiverReason} onChange={(event) => setWaiverReason(event.target.value)} />
            </Field>
          ) : null}
          <label className="flex items-start gap-3 text-sm leading-6">
            <input type="checkbox" className="mt-1" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />
            I understand this profile is an operational worksheet. I will confirm it with counsel before I rely on a countdown.
          </label>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input type="checkbox" className="mt-1" checked={counsel} onChange={(event) => setCounsel(event.target.checked)} />
            Our counsel or compliance officer has already confirmed these day counts.
          </label>
          {formError ? <p role="alert" className="text-sm font-semibold text-rose">{formError}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving on this device…" : "Open the lot"}
          </Button>
        </div>
        <ProfileCard
          profile={profile}
          cureDays={Number(cureDays) || null}
          waitDays={Number(waitDays) || profile.dispositionWaitDays}
          waived={waived}
        />
      </form>
    </div>
  )
}
