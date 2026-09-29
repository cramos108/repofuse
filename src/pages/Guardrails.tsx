import { useState } from "react"
import { useParams } from "react-router-dom"
import { Banner, Button, Card, errorText } from "../components/ui"
import { postItems, preItems } from "../domain/checklists"
import { formatStamp, todayIso } from "../domain/dates"
import { getProfile } from "../domain/profiles"
import { computeStage } from "../domain/stage"
import { useStore } from "../state/Store"

export default function GuardrailsPage() {
  const { id = "" } = useParams()
  const store = useStore()
  const account = store.accounts.find((item) => item.id === id)
  const workspace = store.workspace
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [word, setWord] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  if (!account || !workspace) return null
  const profile = getProfile(workspace.stateCode)
  const stage = computeStage({
    account,
    profile,
    workspace,
    notices: store.notices,
    checks: store.checks,
  })
  const pre = preItems(profile, workspace)
  const post = postItems(profile)
  const acks = store.checks.filter((check) => check.accountId === account.id)

  async function acknowledge(key: string, confirmWord: boolean) {
    setFormError(null)
    if (confirmWord && word.trim() !== "CONFIRM") {
      setFormError("Type CONFIRM to record this guardrail.")
      return
    }
    try {
      await store.ackCheck(account!.id, key)
      setOpenKey(null)
      setWord("")
    } catch (reason) {
      setFormError(errorText(reason))
    }
  }

  return (
    <div className="space-y-4">
      <Banner tone={stage.stage === "ready_for_recovery" ? "good" : "info"}>
        {stage.stage === "ready_for_recovery"
          ? "Pre-recovery guardrails are complete and any armed window has cleared."
          : stage.blockers[0] ?? stage.label}
        {!workspace.counselConfirmedAt ? " This profile is not marked counsel-confirmed." : ""}
      </Banner>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Before recovery</h2>
        {pre.map((item) => {
          const ack = acks.find((check) => check.itemKey === item.key && !check.voided)
          const cureLocked = item.key === "cure_elapsed" && (!stage.earliestReadyOn || todayIso() < stage.earliestReadyOn)
          return (
            <Card key={item.key}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{item.title}</h3>
                {ack ? <span className="text-xs font-semibold text-pine">Recorded</span> : null}
              </div>
              {ack ? (
                <p className="mt-2 text-sm leading-6">
                  {formatStamp(ack.ackedAt)} · {ack.operatorName}
                  <button type="button" className="ml-3 font-semibold underline" onClick={() => void store.voidCheck(ack.id)}>
                    Void
                  </button>
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    className="mt-3 text-sm font-semibold underline"
                    onClick={() => {
                      setOpenKey(openKey === item.key ? null : item.key)
                      setWord("")
                      setFormError(null)
                    }}
                  >
                    {openKey === item.key ? "Close" : "Open acknowledgment"}
                  </button>
                  {openKey === item.key ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm leading-6">{item.statement}</p>
                      {cureLocked ? (
                        <Banner tone="warn">This stays closed until the armed window clears{stage.earliestReadyOn ? ` on ${stage.earliestReadyOn}` : ""}.</Banner>
                      ) : null}
                      {item.confirmWord ? (
                        <label className="block text-sm font-semibold">
                          Type CONFIRM
                          <input className="field mt-1" value={word} autoComplete="off" onChange={(event) => setWord(event.target.value)} />
                        </label>
                      ) : null}
                      <Button type="button" disabled={cureLocked} onClick={() => void acknowledge(item.key, item.confirmWord)}>
                        Record acknowledgment
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </Card>
          )
        })}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">After recovery</h2>
        {post.map((item) => {
          const ack = acks.find((check) => check.itemKey === item.key && !check.voided)
          return (
            <Card key={item.key}>
              <h3 className="font-semibold">{item.title}</h3>
              {ack ? (
                <p className="mt-2 text-sm">
                  {formatStamp(ack.ackedAt)} · {ack.operatorName}
                  <button type="button" className="ml-3 font-semibold underline" onClick={() => void store.voidCheck(ack.id)}>
                    Void
                  </button>
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm leading-6">{item.statement}</p>
                  {item.confirmWord ? (
                    <label className="mt-3 block text-sm font-semibold">
                      Type CONFIRM
                      <input className="field mt-1" value={openKey === item.key ? word : ""} autoComplete="off" onFocus={() => setOpenKey(item.key)} onChange={(event) => { setOpenKey(item.key); setWord(event.target.value) }} />
                    </label>
                  ) : null}
                  <Button className="mt-3" type="button" onClick={() => void acknowledge(item.key, item.confirmWord)}>
                    Record acknowledgment
                  </Button>
                </>
              )}
            </Card>
          )
        })}
      </section>
      {formError ? <p role="alert" className="text-sm font-semibold text-rose">{formError}</p> : null}
    </div>
  )
}
