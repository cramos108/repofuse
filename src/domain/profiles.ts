import { CONSUMER_WAIT_NOTE } from "./copy"

export type SpecialKey =
  | "sheriff_notice"
  | "debtor_objection"
  | "self_help_limit"
  | "ca_noi"
  | "ca_effects"
  | "tx_property"

export interface StateProfile {
  code: string
  name: string
  preRepoCure: "none" | "statutory"
  suggestedCureDays: number | null
  cureTriggerDaysPastDue: number | null
  cureFrequency: string
  dispositionWaitDays: number
  reinstatement: "none" | "conditional" | "flagged"
  reinstatementDays: number | null
  personalPropertyNoticeDays: number | null
  personalPropertyHoldDays: number | null
  personalPropertyNote: string
  specialItemKeys: SpecialKey[]
  summary: string
  cites: string[]
  confidence: "worksheet"
}

const ARTICLE_9 =
  "UCC Article 9 as enacted in this state: no breach of the peace, notice before disposition, redemption until the collateral is disposed of or contracted for. The 10-day timing safe harbor in § 9-612(b) is for non-consumer transactions."

const DEFAULT_PROPERTY =
  "Inventory personal property before the vehicle goes to storage. Give the borrower a practical way to reclaim it. The 3-day notice and 30-day hold are operational defaults, not a uniform statute."

const STATE_NAMES: [string, string][] = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
]

interface CureFact {
  days: number
  trigger: number | null
  frequency: string
  cite: string
}

const CURE: Record<string, CureFact> = {
  CO: {
    days: 20,
    trigger: 10,
    frequency:
      "Confirm how often Colorado requires the cure notice. RepoFuse still asks for a new notice after every logged cure.",
    cite: "Colo. Rev. Stat. Title 5, Uniform Consumer Credit Code (confirm the current cure section and day count).",
  },
  CT: {
    days: 15,
    trigger: null,
    frequency:
      "Public summaries of Connecticut's advance-notice practice differ between 10 and 15 days. 15 is armed so the lot does not move early.",
    cite: "Conn. Gen. Stat. repossession notice provisions (confirm the current section and day count).",
  },
  DC: {
    days: 20,
    trigger: null,
    frequency:
      "Day count is a conservative placeholder. Replace it with the number counsel gives you.",
    cite: "D.C. Code consumer-credit cure provisions (confirm the current section and day count).",
  },
  IA: {
    days: 20,
    trigger: 10,
    frequency:
      "Iowa's cure notice is often described as once in 365 days. RepoFuse still asks for a new notice after every logged cure.",
    cite: "Iowa Code § 537.5110 (confirm the current text).",
  },
  KS: {
    days: 20,
    trigger: 10,
    frequency:
      "Confirm the Kansas day count. 20 is armed as a conservative UCCC-style window.",
    cite: "K.S.A. 16a-5-110 (confirm the current day count).",
  },
  ME: {
    days: 20,
    trigger: 10,
    frequency:
      "Secondary summaries describe a once-a-year notice. RepoFuse still asks for a new notice after every logged cure.",
    cite: "Maine Consumer Credit Code cure provisions (confirm the current section and day count).",
  },
  MA: {
    days: 21,
    trigger: 10,
    frequency:
      "Secondary summaries describe a 21-day window, up to three times a year. Confirm before relying on the count.",
    cite: "Mass. Gen. Laws c. 255B (confirm the current cure section and day count).",
  },
  MO: {
    days: 20,
    trigger: 10,
    frequency:
      "Day count is a conservative placeholder where public summaries state the trigger more clearly than the length.",
    cite: "Missouri motor-vehicle installment default provisions (confirm the chapter and day count).",
  },
  NE: {
    days: 20,
    trigger: null,
    frequency: "Conservative placeholder. Replace it with counsel's number.",
    cite: "Nebraska UCCC cure provisions (confirm the current section and day count).",
  },
  NH: {
    days: 20,
    trigger: null,
    frequency: "Conservative placeholder. Replace it with counsel's number.",
    cite: "New Hampshire cure provisions (confirm the current section and day count).",
  },
  RI: {
    days: 20,
    trigger: null,
    frequency: "Conservative placeholder. Replace it with counsel's number.",
    cite: "Rhode Island cure provisions (confirm the current section and day count).",
  },
  SC: {
    days: 20,
    trigger: null,
    frequency: "Conservative placeholder. Replace it with counsel's number.",
    cite: "South Carolina consumer-credit cure provisions (confirm the current section and day count).",
  },
  SD: {
    days: 20,
    trigger: null,
    frequency: "Conservative placeholder. Replace it with counsel's number.",
    cite: "South Dakota cure provisions (confirm the current section and day count).",
  },
  VA: {
    days: 20,
    trigger: null,
    frequency: "Conservative placeholder. Replace it with counsel's number.",
    cite: "Virginia cure provisions (confirm the current section and day count).",
  },
  WV: {
    days: 20,
    trigger: null,
    frequency: "Conservative placeholder. Replace it with counsel's number.",
    cite: "West Virginia Consumer Credit and Protection Act cure provisions (confirm the current section and day count).",
  },
  WI: {
    days: 15,
    trigger: 10,
    frequency:
      "Wisconsin's notice is often described as once in a year. RepoFuse still asks for a new notice after every logged cure. A debtor objection can take self-help off the table.",
    cite: "Wis. Stat. §§ 425.104 to 425.105 (confirm the current text).",
  },
}

