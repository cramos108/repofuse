import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ProfileCard } from "../components/ProfileCard"
import { Banner, Button, Card, Field, TextInput, ThemeToggle, errorText, usePageTitle } from "../components/ui"
import { LEGAL_DISCLAIMER } from "../domain/copy"
import { PROFILES, getProfile } from "../domain/profiles"
import { settingsPayload } from "../domain/syncPayload"
import {
  pullWorkspaceSettings,
  pushWorkspaceSettings,
  sendMagicLink,
  signOutPro,
  supabaseConfigured,
} from "../lib/supabase"
import { useStore } from "../state/Store"

export default function SettingsPage() {
  usePageTitle("Settings")
  const location = useLocation()
  const store = useStore()
  const workspace = store.workspace
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [eraseText, setEraseText] = useState("")
  const [remote, setRemote] = useState<{ dealershipName: string; stateCode: string } | null>(null)

  useEffect(() => {
    if (new URLSearchParams(location.search).get("intent") === "pro") {
      document.getElementById("pro")?.scrollIntoView({ block: "start" })
    }
  }, [location.search])

  if (!workspace) return null
  const profile = getProfile(workspace.stateCode)
  const payload = settingsPayload({
    dealershipName: workspace.dealershipName,
    stateCode: workspace.stateCode,
  })

  async function run(action: () => Promise<string | void>) {
    setError(null)
    setMessage(null)
    try {
      const result = await action()
      if (typeof result === "string") setMessage(result)
    } catch (reason) {
      setError(errorText(reason))
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Lot settings</h1>
      <Card>
        <h2 className="text-lg font-semibold">{workspace.dealershipName}</h2>
        <p className="mt-1 text-sm">{workspace.lotCity} · {profile.name} · operator {workspace.operatorName}</p>
        <p className="mt-2 text-sm">{workspace.counselConfirmedAt ? "Counsel confirmation is on file." : "Counsel confirmation is not recorded."}</p>
        <Link to="/app/setup" className="mt-3 inline-flex text-sm font-semibold underline">Review the state worksheet</Link>
        <div className="mt-4">
          <ProfileCard
            profile={profile}
            cureDays={workspace.armedCureDays}
            waitDays={workspace.armedDispositionWaitDays}
            waived={workspace.cureWaived}
          />
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Theme</h2>
        <p className="mt-1 text-sm">Saved in localStorage on this device.</p>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </Card>
      <Card id="pro">
        <h2 className="text-lg font-semibold">Pro · $49.99/mo</h2>
        <p className="mt-1 text-sm leading-6">
          Current tier: {workspace.tier === "pro" ? `Pro${workspace.proEmail ? ` · ${workspace.proEmail}` : ""}` : "Free"}.
          Sign-in proves identity. The license row says whether Pro is paid. Borrower files are not part of either call.
        </p>
        {!supabaseConfigured ? (
          <Banner>
            This deployment has no Supabase keys. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then run supabase/schema.sql. Until a licenses row says pro, the lot stays Free. No card is collected here.
          </Banner>
        ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void run(async () => {
                await sendMagicLink(email.trim())
                return "Check that inbox for the sign-in link."
              })
            }}
          >
            <Field label="Work email">
              <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <Button type="submit">Email me a sign-in link</Button>
          </form>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void run(async () => store.refreshLicense())}>
            Refresh license
          </Button>
          <Button type="button" variant="ghost" onClick={() => void run(async () => { await signOutPro(); await store.setTier("free", null); return "Signed out. Tier set back to Free on this device." })}>
            Sign out
          </Button>
        </div>
        <h3 className="mt-5 text-sm font-semibold">What a settings sync sends</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950">{JSON.stringify(payload, null, 2)}</pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!supabaseConfigured}
            onClick={() => void run(async () => {
              await pushWorkspaceSettings({
                dealershipName: workspace.dealershipName,
                stateCode: workspace.stateCode,
              })
              return "Dealership name and state were sent. Nothing else."
            })}
          >
            Send these two fields
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!supabaseConfigured}
            onClick={() => void run(async () => {
              const pulled = await pullWorkspaceSettings()
              if (!pulled) return "No workspace settings row yet."
              setRemote(pulled)
              return "Remote settings are shown below. They are not applied until you say so."
            })}
          >
            Read remote settings
          </Button>
        </div>
        {remote ? (
          <div className="mt-3">
            <p className="text-sm">Remote: {remote.dealershipName} · {remote.stateCode}</p>
            <Button
              className="mt-2"
              type="button"
              onClick={() => {
                if (!PROFILES.some((item) => item.code === remote.stateCode)) {
                  setError("The remote state code is not in the worksheet.")
                  return
                }
                void store.updateWorkspace({
                  dealershipName: remote.dealershipName,
                  stateCode: remote.stateCode,
                })
              }}
            >
              Apply remote name and state on this device
            </Button>
          </div>
        ) : null}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Restore file</h2>
        <p className="mt-1 text-sm leading-6">A JSON copy of the lot file, including photos, downloads to this device. RepoFuse does not upload it. Restoring replaces the file already here.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void run(async () => { await store.downloadRestore(); return "Restore file downloaded." })}>
            Download restore file
          </Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-800">
            Restore from file
            <input
              className="sr-only"
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                if (!window.confirm("Restoring replaces the lot file on this device.")) return
                void run(async () => {
                  await store.restoreFromFile(file)
                  return "Lot file restored on this device."
                })
              }}
            />
          </label>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Sample buyers</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void run(() => store.loadSample())}>Load sample lot</Button>
          <Button type="button" variant="ghost" onClick={() => void run(() => store.clearSample())}>Remove samples</Button>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Erase this device</h2>
        <p className="mt-1 text-sm leading-6">Deletes the IndexedDB lot file in this browser. Export a packet or restore file first. Type ERASE.</p>
        <TextInput className="mt-3" value={eraseText} onChange={(event) => setEraseText(event.target.value)} aria-label="Type ERASE" />
        <Button
          type="button"
          variant="danger"
          className="mt-3"
          disabled={eraseText !== "ERASE"}
          onClick={() => void store.eraseEverything()}
        >
          Erase lot file
        </Button>
      </Card>
      {message ? <Banner tone="good">{message}</Banner> : null}
      {error ? <p role="alert" className="text-sm font-semibold text-rose">{error}</p> : null}
      <p className="text-sm leading-6 text-ink-soft dark:text-paper/70">{LEGAL_DISCLAIMER}</p>
    </div>
  )
}
