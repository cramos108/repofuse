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
      "rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 text-zinc-950 shadow-lg shadow-indigo-500/30 hover:brightness-110",
    secondary:
      "rounded-lg border border-zinc-300 bg-white text-zinc-950 hover:border-cyan-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-cyan-400/70",
    ghost: "rounded-lg text-zinc-700 hover:bg-zinc-200/80 dark:text-zinc-200 dark:hover:bg-zinc-800",
    danger: "rounded-lg bg-rose-600 text-white hover:bg-rose-500",
  }[variant]
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
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
      {hint ? <span className="mt-1 block font-normal text-zinc-500 dark:text-zinc-400">{hint}</span> : null}
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
    <section id={id} className={`panel p-5 ${className}`}>
      {children}
    </section>
  )
}

export function Banner({ tone = "info", children }: { tone?: "info" | "warn" | "good"; children: ReactNode }) {
  const styles = {
    info: "border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
    warn: "border-violet-400/40 bg-violet-500/10 text-zinc-900 dark:text-zinc-100",
    good: "border-cyan-400/40 bg-cyan-400/10 text-zinc-900 dark:text-zinc-100",
  }[tone]
  return <div className={`rounded-lg border px-4 py-3 text-sm leading-6 ${styles}`}>{children}</div>
}

const stageDot: Record<Stage, string> = {
  notice_due: "text-rose-400",
  cure_active: "text-violet-300",
  guardrails_open: "text-cyan-300",
  ready_for_recovery: "text-emerald-400",
  recovered: "text-zinc-300",
  redeemed: "text-emerald-300",
  disposed: "text-zinc-400",
  closed: "text-zinc-500",
}

export function StatusDot({ className = "text-cyan-300" }: { className?: string }) {
  return <span aria-hidden className={`status-dot ${className}`} />
}

export function StagePill({ stage, label }: { stage: Stage; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] text-zinc-100 uppercase">
      <StatusDot className={stageDot[stage]} />
      {label}
    </span>
  )
}

export function ThemeToggle() {
  const { choice, setChoice } = useTheme()
  const options: { id: ThemeChoice; label: string; icon: ReactNode }[] = [
    { id: "system", label: "System theme", icon: <Monitor size={16} aria-hidden /> },
    { id: "light", label: "Light theme", icon: <Sun size={16} aria-hidden /> },
    { id: "dark", label: "Dark theme", icon: <Moon size={16} aria-hidden /> },
  ]
  return (
    <div className="flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-label={option.label}
          aria-pressed={choice === option.id}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${choice === option.id ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 text-zinc-950" : "text-zinc-500 dark:text-zinc-400"}`}
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
    <span className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
      Repo<span className="grad-text">Fuse</span>
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
