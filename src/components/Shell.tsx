import { NavLink, Outlet } from "react-router-dom"
import { ThemeToggle, Wordmark } from "./ui"
import { useStore } from "../state/Store"

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-2 text-sm font-semibold ${isActive ? "bg-ink text-bone dark:bg-paper dark:text-ink" : "text-ink-soft dark:text-paper/75"}`

export function Shell() {
  const { workspace } = useStore()
  return (
    <div className="min-h-dvh">
      <a href="#lot-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-bone">
        Skip to the lot file
      </a>
      <header className="no-print sticky top-0 z-20 border-b border-line/80 bg-bone/90 backdrop-blur dark:border-white/10 dark:bg-night/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <Wordmark />
            <p className="text-xs text-ink-soft dark:text-paper/60">
              {workspace?.dealershipName} · {workspace?.stateCode} · {workspace?.tier === "pro" ? "Pro" : "Free"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink to="/app" end className={link}>
                Lot
              </NavLink>
              <NavLink to="/app/accounts/new" className={link}>
                New file
              </NavLink>
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
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bone/95 px-4 py-2 backdrop-blur md:hidden dark:border-white/10 dark:bg-night/95">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 text-center">
          <NavLink to="/app" end className={link}>
            Lot
          </NavLink>
          <NavLink to="/app/accounts/new" className={link}>
            New
          </NavLink>
          <NavLink to="/app/settings" className={link}>
            Settings
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
