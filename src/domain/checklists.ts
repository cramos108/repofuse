import { armedCureLength, type CureSettings } from "./cure"
import type { SpecialKey, StateProfile } from "./profiles"
import type { CheckPhase } from "./types"

export interface CheckItem {
  key: string
  phase: CheckPhase
  title: string
  statement: string
  confirmWord: boolean
}

const BASE_PRE: CheckItem[] = [
  {
    key: "authority",
    phase: "pre_recovery",
    title: "Authority and default",
    statement:
      "This dealership is the secured party, or it has the secured party's authority, and the contract is in default.",
    confirmWord: false,
  },
  {
    key: "secured_area",
    phase: "pre_recovery",
    title: "No secured or enclosed area",
    statement:
      "The vehicle is in an open place. Nobody will enter a home, open a closed garage, cut a lock, climb a fence, or pass a closed gate to reach it. If the only access is through a secured or enclosed area, recovery stops and the file goes to the court process.",
    confirmWord: true,
  },
  {
    key: "no_breach",
    phase: "pre_recovery",
    title: "No breach of the peace",
    statement:
      "Recovery stops if anyone objects, if a disturbance starts, or if force or threats would be required. Nobody will impersonate law enforcement.",
    confirmWord: true,
  },
  {
    key: "licensed_actor",
    phase: "pre_recovery",
    title: "Licensed actor",
    statement:
      "The person assigned to recover the vehicle holds every license this state requires, or the file will go to a licensed agent or to court.",
    confirmWord: false,
  },
  {
    key: "leave_if_refused",
    phase: "pre_recovery",
    title: "Leave if access is refused",
    statement:
      "The assignment is to leave immediately if access is refused. This acknowledgment is not permission to enter property.",
    confirmWord: true,
  },
]

const BASE_POST: CheckItem[] = [
  {
    key: "inventory_started",
    phase: "post_recovery",
    title: "Personal-property inventory started",
    statement:
      "An itemized inventory of personal property found in the vehicle was started at recovery, including anything removed while the borrower was present.",
    confirmWord: false,
  },
  {
    key: "property_secured",
    phase: "post_recovery",
    title: "Property can be reclaimed",
    statement:
      "Personal property is stored where it can be returned, and the borrower has a way to claim it during the hold period on this state profile.",
    confirmWord: false,
  },
  {
    key: "disposition_content",
    phase: "post_recovery",
    title: "Disposition notice content",
    statement:
      "The notice before disposition covers the consumer-goods topics in UCC § 9-614: the debtor and the secured party, a description of the vehicle, public or private sale, the time and place of a public sale or the date after which a private sale may occur, a phone number for the redemption amount, a phone number to request an accounting, any deficiency liability, and the right to redeem before disposition.",
    confirmWord: true,
  },
  {
    key: "redemption_phone",
    phase: "post_recovery",
    title: "Redemption phone is staffed",
    statement:
      "The phone number printed on the disposition notice is staffed for the redemption amount and for an accounting request.",
    confirmWord: false,
  },
]

const CURE_ITEM: CheckItem = {
  key: "cure_elapsed",
  phase: "pre_recovery",
  title: "Cure window ended without cure",
  statement:
    "The armed cure window on the latest right-to-cure notice has ended, and this default was not cured.",
  confirmWord: false,
}

const SPECIALS: Record<SpecialKey, CheckItem> = {
  sheriff_notice: {
    key: "sheriff_notice",
    phase: "pre_recovery",
    title: "Sheriff notice recorded",
    statement:
      "Indiana worksheet: a notice to the local sheriff is recorded in the contact log, with the office and the time. Secondary summaries describe notice before the recovery or within two hours after. Confirm the current statute before relying on that timing.",
    confirmWord: false,
  },
  debtor_objection: {
    key: "debtor_objection",
    phase: "pre_recovery",
    title: "No debtor objection to self-help",
    statement:
      "Wisconsin worksheet: the file has no debtor objection to self-help. If the debtor objected after notice, do not assign a self-help recovery. Confirm the current Wisconsin Consumer Act rule.",
    confirmWord: true,
  },
  self_help_limit: {
    key: "self_help_limit",
    phase: "pre_recovery",
    title: "Louisiana self-help limit",
    statement:
      "Louisiana worksheet: counsel has confirmed this holder and this agent may recover without a court order. If that confirmation is not in the file, use judicial recovery. This checkbox is not permission.",
    confirmWord: true,
  },
  ca_noi: {
    key: "ca_noi",
    phase: "post_recovery",
    title: "California notice of intent",
    statement:
      "California worksheet: the notice of intent to dispose gives at least 15 days (20 if the mailing or the address is outside California) and covers redemption and any reinstatement right under Civil Code section 2983.2. Confirm the current text.",
    confirmWord: true,
  },
  ca_effects: {
    key: "ca_effects",
    phase: "post_recovery",
    title: "California personal effects",
    statement:
      "California worksheet: personal effects were inventoried, the inventory was made available on the regulatory timetable (described as 48 hours, or 72 if a weekend or postal holiday intervenes), and unclaimed effects are held for the described 60 days. Confirm the current Business and Professions Code section.",
    confirmWord: false,
  },
  tx_property: {
    key: "tx_property",
    phase: "post_recovery",
    title: "Texas personal-property notice",
    statement:
      "Texas worksheet: notice that the holder has the buyer's personal property is sent by the 15th day, and the buyer can claim it through the 31st day after that notice. Confirm the current Finance Code section.",
    confirmWord: false,
  },
}

export function preItems(profile: StateProfile, settings: CureSettings): CheckItem[] {
  const extras = profile.specialItemKeys
    .map((key) => SPECIALS[key])
    .filter((item) => item.phase === "pre_recovery")
  const items = [...BASE_PRE, ...extras]
  if (armedCureLength(profile, settings) != null) items.push(CURE_ITEM)
  return items
}

export function postItems(profile: StateProfile): CheckItem[] {
  const extras = profile.specialItemKeys
    .map((key) => SPECIALS[key])
    .filter((item) => item.phase === "post_recovery")
  return [...BASE_POST, ...extras]
}

export function findItem(
  profile: StateProfile,
  settings: CureSettings,
  key: string,
): CheckItem | undefined {
  return [...preItems(profile, settings), ...postItems(profile)].find((item) => item.key === key)
}