const REINSTATEMENT_FLAGGED = new Set([
  "CT",
  "DC",
  "IL",
  "MD",
  "MS",
  "NY",
  "OH",
  "RI",
  "WI",
])

const EXTRA_CITES: Record<string, string[]> = {
  CA: [
    "Cal. Com. Code § 9609.",
    "Cal. Civ. Code § 2983.2 (at least 15 days' notice of intent to dispose; 20 days if the mailing or the address is outside California). Reinstatement is conditional — confirm §§ 2983.2 to 2983.3.",
    "Personal-effects inventory and hold: confirm the current repossessor section of the Business and Professions Code.",
  ],
  FL: ["Fla. Stat. ch. 679."],
  GA: ["O.C.G.A. Title 11, Article 9."],
  TX: [
    "Tex. Bus. & Com. Code ch. 9.",
    "Personal property left in a repossessed vehicle: Tex. Fin. Code ch. 348 (notice delivered by the 15th day; claim window through the 31st day after notice — confirm the current section).",
  ],
  IN: [
    "Ind. Code art. 26-1-9.1.",
    "Sheriff notice: secondary summaries describe notice to the local sheriff before recovery or within two hours after. Confirm the current section.",
  ],
  LA: [
    "La. R.S. tit. 10, ch. 9.",
    "Self-help is tightly limited in Louisiana. Confirm with counsel before any assignment that does not go through court.",
  ],
  IA: ["Iowa Code § 537.5110 (confirm the current text)."],
  WI: ["Wis. Stat. ch. 425 (confirm the current cure and objection rules)."],
}

function propertyNote(code: string): {
  notice: number | null
  hold: number | null
  note: string
} {
  if (code === "CA") {
    return {
      notice: 2,
      hold: 60,
      note: "California repossessor rules are described as an inventory within 48 hours (72 if a weekend or postal holiday falls in that span) and a 60-day hold. Confirm the current section.",
    }
  }
  if (code === "TX") {
    return {
      notice: 15,
      hold: 31,
      note: "Texas motor-vehicle retail installment practice: notice that the holder has personal property, delivered by the 15th day, with a claim window through the 31st day after that notice. Confirm the current Finance Code section.",
    }
  }
  return { notice: 3, hold: 30, note: DEFAULT_PROPERTY }
}

function specials(code: string): SpecialKey[] {
  if (code === "IN") return ["sheriff_notice"]
  if (code === "WI") return ["debtor_objection"]
  if (code === "LA") return ["self_help_limit"]
  if (code === "CA") return ["ca_noi", "ca_effects"]
  if (code === "TX") return ["tx_property"]
  return []
}

function build(code: string, name: string): StateProfile {
  const cure = CURE[code]
  const property = propertyNote(code)
  const reinstatement = code === "CA"
    ? "conditional"
    : REINSTATEMENT_FLAGGED.has(code)
      ? "flagged"
      : "none"
  const summary = cure
    ? `${name} flags a statutory pre-repo right to cure on this worksheet. ${cure.days} days are armed after the notice date. ${cure.frequency}`
    : `${name} does not flag a statutory pre-repo right to cure on this worksheet. Default follows the contract. Self-help still cannot breach the peace. After recovery, log the disposition notice and finish the redemption worksheet before a sale date is set.`

  return {
    code,
    name,
    preRepoCure: cure ? "statutory" : "none",
    suggestedCureDays: cure?.days ?? null,
    cureTriggerDaysPastDue: cure?.trigger ?? null,
    cureFrequency: cure
      ? cure.frequency
      : "No statutory pre-repo cure is flagged. You can still arm a contractual grace period.",
    dispositionWaitDays: 15,
    reinstatement,
    reinstatementDays: code === "CA" ? 15 : null,
    personalPropertyNoticeDays: property.notice,
    personalPropertyHoldDays: property.hold,
    personalPropertyNote: property.note,
    specialItemKeys: specials(code),
    summary,
    cites: [ARTICLE_9, CONSUMER_WAIT_NOTE, ...(cure ? [cure.cite] : []), ...(EXTRA_CITES[code] ?? [])],
    confidence: "worksheet",
  }
}

export const PROFILES: StateProfile[] = STATE_NAMES.map(([code, name]) => build(code, name))

export const PROFILES_BY_NAME: StateProfile[] = [...PROFILES].sort((a, b) =>
  a.name.localeCompare(b.name),
)

export function getProfile(code: string): StateProfile {
  const found = PROFILES.find((profile) => profile.code === code)
  if (!found) throw new Error(`Unknown state profile: ${code}`)
  return found
}
