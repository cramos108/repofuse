import { useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { Banner, Button, Card, Field, SelectInput, TextInput, Area, errorText } from "../components/ui"
import { formatLongDate, formatStamp, todayIso } from "../domain/dates"
import { CHANNEL_LABEL, METHOD_LABEL, NOTICE_LABEL } from "../domain/labels"
import type { ContactChannel, NoticeKind, NoticeMethod } from "../domain/types"
import { useStore } from "../state/Store"

export default function TimelinePage() {
  const { id = "" } = useParams()
  const store = useStore()
  const account = store.accounts.find((item) => item.id === id)
  const [kind, setKind] = useState<NoticeKind>("right_to_cure")
  const [method, setMethod] = useState<NoticeMethod>("certified_mail")
  const [tracking, setTracking] = useState("")
  const [sentOn, setSentOn] = useState(todayIso())
  const [outside, setOutside] = useState(false)
  const [notes, setNotes] = useState("")
  const [channel, setChannel] = useState<ContactChannel>("phone")
  const [contact, setContact] = useState("")
  const [cureOn, setCureOn] = useState(todayIso())
  const [formError, setFormError] = useState<string | null>(null)

  if (!account) return null
  const notices = store.notices.filter((notice) => notice.accountId === account.id)
  const contacts = store.contacts.filter((row) => row.accountId === account.id)
  const events = store.events
    .filter((event) => event.accountId === account.id)
    .sort((a, b) => b.at.localeCompare(a.at))

  async function onNotice(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await store.addNotice({
        accountId: account!.id,
        kind,
        method,
        trackingNumber: tracking,
        sentOn,
        mailedOutOfState: outside,
        notes,
      })
      setTracking("")
      setNotes("")
    } catch (reason) {
      setFormError(errorText(reason))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link to={`/app/accounts/${account.id}/edit`} className="text-sm font-semibold underline">
          Edit file
        </Link>
      </div>
      <Card>
        <h2 className="text-lg font-semibold">Log a notice</h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft dark:text-paper/70">
          RepoFuse records that a notice went out. It does not draft the statutory form. Certified mail cannot be saved without a tracking number.
        </p>
        <form onSubmit={(event) => void onNotice(event)} className="mt-4 space-y-3">
          <Field label="Notice">
            <SelectInput value={kind} onChange={(event) => setKind(event.target.value as NoticeKind)}>
              {Object.entries(NOTICE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Method">
            <SelectInput value={method} onChange={(event) => setMethod(event.target.value as NoticeMethod)}>
              {Object.entries(METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Sent date">
            <TextInput type="date" value={sentOn} onChange={(event) => setSentOn(event.target.value)} required />
          </Field>
          <Field label="Tracking number" hint={method === "certified_mail" ? "Required for certified mail." : "Optional."}>
            <TextInput value={tracking} onChange={(event) => setTracking(event.target.value)} />
          </Field>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input type="checkbox" className="mt-1" checked={outside} onChange={(event) => setOutside(event.target.checked)} />
            Mailed from outside the state, or to an address outside the state. California disposition timing uses 20 days when this is checked.
          </label>
          <Field label="Note">
            <Area value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          {formError ? <p role="alert" className="text-sm font-semibold text-rose">{formError}</p> : null}
          <Button type="submit">Save notice on this device</Button>
        </form>
        <ul className="mt-5 space-y-3 text-sm">
          {notices.map((notice) => (
            <li key={notice.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <p className={notice.voided ? "line-through opacity-60" : ""}>
                {formatLongDate(notice.sentOn)} · {NOTICE_LABEL[notice.kind]} · {METHOD_LABEL[notice.method]}
                {notice.trackingNumber ? ` · ${notice.trackingNumber}` : ""}
              </p>
              {notice.notes ? <p className="mt-1 text-ink-soft dark:text-paper/70">{notice.notes}</p> : null}
              {!notice.voided ? (
                <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => void store.voidNotice(notice.id)}>
                  Void
                </button>
              ) : (
                <p className="mt-1 text-xs font-semibold uppercase">Voided</p>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Debtor contact</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void store.addContact(account.id, channel, contact).then(() => setContact("")).catch((reason: unknown) => setFormError(errorText(reason)))
          }}
        >
          <Field label="Channel">
            <SelectInput value={channel} onChange={(event) => setChannel(event.target.value as ContactChannel)}>
              {Object.entries(CHANNEL_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="What happened">
            <Area value={contact} onChange={(event) => setContact(event.target.value)} />
          </Field>
          <Button type="submit">Save contact</Button>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {contacts.map((row) => (
            <li key={row.id}>
              {formatStamp(row.at)} · {CHANNEL_LABEL[row.channel]} · {row.summary}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Cure received</h2>
        <p className="mt-1 text-sm leading-6">Logging a cure clears the current notice. RepoFuse asks for a new notice on the next default, which is the stricter path.</p>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            void store.logCure(account.id, cureOn)
          }}
        >
          <TextInput type="date" value={cureOn} onChange={(event) => setCureOn(event.target.value)} aria-label="Cure date" />
          <Button type="submit" variant="secondary">Log cure</Button>
        </form>
        {account.lastCureOn ? <Banner tone="good">Last cure logged {formatLongDate(account.lastCureOn)}.</Banner> : null}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Audit</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {events.map((event) => (
            <li key={event.id}>
              {formatStamp(event.at)} · {event.summary}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
