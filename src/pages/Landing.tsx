import type { ReactNode } from "react"
import { ClipboardCheck, FileText, Lock, MapPin, Shield } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { LEGAL_DISCLAIMER, PRIVACY_BODY, PRIVACY_HEADING } from "../domain/copy"
import { ThemeToggle, Wordmark, usePageTitle } from "../components/ui"
import { useStore } from "../state/Store"

const freeFeatures = [
  "State worksheet and armed cure countdown",
  "Notice, contact, and append-only audit log",
  "Breach-of-peace guardrails, acknowledged one at a time",
  "Field spots, photos, and personal-property inventory",
  "Post-repo redemption and deficiency worksheet",
  "PDF packet generated on this device",
  "20 open accounts",
  "No sign-in",
]

const proFeatures = [
  "Everything in Free",
  "Unlimited open accounts",
  "Email sign-in for the team",
  "License tier checked in Supabase",
  "Dealership name and state synced — the lot file is not",
  "PDF without the Free banner. The disclaimer stays.",
]

export default function Landing() {
  usePageTitle("RepoFuse")
  const navigate = useNavigate()
  const { ready, workspace } = useStore()
  const open = ready && workspace?.setupComplete

  function enter(intent: "free" | "pro") {
    if (intent === "pro") sessionStorage.setItem("repofuse-intent", "pro")
    else sessionStorage.removeItem("repofuse-intent")
    if (open && intent === "pro") navigate("/app/settings?intent=pro")
    else navigate("/app")
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Wordmark />
        <div className="flex items-center gap-2">
          <a href="#pricing" className="hidden text-sm font-semibold sm:inline">
            Pricing
          </a>
          <a href="#privacy" className="hidden text-sm font-semibold sm:inline">
            Privacy
          </a>
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-bone dark:bg-paper dark:text-ink"
            onClick={() => enter("free")}
          >
            {open ? "Open lot" : "Continue Free"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="grid items-center gap-10 py-8 md:grid-cols-[1.15fr_.85fr] md:py-16">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-amber uppercase">
              BHPH compliance log
            </p>
            <h1 className="mt-3 max-w-xl font-display text-5xl leading-[1.05] text-ink md:text-6xl dark:text-paper">
              The lot file that never leaves this device.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft dark:text-paper/75">
              RepoFuse is a mobile-first log for lot managers and collections directors. It tracks
              cure windows, breach-of-peace guardrails, field spots, personal property, and the
              post-repo worksheet in this browser.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-base font-semibold text-bone dark:bg-paper dark:text-ink"
                onClick={() => enter("free")}
              >
                Continue Free
              </button>
              <button
                type="button"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/20 bg-white px-6 text-base font-semibold dark:border-white/15 dark:bg-night-2"
                onClick={() => enter("pro")}
              >
                Go Pro · $49.99/mo
              </button>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-ink-soft dark:text-paper/65">
              Free opens the lot file immediately. Go Pro opens the same file, then the sign-in
              panel. This build does not charge a card.
            </p>
          </div>
          <ExamplePhone />
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Notice sent", "Certified mail, tracking number, and the send date land in the audit."],
            ["2", "Cure period active", "The armed state window counts down on the device."],
            ["3", "Ready for recovery", "Guardrails have to be acknowledged. Skipping them keeps the file closed."],
          ].map(([step, title, body]) => (
            <article key={step} className="rounded-3xl border border-line bg-white p-5 dark:border-white/10 dark:bg-night-2">
              <p className="font-display text-3xl text-amber">{step}</p>
              <h2 className="mt-2 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft dark:text-paper/70">{body}</p>
            </article>
          ))}
        </section>

        <section id="product" className="mt-16 grid gap-4 md:grid-cols-2">
          <Feature icon={<Shield size={20} aria-hidden />} title="State worksheet" body="Pick FL, TX, GA, or any other state. Cure length, disposition wait, and extra guardrails change with the profile. Day counts stay editable." />
          <Feature icon={<ClipboardCheck size={20} aria-hidden />} title="Unskippable guardrails" body="Enclosed areas, a confrontation, a refused gate, and state extras such as an Indiana sheriff note have to be acknowledged on their own." />
          <Feature icon={<MapPin size={20} aria-hidden />} title="Field and inventory" body="A spot is a button press on this phone: time, optional GPS, photos, and an itemized personal-property receipt. Map tiles are not loaded." />
          <Feature icon={<FileText size={20} aria-hidden />} title="Packet on the device" body="The PDF is built in the browser from the local file. It is an operational log, not a statutory notice form." />
        </section>

        <section id="pricing" className="mt-16">
          <h2 className="font-display text-4xl">Free, or Pro at $49.99/mo</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft dark:text-paper/70">
            Pro checks who is signed in and which license they hold. The borrower file still never
            leaves the device.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PriceCard
              name="Free"
              price="$0"
              detail="One device. One lot file."
              features={freeFeatures}
              action="Continue Free"
              onClick={() => enter("free")}
            />
            <PriceCard
              name="Pro"
              price="$49.99/mo"
              detail="Team sign-in. The lot file stays local."
              features={proFeatures}
              action="Go Pro"
              emphasized
              onClick={() => enter("pro")}
            />
          </div>
        </section>

        <section id="privacy" className="mt-16 rounded-[2rem] bg-ink px-6 py-8 text-bone md:px-10">
          <div className="flex items-center gap-3 text-amber-2">
            <Lock size={22} aria-hidden />
            <h2 className="font-display text-4xl text-bone">{PRIVACY_HEADING}</h2>
          </div>
          {PRIVACY_BODY.split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="mt-4 max-w-3xl text-base leading-7 text-bone/85">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="mt-16 flex flex-col items-start gap-4 border-t border-line pt-8 dark:border-white/10">
          <h2 className="font-display text-3xl">Open the lot.</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 font-semibold text-bone dark:bg-paper dark:text-ink" onClick={() => enter("free")}>
              Continue Free
            </button>
            <button type="button" className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/20 px-6 font-semibold dark:border-white/20" onClick={() => enter("pro")}>
              Go Pro
            </button>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-ink-soft dark:text-paper/65">{LEGAL_DISCLAIMER}</p>
          <Link to="/app/setup" className="text-sm font-semibold underline">
            Review the state worksheet
          </Link>
        </section>
      </main>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-3xl border border-line bg-white p-5 dark:border-white/10 dark:bg-night-2">
      <div className="text-amber">{icon}</div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-soft dark:text-paper/70">{body}</p>
    </article>
  )
}

