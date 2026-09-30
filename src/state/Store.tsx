import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { findItem } from "../domain/checklists"
import { AccountLimitError, remainingOpenSlots } from "../domain/limits"
import { assertAccess } from "../domain/roles"
import { getProfile } from "../domain/profiles"
import { computeStage, earliestDispositionOn } from "../domain/stage"
import type {
  Account,
  AuditEvent,
  ChecklistAck,
  ContactChannel,
  ContactRecord,
  ExpenseLine,
  InventoryItem,
  LotSnapshot,
  NoticeKind,
  NoticeMethod,
  NoticeRecord,
  PhotoRecord,
  Workspace,
} from "../domain/types"
import type { Seat } from "../domain/roles"
import { todayIso } from "../domain/dates"
import {
  deleteAccountGraph,
  deleteExpense,
  eraseLot,
  exportSnapshot,
  loadLot,
  photosForAccount,
  putAccount,
  putCheck,
  putContact,
  putExpense,
  putInventory,
  putNotice,
  putSpot,
  replaceLot,
  saveWorkspace,
  type LotData,
} from "../lib/db"
import { uid } from "../lib/id"
import { compressImage } from "../lib/images"
import { buildSample } from "../lib/sample"
import { currentSession, fetchLicenseTier, fetchOwnMembership, pullWorkspaceSettings, signOutPro, supabase } from "../lib/supabase"

const EMPTY: LotData = {
  workspace: null,
  accounts: [],
  events: [],
  notices: [],
  contacts: [],
  checks: [],
  spots: [],
  inventory: [],
  expenses: [],
}

export interface SetupInput {
  dealershipName: string
  lotCity: string
  operatorName: string
  stateCode: string
  armedCureDays: number | null
  contractualGraceDays: number
  armedDispositionWaitDays: number
  cureWaived: boolean
  cureWaivedReason: string
  counselConfirmed: boolean
  operatorRole: Workspace["operatorRole"]
}

export interface AccountInput {
  borrowerName: string
  accountNumber: string
  phone: string
  address: string
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  vin: string
  stockNumber: string
  amountPastDueCents: number
  payoffCents: number
  defaultDate: string
  notes: string
}

export interface NoticeInput {
  accountId: string
  kind: NoticeKind
  method: NoticeMethod
  trackingNumber: string
  sentOn: string
  mailedOutOfState: boolean
  notes: string
}

