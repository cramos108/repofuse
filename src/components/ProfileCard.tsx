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
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-50 shadow-lg shadow-cyan-500/10">
      <p className="badge">
        <span aria-hidden className="status-dot text-cyan-300" />
        {profile.code} worksheet · {PROFILE_REVISION}
      </p>
      <h2 className="mt-2 font-display text-3xl">{profile.name}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{profile.summary}</p>
      <dl className="mt-5 grid gap-3 text-sm">
        <div>
          <dt className="text-cyan-300">Pre-repo cure</dt>
          <dd>
            {waived
              ? "Waived on this device"
              : profile.preRepoCure === "statutory"
                ? `${cureDays ?? "—"} days after the notice date`
                : "Not flagged. Contractual grace can still be armed."}
          </dd>
        </div>
        <div>
          <dt className="text-cyan-300">Disposition wait</dt>
          <dd>{waitDays} days after the notice of intent, then the next morning</dd>
        </div>
        <div>
          <dt className="text-cyan-300">Reinstatement</dt>
          <dd>
            {profile.reinstatement === "none"
              ? "Not flagged on this worksheet"
              : profile.reinstatement === "conditional"
                ? `Conditional${profile.reinstatementDays ? `, often discussed as ${profile.reinstatementDays} days from the notice` : ""}`
                : "Flagged by consumer-law summaries. Confirm before quoting a figure."}
          </dd>
        </div>
        <div>
          <dt className="text-cyan-300">Personal property</dt>
          <dd>{profile.personalPropertyNote}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-5 text-zinc-400">{COUNTDOWN_RULE}</p>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-cyan-300">Citations on this worksheet</summary>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-zinc-300">
          {profile.cites.map((cite) => (
            <li key={cite}>{cite}</li>
          ))}
        </ul>
      </details>
    </article>
  )
}
