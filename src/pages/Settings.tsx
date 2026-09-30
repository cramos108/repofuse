import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ProfileCard } from "../components/ProfileCard"
import { Banner, Button, Card, Field, SelectInput, TextInput, ThemeToggle, errorText, usePageTitle } from "../components/ui"
import { LEGAL_DISCLAIMER } from "../domain/copy"
import { PROFILES, getProfile } from "../domain/profiles"
import { accessFor, roleOf, roleTitle } from "../domain/roles"
import { settingsPayload } from "../domain/syncPayload"
import type { OperatorRole } from "../domain/types"
import {
  addTeamMember,
  listTeamMembers,
  pullWorkspaceSettings,
  pushWorkspaceSettings,
  removeTeamMember,
  sendMagicLink,
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
  const [remote, setRemote] = useState<{ dealershipName: string; stateCode: string; operatorRole: OperatorRole } | null>(null)
  const [role, setRole] = useState<OperatorRole>(roleOf(workspace ?? {}))
  const [team, setTeam] = useState<{ id: string; email: string; role: OperatorRole }[]>([])
  const [teamEmail, setTeamEmail] = useState("")
  const [teamRole, setTeamRole] = useState<OperatorRole>("specialist")
  const access = workspace ? accessFor(workspace, store.seat) : null

  useEffect(() => {
    if (new URLSearchParams(location.search).get("intent") === "pro") {
      document.getElementById("pro")?.scrollIntoView({ block: "start" })
    }
  }, [location.search])

  useEffect(() => {
    setRole(roleOf(workspace ?? {}))
  }, [workspace?.operatorRole])

  useEffect(() => {
    if (!access?.team || !supabaseConfigured) return
    void listTeamMembers().then(setTeam).catch(() => setTeam([]))
  }, [access?.team])

  if (!workspace || !access) return null
  const profile = getProfile(workspace.stateCode)
  const payload = settingsPayload({
    dealershipName: workspace.dealershipName,
    stateCode: workspace.stateCode,
    operatorRole: workspace.operatorRole,
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
        <h2 className="text-lg font-semibold">{roleTitle(access.role)}</h2>
        <p className="mt-1 text-sm leading-6">
          {access?.oversight
            ? "Pro manager oversight can add collector teammates. Each teammate signs in on their own device. The lot file is not sent."
            : store.seat === "member"
              ? "This seat is a signed-in collector. The lot file on this device stays here."
              : "Free is one signed-in collections specialist. Switch to Collections Manager on Pro to add teammates. Outside agencies use a field link and do not sign in."}
        </p>
        {store.seat === "owner" ? (
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void run(async () => {
                await store.updateWorkspace({ operatorRole: role })
                if (supabaseConfigured && store.session) {
                  await pushWorkspaceSettings({
                    dealershipName: workspace.dealershipName,
                    stateCode: workspace.stateCode,
                    operatorRole: role,
                  })
                }
                return "Role saved on this device."
              })
            }}
          >
            <Field label="Role">
              <SelectInput value={role} onChange={(event) => setRole(event.target.value as OperatorRole)}>
                <option value="specialist">Collections Specialist</option>
                <option value="manager">Collections Manager</option>
              </SelectInput>
            </Field>
            <Button type="submit" variant="secondary">Save role</Button>
          </form>
        ) : null}
      </Card>
      {access.team ? (
        <Card>
          <h2 className="text-lg font-semibold">Teammates</h2>
          <p className="mt-1 text-sm leading-6">
            Pro stores the email and role only. A teammate signs in on their own device. Their browser does not receive this lot file.
          </p>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void run(async () => {
                await addTeamMember(teamEmail, teamRole)
                setTeamEmail("")
                setTeam(await listTeamMembers())
                return "Teammate saved. Only the email and role were sent."
              })
            }}
          >
            <Field label="Work email">
              <TextInput type="email" value={teamEmail} onChange={(event) => setTeamEmail(event.target.value)} required />
            </Field>
            <Field label="Role">
              <SelectInput value={teamRole} onChange={(event) => setTeamRole(event.target.value as OperatorRole)}>
                <option value="specialist">Collections Specialist</option>
                <option value="manager">Collections Manager</option>
              </SelectInput>
            </Field>
            <Button type="submit" disabled={!supabaseConfigured}>Add teammate</Button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {team.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{member.email} · {roleTitle(member.role)}</span>
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => void run(async () => {
                    await removeTeamMember(member.id)
                    setTeam(await listTeamMembers())
                    return "Teammate removed."
                  })}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
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
          Current tier: {workspace.tier === "pro" ? `Pro${workspace.proEmail ? ` · ${workspace.proEmail}` : ""}` : "Free"}
          {store.seat === "member" ? " · teammate seat" : ""}.
          Free is one signed-in collector. Pro is the multi-user tier: a Collections Manager can add collector teammates. Supabase stores those emails and roles. Borrower files are not part of either call.
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
          <Button type="button" variant="ghost" onClick={() => void run(async () => { await store.signOut(); return "Signed out. This device is back on Free. The lot file is still here." })}>
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
                operatorRole: workspace.operatorRole,
              })
              return "Dealership name, state, and role were sent. Nothing from the lot file."
            })}
          >
            Send name, state, and role
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
            <p className="text-sm">Remote: {remote.dealershipName} · {remote.stateCode} · {roleTitle(remote.operatorRole)}</p>
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
                  operatorRole: remote.operatorRole,
                })
              }}
            >
              Apply remote name, state, and role on this device
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
          {access.ledger ? (
            <Button type="button" variant="secondary" onClick={() => void run(() => store.loadSample())}>Load sample lot</Button>
          ) : (
            <p className="text-sm">Sample buyers need the collections role.</p>
          )}
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
