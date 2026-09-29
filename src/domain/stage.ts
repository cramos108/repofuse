import { preItems } from "./checklists"
import { armedCureLength, cureMisconfigured } from "./cure"
import { calendarDaysBetween, earliestReadyDate, todayIso } from "./dates"
import type { StateProfile } from "./profiles"
import type { Account, ChecklistAck, NoticeRecord, Stage, Workspace } from "./types"

export interface StageResult {
  stage: Stage
  label: string
  blockers: string[]
  warnings: string[]
  cureEndsOn: string | null
  earliestReadyOn: string | null
  activeNoticeId: string | null
  daysRemaining: number | null
}

export function activeCureNotice(
  notices: NoticeRecord[],
  lastCureOn: string | null,
): NoticeRecord | null {
  const live = notices
    .filter((notice) => notice.kind === "right_to_cure" && !notice.voided)
    .filter((notice) => !lastCureOn || notice.sentOn > lastCureOn)
    .sort((a, b) => a.sentOn.localeCompare(b.sentOn) || a.createdAt.localeCompare(b.createdAt))
  return live.at(-1) ?? null
}

export function earliestDispositionOn(input: {
  profile: StateProfile
  waitDays: number
  notices: NoticeRecord[]
}): string | null {
  const notice = input.notices
    .filter((item) => item.kind === "intent_to_dispose" && !item.voided)
    .sort((a, b) => a.sentOn.localeCompare(b.sentOn) || a.createdAt.localeCompare(b.createdAt))
    .at(-1)
  if (!notice) return null
  let wait = input.waitDays
  if (input.profile.code === "CA" && notice.mailedOutOfState) wait = Math.max(wait, 20)
  return earliestReadyDate(notice.sentOn, wait)
}

export function computeStage(input: {
  account: Account
  profile: StateProfile
  workspace: Workspace
  notices: NoticeRecord[]
  checks: ChecklistAck[]
  now?: Date
}): StageResult {
  const now = input.now ?? new Date()
  const today = todayIso(now)
  const empty = {
    cureEndsOn: null as string | null,
    earliestReadyOn: null as string | null,
    activeNoticeId: null as string | null,
    daysRemaining: null as number | null,
  }

  if (input.account.closedAs === "redeemed") {
    return { stage: "redeemed", label: "Redeemed", blockers: [], warnings: [], ...empty }
  }
  if (input.account.closedAs === "disposed" || input.account.saleOn) {
    return { stage: "disposed", label: "Disposed", blockers: [], warnings: [], ...empty }
  }
  if (input.account.closedAs === "closed") {
    return { stage: "closed", label: "Closed", blockers: [], warnings: [], ...empty }
  }

  const cureDays = armedCureLength(input.profile, input.workspace)
  const notice = activeCureNotice(
    input.notices.filter((item) => item.accountId === input.account.id),
    input.account.lastCureOn,
  )
  let earliestReadyOn: string | null = null
  let cureEndsOn: string | null = null
  if (notice && cureDays != null) {
    earliestReadyOn = earliestReadyDate(notice.sentOn, cureDays)
    cureEndsOn = earliestReadyDate(notice.sentOn, cureDays - 1)
  }

  const warnings: string[] = []
  if (
    input.account.recoveredAt &&
    earliestReadyOn &&
    input.account.recoveredAt.slice(0, 10) < earliestReadyOn
  ) {
    warnings.push("Recovery was logged before the armed cure window ended.")
  }

  if (input.account.recoveredAt) {
    const missing = missingPreTitles(input)
    if (missing.length > 0) {
      warnings.push("Pre-recovery guardrails were not all acknowledged.")
    }
    return {
      stage: "recovered",
      label: "Recovered",
      blockers: [],
      warnings,
      cureEndsOn,
      earliestReadyOn,
      activeNoticeId: notice?.id ?? null,
      daysRemaining: null,
    }
  }

  if (cureMisconfigured(input.profile, input.workspace)) {
    return {
      stage: "notice_due",
      label: "Notice due",
      blockers: ["Arm the cure day count in State setup, or record a counsel waiver."],
      warnings,
      ...empty,
    }
  }

  if (cureDays != null) {
    if (!notice) {
      return {
        stage: "notice_due",
        label: "Notice due",
        blockers: ["Log the right-to-cure notice before this account can move toward recovery."],
        warnings,
        cureEndsOn: null,
        earliestReadyOn: null,
        activeNoticeId: null,
        daysRemaining: null,
      }
    }
    if (notice.sentOn > today) {
      return {
        stage: "notice_due",
        label: "Notice due",
        blockers: ["The notice date is in the future."],
        warnings,
        cureEndsOn,
        earliestReadyOn,
        activeNoticeId: notice.id,
        daysRemaining: null,
      }
    }
    if (earliestReadyOn && today < earliestReadyOn) {
      return {
        stage: "cure_active",
        label: "Cure period active",
        blockers: [`Cure window is open through ${cureEndsOn}.`],
        warnings,
        cureEndsOn,
        earliestReadyOn,
        activeNoticeId: notice.id,
        daysRemaining: calendarDaysBetween(today, earliestReadyOn),
      }
    }
  }

  const missing = missingPreTitles(input)
  if (missing.length > 0) {
    return {
      stage: "guardrails_open",
      label: cureDays != null ? "Notice sent" : "Guardrails open",
      blockers: missing,
      warnings,
      cureEndsOn,
      earliestReadyOn,
      activeNoticeId: notice?.id ?? null,
      daysRemaining: 0,
    }
  }

  return {
    stage: "ready_for_recovery",
    label: "Ready for recovery",
    blockers: [],
    warnings,
    cureEndsOn,
    earliestReadyOn,
    activeNoticeId: notice?.id ?? null,
    daysRemaining: 0,
  }
}

function missingPreTitles(input: {
  account: Account
  profile: StateProfile
  workspace: Workspace
  checks: ChecklistAck[]
}): string[] {
  const acked = new Set(
    input.checks
      .filter((check) => check.accountId === input.account.id && !check.voided)
      .map((check) => check.itemKey),
  )
  return preItems(input.profile, input.workspace)
    .filter((item) => !acked.has(item.key))
    .map((item) => item.title)
}

export function isOpenAccount(account: Account): boolean {
  return account.closedAs == null && account.saleOn == null
}
