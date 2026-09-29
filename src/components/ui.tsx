import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme, type ThemeChoice } from "../theme/ThemeProvider"
import type { Stage } from "../domain/types"

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
}) {
  const styles = {
    primary:
      "bg-ink text-bone hover:bg-ink-soft dark:bg-paper dark:text-ink dark:hover:bg-bone",
    secondary:
      "border border-ink/20 bg-white text-ink hover:bg-bone-2 dark:border-white/15 dark:bg-night-2 dark:text-paper dark:hover:bg-night-3",
    ghost: "text-ink hover:bg-black/5 dark:text-paper dark:hover:bg-white/10",
    danger: "bg-rose text-white hover:bg-rose/90",
  }[variant]
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="label">
      {label}
      <div className="mt-1 font-normal">{children}</div>
      {hint ? <span className="mt-1 block font-normal text-ink-soft dark:text-paper/70">{hint}</span> : null}
    </label>
  )
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`field ${className}`} {...props} />
}

export function Area({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`field min-h-24 ${className}`} {...props} />
}

export function SelectInput({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`field ${className}`} {...props} />
}

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={`rounded-3xl border border-line bg-white p-5 shadow-sm dark:border-white/10 dark:bg-night-2 ${className}`}>
      {children}
    </section>
  )
}

export function Banner({ tone = "info", children }: { tone?: "info" | "warn" | "good"; children: ReactNode }) {
  const styles = {
    info: "border-ink/15 bg-bone-2 text-ink dark:border-white/10 dark:bg-night-3 dark:text-paper",
    warn: "border-amber/30 bg-amber-2/20 text-ink dark:text-paper",
    good: "border-pine/30 bg-pine/10 text-ink dark:text-paper",
  }[tone]
  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${styles}`}>{children}</div>
}

export function StagePill({ stage, label }: { stage: Stage; label: string }) {
  const styles: Record<Stage, string> = {
    notice_due: "bg-rose text-white",
    cure_active: "bg-amber-2 text-ink",
    guardrails_open: "bg-ink text-bone dark:bg-paper dark:text-ink",
    ready_for_recovery: "bg-pine text-white",
    recovered: "bg-night-3 text-paper",
    redeemed: "bg-pine text-white",
    disposed: "bg-ink-soft text-bone",
    closed: "bg-line text-ink",
  }
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[stage]}`}>{label}</span>
}

export function ThemeToggle() {
  const { choice, setChoice } = useTheme()
  const options: { id: ThemeChoice; label: string; icon: ReactNode }[] = [
    { id: "system", label: "System theme", icon: <Monitor size={16} aria-hidden /> },
    { id: "light", label: "Light theme", icon: <Sun size={16} aria-hidden /> },
    { id: "dark", label: "Dark theme", icon: <Moon size={16} aria-hidden /> },
  ]
  return (
    <div className="flex rounded-full border border-line bg-white p-1 dark:border-white/10 dark:bg-night-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-label={option.label}
          aria-pressed={choice === option.id}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${choice === option.id ? "bg-ink text-bone dark:bg-paper dark:text-ink" : "text-ink-soft dark:text-paper/70"}`}
          onClick={() => setChoice(option.id)}
        >
          {option.icon}
        </button>
      ))}
    </div>
  )
}

export function Wordmark() {
  return (
    <span className="font-display text-xl font-semibold tracking-tight text-ink dark:text-paper">
      Repo<span className="text-amber">Fuse</span>
    </span>
  )
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title === "RepoFuse" ? title : `${title} · RepoFuse`
  }, [title])
}

export function errorText(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Something went wrong on this device."
}
