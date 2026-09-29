import { useEffect, useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { Banner, Button, Card, Field, TextInput, errorText } from "../components/ui"
import { formatLongDate, formatStamp, todayIso } from "../domain/dates"
import { dollarsInput, formatMoney, parseDollars, redemptionTotal, reinstatementTotal, saleBalance, storageCents } from "../domain/money"
import { getProfile } from "../domain/profiles"
import { worksheetInput } from "../domain/packet"
import { computeStage, earliestDispositionOn } from "../domain/stage"
import { useStore } from "../state/Store"

export default function PostRepoPage() {
  const { id = "" } = useParams()
  const store = useStore()
  const account = store.accounts.find((item) => item.id === id)
  const workspace = store.workspace
  const [when, setWhen] = useState("")
  const [facility, setFacility] = useState("")
  const [overrideWord, setOverrideWord] = useState("")
  const [daily, setDaily] = useState("")
  const [asOf, setAsOf] = useState(todayIso())
  const [credit, setCredit] = useState("")
  const [expenseLabel, setExpenseLabel] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [saleOn, setSaleOn] = useState("")
  const [proceeds, setProceeds] = useState("")
  const [overrideDays, setOverrideDays] = useState("")
  const [overrideReason, setOverrideReason] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!account) return
    setDaily(account.storageDailyCents ? dollarsInput(account.storageDailyCents) : "")
    setCredit(account.unearnedCreditCents ? dollarsInput(account.unearnedCreditCents) : "")
    setAsOf(account.storageAsOf || todayIso())
    setFacility(account.storageFacility)
    setOverrideDays(account.dispositionWaitOverride?.toString() ?? "")
    setOverrideReason(account.dispositionWaitReason)
  }, [account])

  if (!account || !workspace) return null

  const profile = getProfile(workspace.stateCode)
  const stage = computeStage({
    account,
    profile,
    workspace,
    notices: store.notices,
    checks: store.checks,
  })
  const expenses = store.expenses.filter((line) => line.accountId === account.id)
  const sheet = worksheetInput(
    {
      ...account,
      storageDailyCents: parseDollars(daily) ?? account.storageDailyCents,
      unearnedCreditCents: parseDollars(credit) ?? account.unearnedCreditCents,
      storageAsOf: asOf || account.storageAsOf,
    },
    expenses,
  )
  const redemption = redemptionTotal(sheet)
  const balance = saleBalance(sheet)
  const wait = account.dispositionWaitOverride ?? workspace.armedDispositionWaitDays
  const earliest = earliestDispositionOn({
    profile,
    waitDays: wait,
    notices: store.notices.filter((notice) => notice.accountId === account.id),
  })

  async function saveFigures(event: FormEvent) {
    event.preventDefault()
    const storageDailyCents = parseDollars(daily)
    const unearnedCreditCents = parseDollars(credit)
    if (storageDailyCents == null || unearnedCreditCents == null) {
      setFormError("Enter storage and credit as dollar amounts.")
      return
    }
    try {
      await store.patchAccount(
        account!.id,
        { storageDailyCents, storageAsOf: asOf, unearnedCreditCents, storageFacility: facility },
        "Post-repo worksheet figures updated.",
      )
      setFormError(null)
    } catch (reason) {
      setFormError(errorText(reason))
    }
  }

  return (
    <div className="space-y-4">
      {!account.recoveredAt ? (
        <Card>
          <h2 className="text-lg font-semibold">Log recovery</h2>
          <p className="mt-1 text-sm leading-6">This records that the vehicle is in the lot’s possession. It does not describe how to recover it.</p>
          {stage.stage === "cure_active" ? (
            <Banner tone="warn">The cure window is still open. Logging recovery now is written into the audit as an early recovery.</Banner>
          ) : null}
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              const at = when ? new Date(when).toISOString() : new Date().toISOString()
              const override = stage.stage === "cure_active"
              if (override && overrideWord !== "CONFIRM") {
                setFormError("Type CONFIRM to log a recovery during an open cure window.")
                return
              }
              void store.logRecovery(account.id, at, facility, override).catch((reason: unknown) => setFormError(errorText(reason)))
            }}
          >
            <Field label="When">
              <TextInput type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
            </Field>
            <Field label="Storage facility">
              <TextInput value={facility} onChange={(event) => setFacility(event.target.value)} />
            </Field>
            {stage.stage === "cure_active" ? (
              <Field label="Type CONFIRM to override the open window">
                <TextInput value={overrideWord} onChange={(event) => setOverrideWord(event.target.value)} autoComplete="off" />
              </Field>
            ) : null}
            <Button type="submit" variant={stage.stage === "cure_active" ? "danger" : "primary"}>
              {stage.stage === "cure_active" ? "Log recovery anyway" : "Log recovery"}
            </Button>
          </form>
        </Card>
      ) : (
        <Banner tone="good">
          Recovered {formatStamp(account.recoveredAt)}
          {account.storageFacility ? ` · ${account.storageFacility}` : ""}
        </Banner>
      )}
      {stage.warnings.map((warning) => (
        <Banner key={warning} tone="warn">{warning}</Banner>
      ))}

      <Card>
        <h2 className="text-lg font-semibold">Redemption worksheet</h2>
        <p className="mt-1 text-sm leading-6">
          Payoff + expenses + storage − unearned credit. {profile.reinstatement === "none"
            ? "This profile does not flag a statutory reinstatement right, so no reinstatement figure is shown."
            : "The reinstatement line is past due + expenses + storage, without the unearned-credit subtraction."}
        </p>
        <form onSubmit={(event) => void saveFigures(event)} className="mt-4 space-y-3">
          <Field label="Daily storage">
            <TextInput inputMode="decimal" value={daily} onChange={(event) => setDaily(event.target.value)} />
          </Field>
          <Field label="Storage as of">
            <TextInput type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
          </Field>
          <Field label="Unearned finance or insurance credit">
            <TextInput inputMode="decimal" value={credit} onChange={(event) => setCredit(event.target.value)} />
          </Field>
          <Button type="submit" variant="secondary">Save figures</Button>
        </form>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Payoff" value={formatMoney(sheet.payoffCents)} />
          <Row label="Expenses" value={formatMoney(sheet.expenseCents)} />
          <Row label="Storage" value={`${sheet.storageDays} days × ${formatMoney(sheet.storageDailyCents)} = ${formatMoney(storageCents(sheet.storageDays, sheet.storageDailyCents))}`} />
          <Row label="Unearned credit" value={formatMoney(sheet.unearnedCreditCents)} />
          <Row label="Redemption worksheet" value={formatMoney(redemption)} />
          {profile.reinstatement !== "none" ? <Row label="Reinstatement worksheet" value={formatMoney(reinstatementTotal(sheet))} /> : null}
        </dl>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            const amount = parseDollars(expenseAmount)
            if (amount == null) {
              setFormError("Enter the expense amount in dollars.")
              return
            }
            void store.addExpense(account.id, expenseLabel, amount).then(() => {
              setExpenseLabel("")
              setExpenseAmount("")
            }).catch((reason: unknown) => setFormError(errorText(reason)))
          }}
        >
          <TextInput value={expenseLabel} onChange={(event) => setExpenseLabel(event.target.value)} placeholder="Expense" aria-label="Expense" />
          <TextInput inputMode="decimal" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0.00" aria-label="Expense amount" />
          <Button type="submit" variant="secondary">Add</Button>
        </form>
        <ul className="mt-3 space-y-2 text-sm">
          {expenses.map((line) => (
            <li key={line.id} className="flex items-center justify-between gap-3">
              <span>{line.label} · {formatMoney(line.amountCents)}</span>
              <button type="button" className="font-semibold underline" onClick={() => void store.removeExpense(line.id)}>Remove</button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Disposition</h2>
        <p className="mt-1 text-sm leading-6">
          Earliest sale date on this worksheet: {earliest ? formatLongDate(earliest) : "log a notice of intent to dispose first"}.
          Wait in use: {wait} days.
        </p>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            const days = Number(overrideDays)
            if (overrideDays && (!Number.isInteger(days) || days < 1 || overrideReason.trim().length < 12)) {
              setFormError("An override needs whole days and a reason of at least 12 characters.")
              return
            }
            void store.patchAccount(
              account.id,
              {
                dispositionWaitOverride: overrideDays ? days : null,
                dispositionWaitReason: overrideDays ? overrideReason.trim() : "",
              },
              "Disposition wait override updated.",
            )
          }}
        >
          <Field label="Counsel override days for this account" hint="Leave blank to use the lot worksheet.">
            <TextInput inputMode="numeric" value={overrideDays} onChange={(event) => setOverrideDays(event.target.value)} />
          </Field>
          <Field label="Reason">
            <TextInput value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} />
          </Field>
          <Button type="submit" variant="secondary">Save override</Button>
        </form>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            const amount = parseDollars(proceeds)
            if (amount == null || !saleOn) {
              setFormError("Enter the sale date and proceeds.")
              return
            }
            void store.logDisposition(account.id, saleOn, amount).catch((reason: unknown) => setFormError(errorText(reason)))
          }}
        >
          <Field label="Sale date">
            <TextInput type="date" min={earliest ?? undefined} value={saleOn} onChange={(event) => setSaleOn(event.target.value)} />
          </Field>
          <Field label="Sale proceeds">
            <TextInput inputMode="decimal" value={proceeds} onChange={(event) => setProceeds(event.target.value)} />
          </Field>
          <Button type="submit">Log disposition</Button>
        </form>
        {balance ? (
          <p className="mt-3 text-sm font-semibold">
            {balance.kind === "deficiency" ? "Deficiency" : balance.kind === "surplus" ? "Surplus" : "Even"} worksheet: {formatMoney(balance.cents)}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void store.markRedeemed(account.id)}>
            Mark redeemed
          </Button>
          <Button type="button" variant="ghost" onClick={() => void store.markClosed(account.id)}>
            Close without sale
          </Button>
          {account.closedAs ? (
            <Button type="button" variant="ghost" onClick={() => void store.reopen(account.id)}>
              Reopen
            </Button>
          ) : null}
        </div>
        <p className="mt-4 text-sm">
          Personal property lives on the <Link className="font-semibold underline" to={`/app/accounts/${account.id}/field`}>Field tab</Link>.
        </p>
      </Card>
      {formError ? <p role="alert" className="text-sm font-semibold text-rose">{formError}</p> : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}