interface StoreValue extends LotData {
  ready: boolean
  error: string | null
  authReady: boolean
  session: { userId: string; email: string } | null
  seat: Seat
  saveSetup: (input: SetupInput) => Promise<void>
  signOut: () => Promise<void>
  updateWorkspace: (patch: Partial<Workspace>) => Promise<void>
  setTier: (tier: Workspace["tier"], email: string | null) => Promise<void>
  refreshLicense: () => Promise<string>
  createAccount: (input: AccountInput) => Promise<string>
  updateAccount: (id: string, input: AccountInput) => Promise<void>
  patchAccount: (id: string, patch: Partial<Account>, summary: string, kind?: "ledger" | "field") => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  addNotice: (input: NoticeInput) => Promise<void>
  voidNotice: (id: string) => Promise<void>
  addContact: (accountId: string, channel: ContactChannel, summary: string) => Promise<void>
  ackCheck: (accountId: string, itemKey: string) => Promise<void>
  voidCheck: (id: string) => Promise<void>
  logCure: (accountId: string, curedOn: string) => Promise<void>
  addSpot: (input: {
    accountId: string
    latitude: number | null
    longitude: number | null
    accuracyMeters: number | null
    placeNote: string
    observation: string
    authorityAttested: boolean
    files: File[]
  }) => Promise<void>
  addInventory: (input: {
    accountId: string
    description: string
    condition: string
    storageLocation: string
  }) => Promise<void>
  releaseInventory: (id: string, releasedTo: string) => Promise<void>
  addExpense: (accountId: string, label: string, amountCents: number) => Promise<void>
  removeExpense: (id: string) => Promise<void>
  logRecovery: (accountId: string, at: string, facility: string, overrideOpenCure: boolean) => Promise<void>
  logDisposition: (accountId: string, saleOn: string, proceedsCents: number) => Promise<void>
  markRedeemed: (accountId: string) => Promise<void>
  markClosed: (accountId: string) => Promise<void>
  reopen: (accountId: string) => Promise<void>
  loadSample: () => Promise<void>
  clearSample: () => Promise<void>
  downloadRestore: () => Promise<void>
  restoreFromFile: (file: File) => Promise<void>
  eraseEverything: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lot, setLot] = useState<LotData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<{ userId: string; email: string } | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [seat, setSeat] = useState<Seat>("owner")
  const seatRef = useRef<Seat>("owner")
  seatRef.current = seat
  const lotRef = useRef<LotData>(EMPTY)

  const reload = useCallback(async () => {
    const next = await loadLot()
    lotRef.current = next
    setLot(next)
    return next
  }, [])

  useEffect(() => {
    let cancelled = false
    reload().catch((reason: unknown) => {
      if (cancelled) return
      setError(reason instanceof Error ? reason.message : "This browser blocked on-device storage.")
    })
    return () => {
      cancelled = true
    }
  }, [reload])

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }
    let unsubscribe = () => {}
    currentSession()
      .then((next) => setSession(next))
      .catch(() => setSession(null))
      .finally(() => setAuthReady(true))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      const user = next?.user
      setSession(user ? { userId: user.id, email: user.email ?? "" } : null)
      setAuthReady(true)
    })
    unsubscribe = () => data.subscription.unsubscribe()
    return unsubscribe
  }, [])

  const requireWorkspace = useCallback(() => {
    const workspace = lotRef.current.workspace
    if (!workspace) throw new Error("Finish state setup before logging a file.")
    return workspace
  }, [])

  const gate = useCallback((workspace: Workspace, kind: "ledger" | "field") => {
    assertAccess(workspace, kind, seatRef.current)
  }, [])

  const requireAccount = useCallback((id: string) => {
    const account = lotRef.current.accounts.find((item) => item.id === id)
    if (!account) throw new Error("That account is not on this device.")
    return account
  }, [])

  const stampAccount = useCallback((account: Account) => {
    return { ...account, updatedAt: new Date().toISOString() }
  }, [])

  const makeEvent = useCallback(
    (accountId: string, kind: AuditEvent["kind"], summary: string): AuditEvent => ({
      id: uid("evt"),
      accountId,
      at: new Date().toISOString(),
      kind,
      summary,
    }),
    [],
  )

  const saveSetup = useCallback(
    async (input: SetupInput) => {
      const current = lotRef.current.workspace
      const now = new Date().toISOString()
      const workspace: Workspace = {
        id: "workspace",
        dealershipName: input.dealershipName.trim(),
        lotCity: input.lotCity.trim(),
        stateCode: input.stateCode,
        setupComplete: true,
        contractualGraceDays: input.contractualGraceDays,
        armedCureDays: input.armedCureDays,
        armedDispositionWaitDays: input.armedDispositionWaitDays,
        cureWaived: input.cureWaived,
        cureWaivedReason: input.cureWaived ? input.cureWaivedReason.trim() : "",
        counselConfirmedAt: input.counselConfirmed ? current?.counselConfirmedAt ?? now : null,
        counselConfirmedBy: input.counselConfirmed ? input.operatorName.trim() : "",
        operatorName: input.operatorName.trim(),
        operatorRole: input.operatorRole,
        tier: current?.tier ?? "free",
        proEmail: current?.proEmail ?? null,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      }
      if (input.counselConfirmed && !current?.counselConfirmedAt) {
        workspace.counselConfirmedAt = now
      }
      await saveWorkspace(workspace)
      await reload()
    },
    [reload],
  )

  const updateWorkspace = useCallback(
    async (patch: Partial<Workspace>) => {
      const current = requireWorkspace()
      await saveWorkspace({ ...current, ...patch, id: "workspace", updatedAt: new Date().toISOString() })
      await reload()
    },
    [reload, requireWorkspace],
  )

  const setTier = useCallback(
    async (tier: Workspace["tier"], email: string | null) => {
      const current = lotRef.current.workspace
      if (!current) return
      if (current.tier === tier && current.proEmail === email) return
      await saveWorkspace({ ...current, tier, proEmail: email, updatedAt: new Date().toISOString() })
      await reload()
    },
    [reload],
  )

  const refreshLicense = useCallback(async () => {
    const current = lotRef.current.workspace
    if (!current) return "Finish setup before checking a license."
    try {
      const active = await currentSession()
      if (!active) return "Sign in to open the lot. The file on this device was not changed."
      const [tier, remote, membership] = await Promise.all([
        fetchLicenseTier(active.userId),
        pullWorkspaceSettings().catch(() => null),
        fetchOwnMembership().catch(() => null),
      ])
      const nextTier = membership ? "pro" : tier
      const nextRole = membership?.role ?? remote?.operatorRole ?? current.operatorRole ?? "collections"
      setSeat(membership ? "member" : "owner")
      if (current.tier !== nextTier || current.proEmail !== active.email || current.operatorRole !== nextRole) {
        await saveWorkspace({
          ...current,
          tier: nextTier,
          proEmail: active.email,
          operatorRole: nextRole,
          updatedAt: new Date().toISOString(),
        })
        await reload()
      }
      if (membership) return `Signed in as ${active.email}. This seat is ${nextRole} on a Pro dealership. The lot file was not uploaded.`
      return nextTier === "pro"
        ? `Pro is active for ${active.email}. The lot file was not uploaded.`
        : `Signed in as ${active.email}. Free is one role on this device.`
    } catch (reason) {
      return reason instanceof Error ? reason.message : "The license check failed. The cached tier was left as-is."
    }
  }, [reload])

  const signOut = useCallback(async () => {
    await signOutPro()
    setSession(null)
    setSeat("owner")
    const current = lotRef.current.workspace
    if (!current) return
    await saveWorkspace({ ...current, tier: "free", proEmail: null, updatedAt: new Date().toISOString() })
    await reload()
  }, [reload])

  const workspaceId = lot?.workspace?.id
  useEffect(() => {
    if (!authReady || !session || !workspaceId) return
    void refreshLicense()
  }, [authReady, session, workspaceId, refreshLicense])

  const createAccount = useCallback(
    async (input: AccountInput) => {
      const workspace = requireWorkspace()
      gate(workspace, "ledger")
      if (remainingOpenSlots(lotRef.current.accounts, workspace.tier) === 0) {
        throw new AccountLimitError()
      }
      const now = new Date().toISOString()
      const account: Account = {
        ...blankAccount(uid("acct"), now),
        ...normalizeAccount(input),
      }
      await putAccount(account, makeEvent(account.id, "account_opened", `Opened ${account.borrowerName}.`))
      await reload()
      return account.id
    },
    [makeEvent, reload, requireWorkspace],
  )

  const updateAccount = useCallback(
    async (id: string, input: AccountInput) => {
      gate(requireWorkspace(), "ledger")
      const account = stampAccount({ ...requireAccount(id), ...normalizeAccount(input) })
      await putAccount(account, makeEvent(id, "account_updated", `Updated ${account.borrowerName}.`))
      await reload()
    },
    [makeEvent, reload, requireAccount, requireWorkspace, stampAccount],
  )

  const patchAccount = useCallback(
    async (id: string, patch: Partial<Account>, summary: string, kind: "ledger" | "field" = "ledger") => {
      gate(requireWorkspace(), kind)
      const account = stampAccount({ ...requireAccount(id), ...patch, id })
      await putAccount(account, makeEvent(id, "worksheet", summary))
      await reload()
    },
    [makeEvent, reload, requireAccount, requireWorkspace, stampAccount],
  )

  const deleteAccount = useCallback(
    async (id: string) => {
      gate(requireWorkspace(), "ledger")
      await deleteAccountGraph(id)
      await reload()
    },
    [reload, requireWorkspace],
  )

  const addNotice = useCallback(
    async (input: NoticeInput) => {
      gate(requireWorkspace(), "ledger")
      if (input.method === "certified_mail" && input.trackingNumber.trim().length < 4) {
        throw new Error("Certified mail needs a tracking number.")
      }
      const account = stampAccount(requireAccount(input.accountId))
      const notice: NoticeRecord = {
        id: uid("ntc"),
        accountId: input.accountId,
        kind: input.kind,
        method: input.method,
        trackingNumber: input.trackingNumber.trim(),
        sentOn: input.sentOn,
        mailedOutOfState: input.mailedOutOfState,
        notes: input.notes.trim(),
        createdAt: new Date().toISOString(),
        voided: false,
      }
      await putNotice(
        notice,
        account,
        makeEvent(account.id, "notice", `Logged ${input.kind.replaceAll("_", " ")} sent ${input.sentOn}.`),
      )
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const voidNotice = useCallback(
    async (id: string) => {
      gate(requireWorkspace(), "ledger")
      const notice = lotRef.current.notices.find((item) => item.id === id)
      if (!notice || notice.voided) return
      const account = stampAccount(requireAccount(notice.accountId))
      await putNotice(
        { ...notice, voided: true },
        account,
        makeEvent(account.id, "notice", `Voided notice ${notice.kind.replaceAll("_", " ")} dated ${notice.sentOn}.`),
      )
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const addContact = useCallback(
    async (accountId: string, channel: ContactChannel, summary: string) => {
      gate(requireWorkspace(), "ledger")
      const text = summary.trim()
      if (!text) throw new Error("Write what was said or sent.")
      const account = stampAccount(requireAccount(accountId))
      const contact: ContactRecord = {
        id: uid("ctc"),
        accountId,
        at: new Date().toISOString(),
        channel,
        summary: text,
      }
      await putContact(contact, account, makeEvent(accountId, "contact", `${channel}: ${text}`))
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const ackCheck = useCallback(
    async (accountId: string, itemKey: string) => {
      const workspace = requireWorkspace()
      gate(workspace, "field")
      const account = requireAccount(accountId)
      const profile = getProfile(workspace.stateCode)
      const item = findItem(profile, workspace, itemKey)
      if (!item) throw new Error("That guardrail is not on this state profile.")
      const existing = lotRef.current.checks.find(
        (check) => check.accountId === accountId && check.itemKey === itemKey && !check.voided,
      )
      if (existing) return
      if (item.key === "cure_elapsed") {
        const stage = computeStage({
          account,
          profile,
          workspace,
          notices: lotRef.current.notices,
          checks: lotRef.current.checks,
        })
        if (!stage.earliestReadyOn || todayIso() < stage.earliestReadyOn) {
          throw new Error("The cure window has not ended.")
        }
      }
      const check: ChecklistAck = {
        id: uid("chk"),
        accountId,
        itemKey,
        phase: item.phase,
        ackedAt: new Date().toISOString(),
        operatorName: workspace.operatorName || "Operator",
        statement: item.statement,
        voided: false,
      }
      await putCheck(
        check,
        stampAccount(account),
        makeEvent(accountId, "checklist", `Acknowledged: ${item.title}.`),
      )
      await reload()
    },
    [makeEvent, reload, requireAccount, requireWorkspace, stampAccount],
  )

  const voidCheck = useCallback(
    async (id: string) => {
      gate(requireWorkspace(), "field")
      const check = lotRef.current.checks.find((item) => item.id === id)
      if (!check || check.voided) return
      const account = stampAccount(requireAccount(check.accountId))
      await putCheck(
        { ...check, voided: true },
        account,
        makeEvent(account.id, "checklist", `Voided acknowledgment ${check.itemKey}.`),
      )
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const logCure = useCallback(
    async (accountId: string, curedOn: string) => {
      gate(requireWorkspace(), "ledger")
      const account = stampAccount({ ...requireAccount(accountId), lastCureOn: curedOn })
      await putAccount(account, makeEvent(accountId, "cure_received", `Cure logged on ${curedOn}.`))
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const addSpot = useCallback(
    async (input: {
      accountId: string
      latitude: number | null
      longitude: number | null
      accuracyMeters: number | null
      placeNote: string
      observation: string
      authorityAttested: boolean
      files: File[]
    }) => {
      gate(requireWorkspace(), "field")
      if (!input.authorityAttested) {
        throw new Error("Attest that this spot is for an account the dealership services.")
      }
      if (input.files.length > 6) throw new Error("Store up to 6 photos on one spot.")
      const account = stampAccount(requireAccount(input.accountId))
      const spotId = uid("spt")
      const photos: PhotoRecord[] = []
      for (const file of input.files) {
        const blob = await compressImage(file)
        photos.push({
          id: uid("img"),
          accountId: input.accountId,
          spotId,
          createdAt: new Date().toISOString(),
          fileName: file.name || "photo.jpg",
          mime: blob.type || "image/jpeg",
          blob,
        })
      }
      await putSpot(
        {
          id: spotId,
          accountId: input.accountId,
          at: new Date().toISOString(),
          latitude: input.latitude,
          longitude: input.longitude,
          accuracyMeters: input.accuracyMeters,
          placeNote: input.placeNote.trim(),
          observation: input.observation.trim(),
          authorityAttested: true,
          photoIds: photos.map((photo) => photo.id),
        },
        photos,
        account,
        makeEvent(account.id, "spot", `Field spot logged${photos.length ? ` with ${photos.length} photo(s)` : ""}.`),
      )
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const addInventory = useCallback(
    async (input: { accountId: string; description: string; condition: string; storageLocation: string }) => {
      gate(requireWorkspace(), "field")
      const description = input.description.trim()
      if (!description) throw new Error("Describe the item.")
      const account = stampAccount(requireAccount(input.accountId))
      const item: InventoryItem = {
        id: uid("inv"),
        accountId: input.accountId,
        description,
        condition: input.condition.trim(),
        storageLocation: input.storageLocation.trim(),
        status: "held",
        createdAt: new Date().toISOString(),
        releasedAt: null,
        releasedTo: "",
      }
      await putInventory(item, account, makeEvent(account.id, "inventory", `Inventory: ${description}.`))
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const releaseInventory = useCallback(
    async (id: string, releasedTo: string) => {
      gate(requireWorkspace(), "field")
      const item = lotRef.current.inventory.find((row) => row.id === id)
      if (!item) return
      const account = stampAccount(requireAccount(item.accountId))
      await putInventory(
        {
          ...item,
          status: "released",
          releasedAt: new Date().toISOString(),
          releasedTo: releasedTo.trim(),
        },
        account,
        makeEvent(account.id, "inventory", `Released ${item.description} to ${releasedTo.trim() || "the claimant"}.`),
      )
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const addExpense = useCallback(
    async (accountId: string, label: string, amountCents: number) => {
      gate(requireWorkspace(), "ledger")
      if (!label.trim()) throw new Error("Name the expense.")
      const account = stampAccount(requireAccount(accountId))
      const expense: ExpenseLine = {
        id: uid("exp"),
        accountId,
        label: label.trim(),
        amountCents,
      }
      await putExpense(expense, account, makeEvent(accountId, "worksheet", `Expense added: ${expense.label}.`))
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const removeExpense = useCallback(
    async (id: string) => {
      gate(requireWorkspace(), "ledger")
      const expense = lotRef.current.expenses.find((row) => row.id === id)
      if (!expense) return
      const account = stampAccount(requireAccount(expense.accountId))
      await deleteExpense(id, account, makeEvent(account.id, "worksheet", `Expense removed: ${expense.label}.`))
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const logRecovery = useCallback(
    async (accountId: string, at: string, facility: string, overrideOpenCure: boolean) => {
      const workspace = requireWorkspace()
      gate(workspace, "field")
      const account = requireAccount(accountId)
      const stage = computeStage({
        account,
        profile: getProfile(workspace.stateCode),
        workspace,
        notices: lotRef.current.notices,
        checks: lotRef.current.checks,
      })
      if (stage.stage === "cure_active" && !overrideOpenCure) {
        throw new Error("The cure window is still open.")
      }
      const next = stampAccount({
        ...account,
        recoveredAt: at,
        propertyHoldStartsOn: account.propertyHoldStartsOn || at.slice(0, 10),
        storageFacility: facility.trim(),
        storageAsOf: at.slice(0, 10),
      })
      const summary = overrideOpenCure && stage.stage === "cure_active"
        ? "Recovery logged while the cure window was still open."
        : "Recovery logged."
      await putAccount(next, makeEvent(accountId, "recovery", summary))
      await reload()
    },
    [makeEvent, reload, requireAccount, requireWorkspace, stampAccount],
  )

  const logDisposition = useCallback(
    async (accountId: string, saleOn: string, proceedsCents: number) => {
      const workspace = requireWorkspace()
      gate(workspace, "ledger")
      const account = requireAccount(accountId)
      const profile = getProfile(workspace.stateCode)
      const wait = account.dispositionWaitOverride ?? workspace.armedDispositionWaitDays
      const earliest = earliestDispositionOn({
        profile,
        waitDays: wait,
        notices: lotRef.current.notices.filter((notice) => notice.accountId === accountId),
      })
      if (!earliest) throw new Error("Log a notice of intent to dispose before a sale date.")
      if (saleOn < earliest) {
        throw new Error(`This worksheet does not allow a sale date before ${earliest}.`)
      }
      const next = stampAccount({
        ...account,
        saleOn,
        saleProceedsCents: proceedsCents,
        closedAs: "disposed",
      })
      await putAccount(next, makeEvent(accountId, "disposition", `Disposition logged for ${saleOn}.`))
      await reload()
    },
    [makeEvent, reload, requireAccount, requireWorkspace, stampAccount],
  )

  const markRedeemed = useCallback(
    async (accountId: string) => {
      gate(requireWorkspace(), "ledger")
      const account = stampAccount({ ...requireAccount(accountId), closedAs: "redeemed", saleOn: null, saleProceedsCents: null })
      await putAccount(account, makeEvent(accountId, "disposition", "Marked redeemed."))
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const markClosed = useCallback(
    async (accountId: string) => {
      gate(requireWorkspace(), "ledger")
      const account = stampAccount({ ...requireAccount(accountId), closedAs: "closed" })
      await putAccount(account, makeEvent(accountId, "account_updated", "File closed without a sale or redemption."))
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const reopen = useCallback(
    async (accountId: string) => {
      gate(requireWorkspace(), "ledger")
      const account = stampAccount({
        ...requireAccount(accountId),
        closedAs: null,
        saleOn: null,
        saleProceedsCents: null,
      })
      await putAccount(account, makeEvent(accountId, "override", "File reopened."))
      await reload()
    },
    [makeEvent, reload, requireAccount, stampAccount],
  )

  const loadSample = useCallback(async () => {
    const workspace = requireWorkspace()
    gate(workspace, "ledger")
    if (lotRef.current.accounts.some((account) => account.sample)) return
    const slots = remainingOpenSlots(lotRef.current.accounts, workspace.tier)
    if (slots != null && slots < 2) throw new AccountLimitError()
    const bundle = buildSample(workspace, getProfile(workspace.stateCode))
    for (const account of bundle.accounts) {
      await putAccount(account, bundle.events.find((event) => event.accountId === account.id))
    }
    for (const notice of bundle.notices) {
      const account = bundle.accounts.find((item) => item.id === notice.accountId)
      if (!account) continue
      await putNotice(notice, account, makeEvent(account.id, "notice", "Sample notice logged."))
    }
    for (const check of bundle.checks) {
      const account = bundle.accounts.find((item) => item.id === check.accountId)
      if (!account) continue
      await putCheck(check, account, makeEvent(account.id, "checklist", "Sample guardrail acknowledged."))
    }
    await reload()
  }, [makeEvent, reload, requireWorkspace])

  const clearSample = useCallback(async () => {
    const ids = lotRef.current.accounts.filter((account) => account.sample).map((account) => account.id)
    for (const id of ids) await deleteAccountGraph(id)
    await reload()
  }, [reload])

  const downloadRestore = useCallback(async () => {
    const snapshot = await exportSnapshot()
    const blob = new Blob([JSON.stringify(snapshot)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `repofuse-lot-${todayIso()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const restoreFromFile = useCallback(
    async (file: File) => {
      const parsed = JSON.parse(await file.text()) as LotSnapshot
      await replaceLot(parsed)
      await reload()
    },
    [reload],
  )

  const eraseEverything = useCallback(async () => {
    await eraseLot()
    const empty = { ...EMPTY }
    lotRef.current = empty
    setLot(empty)
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      ...(lot ?? EMPTY),
      ready: lot !== null,
      error,
      authReady,
      session,
      seat,
      saveSetup,
      signOut,
      updateWorkspace,
      setTier,
      refreshLicense,
      createAccount,
      updateAccount,
      patchAccount,
      deleteAccount,
      addNotice,
      voidNotice,
      addContact,
      ackCheck,
      voidCheck,
      logCure,
      addSpot,
      addInventory,
      releaseInventory,
      addExpense,
      removeExpense,
      logRecovery,
      logDisposition,
      markRedeemed,
      markClosed,
      reopen,
      loadSample,
      clearSample,
      downloadRestore,
      restoreFromFile,
      eraseEverything,
    }),
    [
      lot,
      error,
      authReady,
      session,
      seat,
      saveSetup,
      signOut,
      updateWorkspace,
      setTier,
      refreshLicense,
      createAccount,
      updateAccount,
      patchAccount,
      deleteAccount,
      addNotice,
      voidNotice,
      addContact,
      ackCheck,
      voidCheck,
      logCure,
      addSpot,
      addInventory,
      releaseInventory,
      addExpense,
      removeExpense,
      logRecovery,
      logDisposition,
      markRedeemed,
      markClosed,
      reopen,
      loadSample,
      clearSample,
      downloadRestore,
      restoreFromFile,
      eraseEverything,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error("useStore must be used inside StoreProvider")
  return value
}

function blankAccount(id: string, now: string): Account {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    sample: false,
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
    lastCureOn: null,
    closedAs: null,
    recoveredAt: null,
    propertyHoldStartsOn: null,
    propertyHoldDays: null,
    storageFacility: "",
    storageDailyCents: 0,
    storageAsOf: null,
    unearnedCreditCents: 0,
    dispositionWaitOverride: null,
    dispositionWaitReason: "",
    saleProceedsCents: null,
    saleOn: null,
    notes: "",
  }
}

function normalizeAccount(input: AccountInput): Pick<
  Account,
  | "borrowerName"
  | "accountNumber"
  | "phone"
  | "address"
  | "vehicleYear"
  | "vehicleMake"
  | "vehicleModel"
  | "vin"
  | "stockNumber"
  | "amountPastDueCents"
  | "payoffCents"
  | "defaultDate"
  | "notes"
> {
  return {
    borrowerName: input.borrowerName.trim(),
    accountNumber: input.accountNumber.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    vehicleYear: input.vehicleYear.trim(),
    vehicleMake: input.vehicleMake.trim(),
    vehicleModel: input.vehicleModel.trim(),
    vin: input.vin.trim().toUpperCase(),
    stockNumber: input.stockNumber.trim(),
    amountPastDueCents: input.amountPastDueCents,
    payoffCents: input.payoffCents,
    defaultDate: input.defaultDate,
    notes: input.notes.trim(),
  }
}

export async function accountPhotos(accountId: string) {
  return photosForAccount(accountId)
}
