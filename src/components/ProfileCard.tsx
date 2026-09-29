import { COUNTDOWN_RULE, PROFILE_REVISION } from "../domain/copy"
import type { StateProfile } from "../domain/profiles"

export function ProfileCard({
  profile,
  cureDays,
  waitDays,
  waived,
}: {
  profile: StateProfile
  cureDays: number | null
  waitDays: number
  waived: boolean
}) {
  return (
    <article className="rounded-3xl bg-ink p-5 text-bone">
      <p className="text-xs font-semibold tracking-[0.16em] text-amber-2 uppercase">
        {profile.code} worksheet · {PROFILE_REVISION}
      </p>
      <h2 className="mt-2 font-display text-3xl">{profile.name}</h2>
      <p className="mt-3 text-sm leading-6 text-bone/85">{profile.summary}</p>
      <dl className="mt-5 grid gap-3 text-sm">
        <div>
          <dt className="text-amber-2">Pre-repo cure</dt>
          <dd>
            {waived
              ? "Waived on this device"
              : profile.preRepoCure === "statutory"
                ? `${cureDays ?? "—"} days after the notice date`
                : "Not flagged. Contractual grace can still be armed."}
          </dd>
        </div>
        <div>
          <dt className="text-amber-2">Disposition wait</dt>
          <dd>{waitDays} days after the notice of intent, then the next morning</dd>
        </div>
        <div>
          <dt className="text-amber-2">Reinstatement</dt>
          <dd>
            {profile.reinstatement === "none"
              ? "Not flagged on this worksheet"
              : profile.reinstatement === "conditional"
                ? `Conditional${profile.reinstatementDays ? `, often discussed as ${profile.reinstatementDays} days from the notice` : ""}`
                : "Flagged by consumer-law summaries. Confirm before quoting a figure."}
          </dd>
        </div>
        <div>
          <dt className="text-amber-2">Personal property</dt>
          <dd>{profile.personalPropertyNote}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-5 text-bone/70">{COUNTDOWN_RULE}</p>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-amber-2">Citations on this worksheet</summary>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-bone/80">
          {profile.cites.map((cite) => (
            <li key={cite}>{cite}</li>
          ))}
        </ul>
      </details>
    </article>
  )
}
