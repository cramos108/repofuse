import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type ThemeChoice = "system" | "light" | "dark"

const KEY = "repofuse-theme"

interface ThemeValue {
  choice: ThemeChoice
  setChoice: (choice: ThemeChoice) => void
}

const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const dark = choice === "dark" || (choice === "system" && media.matches)
      root.classList.toggle("dark", dark)
      root.style.colorScheme = dark ? "dark" : "light"
      document.getElementById("theme-color")?.setAttribute("content", dark ? "#12110e" : "#f3efe4")
    }
    apply()
    try {
      localStorage.setItem(KEY, choice)
    } catch {
      /* Preference stays for this visit if storage is blocked. */
    }
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [choice])

  return <ThemeContext.Provider value={{ choice, setChoice }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error("useTheme must be used inside ThemeProvider")
  return value
}

function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === "light" || saved === "dark" || saved === "system") return saved
  } catch {
    /* ignore */
  }
  return "system"
}