function PriceCard({
  name,
  price,
  detail,
  features,
  action,
  onClick,
  emphasized = false,
}: {
  name: string
  price: string
  detail: string
  features: string[]
  action: string
  onClick: () => void
  emphasized?: boolean
}) {
  return (
    <article className={`flex flex-col rounded-[2rem] border p-6 ${emphasized ? "border-ink bg-ink text-bone dark:border-amber-2" : "border-line bg-white dark:border-white/10 dark:bg-night-2"}`}>
      <h3 className="text-sm font-semibold tracking-[0.16em] uppercase">{name}</h3>
      <p className="mt-3 font-display text-5xl">{price}</p>
      <p className={`mt-2 text-sm ${emphasized ? "text-bone/75" : "text-ink-soft dark:text-paper/70"}`}>{detail}</p>
      <ul className="mt-6 flex-1 space-y-3 text-sm leading-6">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden className={emphasized ? "text-amber-2" : "text-pine"}>
              ▸
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClick}
        className={`mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-5 font-semibold ${emphasized ? "bg-amber-2 text-ink" : "bg-ink text-bone dark:bg-paper dark:text-ink"}`}
      >
        {action}
      </button>
    </article>
  )
}

function ExamplePhone() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-ink/10 bg-ink p-3 text-bone shadow-xl" aria-hidden>
      <div className="rounded-[1.4rem] bg-night-2 p-4">
        <p className="text-xs tracking-[0.16em] text-amber-2 uppercase">Example · not a live file</p>
        <p className="mt-4 text-sm text-bone/60">Cure period active</p>
        <p className="font-display text-5xl">12 days</p>
        <p className="mt-1 text-sm text-bone/70">Window clears Jan 17</p>
        <div className="mt-6 rounded-2xl bg-night-3 p-4">
          <p className="font-semibold">Example Buyer</p>
          <p className="text-sm text-bone/70">2014 Accord · stock S-21</p>
          <p className="mt-3 text-xs text-bone/50">Notice sent · certified mail on file</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
          <span className="rounded-full bg-night-3 py-2">Notice sent</span>
          <span className="rounded-full bg-amber-2 py-2 text-ink">Cure</span>
          <span className="rounded-full bg-night-3 py-2 text-bone/50">Ready</span>
        </div>
      </div>
    </div>
  )
}
