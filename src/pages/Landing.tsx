import type { ReactNode } from "react"
import { ClipboardCheck, FileText, Lock, MapPin, Shield } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { LEGAL_DISCLAIMER, PRIVACY_BODY, PRIVACY_HEADING } from "../domain/copy"
import { StatusDot, ThemeToggle, Wordmark, usePageTitle } from "../components/ui"
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
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-zinc-100/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Wordmark />
          <div className="flex items-center gap-2">
            <a href="#pricing" className="hidden text-sm font-medium text-zinc-600 hover:text-zinc-950 sm:inline dark:text-zinc-300 dark:hover:text-white">
              Pricing
            </a>
            <a href="#privacy" className="hidden text-sm font-medium text-zinc-600 hover:text-zinc-950 sm:inline dark:text-zinc-300 dark:hover:text-white">
              Privacy
            </a>
            <ThemeToggle />
            <button type="button" className="cta" onClick={() => enter("free")}>
              {open ? "Open lot" : "Continue Free"}
            </button>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="grid items-center gap-10 py-10 md:grid-cols-[1.15fr_.85fr] md:py-16">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="badge">
                <StatusDot />
                Local-first compliance
              </span>
              <span className="badge">
                <StatusDot className="text-sky-400" />
                UCC Article 9
              </span>
            </div>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[1.02] text-zinc-950 md:text-6xl dark:text-white">
              Log the default.
              <span className="grad-text"> Keep the file here.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
              RepoFuse is the on-device worksheet for BHPH collections. Cure windows, UCC Article 9
              guardrails, field spots, and the post-repo file stay in this browser.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="cta cta-lg" onClick={() => enter("free")}>
                Continue Free
              </button>
              <button type="button" className="cta-secondary" onClick={() => enter("pro")}>
                Go Pro · $49.99/mo
              </button>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Free opens the lot file immediately. Go Pro opens the same file, then the sign-in
              panel. This build does not charge a card.
            </p>
          </div>
          <ExamplePhone />
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            ["01", "Notice sent", "Certified mail, tracking number, and the send date land in the audit.", "text-sky-400"],
            ["02", "Cure period active", "The armed state window counts down on the device.", "text-cyan-300"],
            ["03", "Ready for recovery", "Guardrails have to be acknowledged. Skipping them keeps the file closed.", "text-cyan-300"],
          ].map(([step, title, body, dot]) => (
            <article key={step} className="panel p-5">
              <div className="flex items-center justify-between">
                <p className="grad-text font-display text-3xl">{step}</p>
                <StatusDot className={dot} />
              </div>
              <h2 className="mt-3 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{body}</p>
            </article>
          ))}
        </section>

        <section id="product" className="mt-16">
          <p className="badge">
            <StatusDot />
            On-device workflow
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl">The UCC worksheet that stays on the lot.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Feature icon={<Shield size={18} aria-hidden />} title="State worksheet" body="Pick FL, TX, GA, or any other state. Cure length, disposition wait, and extra guardrails change with the profile. Day counts stay editable." />
            <Feature icon={<ClipboardCheck size={18} aria-hidden />} title="Unskippable guardrails" body="Enclosed areas, a confrontation, a refused gate, and state extras such as an Indiana sheriff note have to be acknowledged on their own." />
            <Feature icon={<MapPin size={18} aria-hidden />} title="Field and inventory" body="A spot is a button press on this phone: time, optional GPS, photos, and an itemized personal-property receipt. Map tiles are not loaded." />
            <Feature icon={<FileText size={18} aria-hidden />} title="Packet on the device" body="The PDF is built in the browser from the local file. It is an operational log, not a statutory notice form." />
          </div>
        </section>

        <section id="pricing" className="mt-16">
          <p className="badge">Pricing</p>
          <h2 className="mt-3 font-display text-4xl">Free, or Pro at $49.99/mo</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
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

        <section id="privacy" className="relative mt-16 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 px-6 py-8 text-zinc-50 shadow-[0_0_64px_-24px_rgba(34,211,238,0.45)] md:px-10">
          <div className="flex flex-wrap gap-2">
            <span className="badge">
              <StatusDot />
              IndexedDB
            </span>
            <span className="badge">
              <StatusDot className="text-sky-400" />
              No borrower upload
            </span>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Lock size={22} className="text-cyan-300" aria-hidden />
            <h2 className="font-display text-4xl text-white">{PRIVACY_HEADING}</h2>
          </div>
          {PRIVACY_BODY.split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="mt-16 flex flex-col items-start gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h2 className="font-display text-3xl">Open the lot.</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className="cta cta-lg" onClick={() => enter("free")}>
              Continue Free
            </button>
            <button type="button" className="cta-secondary" onClick={() => enter("pro")}>
              Go Pro
            </button>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">{LEGAL_DISCLAIMER}</p>
          <Link to="/app/setup" className="text-sm font-semibold text-cyan-700 underline dark:text-cyan-300">
            Review the state worksheet
          </Link>
        </section>
      </main>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <article className="panel p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300">
        {icon}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{body}</p>
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
    <article
      className={`flex flex-col rounded-xl border p-6 ${
        emphasized
          ? "border-cyan-400/40 bg-zinc-950 text-zinc-50 shadow-[0_0_48px_-12px_rgba(34,211,238,0.45)]"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-cyan-700 uppercase dark:text-cyan-300">
        {emphasized ? <StatusDot /> : null}
        {name}
      </h3>
      <p className="mt-3 font-display text-5xl">{price}</p>
      <p className={`mt-2 text-sm ${emphasized ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400"}`}>{detail}</p>
      <ul className="mt-6 flex-1 space-y-3 text-sm leading-6">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden className="text-cyan-600 dark:text-cyan-300">
              ▸
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClick} className={`mt-8 ${emphasized ? "cta cta-lg" : "cta-secondary"}`}>
        {action}
      </button>
    </article>
  )
}

function ExamplePhone() {
  return (
    <div
      className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-50 shadow-[0_0_56px_-16px_rgba(34,211,238,0.45)]"
      aria-hidden
    >
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="badge">
          <StatusDot />
          Example · not a live file
        </p>
        <p className="mt-5 text-sm text-zinc-400">Cure period active</p>
        <p className="grad-text font-display text-5xl">12 days</p>
        <p className="mt-1 text-sm text-zinc-400">Window clears Jan 17</p>
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="font-semibold">Example Buyer</p>
          <p className="text-sm text-zinc-400">2014 Accord · stock S-21</p>
          <p className="mt-3 text-xs text-zinc-500">Notice sent · certified mail on file</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
          <span className="rounded-md border border-zinc-800 bg-zinc-950 py-2 text-zinc-400">Notice</span>
          <span className="rounded-md bg-cyan-400 py-2 text-zinc-950">Cure</span>
          <span className="rounded-md border border-zinc-800 bg-zinc-950 py-2 text-zinc-500">Ready</span>
        </div>
      </div>
    </div>
  )
}
