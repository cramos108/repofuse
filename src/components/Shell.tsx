import { NavLink, Outlet } from "react-router-dom"
import { StatusDot, ThemeToggle, Wordmark } from "./ui"
import { accessFor, roleLabel } from "../domain/roles"
import { useStore } from "../state/Store"

const link = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "chip-on"
    : "rounded-lg px-3 py-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"

export function Shell() {
  const { workspace, seat } = useStore()
  const access = workspace ? accessFor(workspace, seat) : null
  const tierLabel = !workspace
    ? ""
    : access?.ledger && access.field
      ? "Pro · both roles"
      : `${workspace.tier === "pro" ? "Pro" : "Free"} · ${roleLabel(workspace.operatorRole)}`
  return (
    <div className="min-h-dvh">
      <a href="#lot-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-zinc-950">
        Skip to the lot file
      </a>
      <header className="no-print sticky top-0 z-20 border-b border-zinc-200/80 bg-zinc-100/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <Wordmark />
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {workspace?.dealershipName} · {workspace?.stateCode} · {tierLabel}
              </span>
              <span className="badge">
                <StatusDot />
                On this device
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink to="/app" end className={link}>
                Lot
              </NavLink>
              {access?.ledger ? (
                <NavLink to="/app/accounts/new" className={link}>
                  New file
                </NavLink>
              ) : null}
              <NavLink to="/app/settings" className={link}>
                Settings
              </NavLink>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="lot-main" className="mx-auto w-full max-w-5xl px-4 py-5 pb-28 md:pb-10">
        <Outlet />
      </main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-zinc-100/95 px-4 py-2 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className={`mx-auto grid max-w-lg gap-2 text-center ${access?.ledger ? "grid-cols-3" : "grid-cols-2"}`}>
          <NavLink to="/app" end className={link}>
            Lot
          </NavLink>
          {access?.ledger ? (
            <NavLink to="/app/accounts/new" className={link}>
              New
            </NavLink>
          ) : null}
          <NavLink to="/app/settings" className={link}>
            Settings
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
