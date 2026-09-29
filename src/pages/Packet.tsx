import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Button, errorText, usePageTitle } from "../components/ui"
import { getProfile } from "../domain/profiles"
import { buildPacketModel } from "../domain/packet"
import { buildPdf } from "../lib/pdf"
import { accountPhotos, useStore } from "../state/Store"

export default function PacketPage() {
  usePageTitle("Packet")
  const { id = "" } = useParams()
  const store = useStore()
  const account = store.accounts.find((item) => item.id === id)
  const workspace = store.workspace
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const model = useMemo(() => {
    if (!account || !workspace) return null
    return buildPacketModel({
      workspace,
      profile: getProfile(workspace.stateCode),
      account,
      notices: store.notices,
      contacts: store.contacts,
      checks: store.checks,
      spots: store.spots,
      inventory: store.inventory,
      expenses: store.expenses,
      events: store.events,
    })
  }, [account, store.checks, store.contacts, store.events, store.expenses, store.inventory, store.notices, store.spots, workspace])

  if (!account || !model) return null

  async function download() {
    if (!model || !account) return
    setBusy(true)
    setError(null)
    try {
      const photos = await accountPhotos(account.id)
      const blob = await buildPdf(model, photos)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `repofuse-${account.accountNumber || account.id}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="space-y-4">
      <div className="no-print flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => void download()}>
          {busy ? "Building PDF…" : "Download PDF"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          Print
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm font-semibold text-rose">{error}</p> : null}
      <section className="panel p-5 text-sm leading-6">
        {model.freeBanner ? <p className="font-semibold text-rose">FREE LOT FILE — stored on this device</p> : null}
        <h2 className="mt-2 font-display text-3xl">{model.title}</h2>
        <p>{model.dealership}</p>
        <p>Operator: {model.operator}</p>
        <p>{model.stateLine}</p>
        <p>Generated {model.generatedAt}</p>
        <p className="mt-3">{model.counselLine}</p>
        {model.waiverLine ? <p>{model.waiverLine}</p> : null}
        <h3 className="mt-4 text-base font-semibold">Account</h3>
        {model.accountRows.map((row) => (
          <p key={row.label}><span className="font-semibold">{row.label}: </span>{row.value}</p>
        ))}
        <h3 className="mt-4 text-base font-semibold">Stage</h3>
        <p>{model.stageLine}</p>
        {model.warnings.map((warning) => <p key={warning}>Warning: {warning}</p>)}
        <Block title="Notices" items={model.notices} />
        <Block title="Contacts" items={model.contacts} />
        <Block title="Guardrails" items={model.checks} />
        <Block title="Field spots" items={model.spots} />
        <Block title="Personal property" items={model.inventory} />
        <h3 className="mt-4 text-base font-semibold">Post-repo worksheet</h3>
        {model.worksheet.map((row) => (
          <p key={row.label}><span className="font-semibold">{row.label}: </span>{row.value}</p>
        ))}
        <Block title="Audit" items={model.events} />
        <h3 className="mt-4 text-base font-semibold">Privacy</h3>
        {model.privacy.split("\n\n").map((paragraph) => <p key={paragraph.slice(0, 32)} className="mt-2">{paragraph}</p>)}
        <h3 className="mt-4 text-base font-semibold">Disclaimer</h3>
        <p className="mt-2">{model.disclaimer}</p>
      </section>
    </article>
  )
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {items.length === 0 ? <p>None logged.</p> : items.map((item, index) => <p key={`${title}-${index}`}>{item}</p>)}
    </>
  )
}
