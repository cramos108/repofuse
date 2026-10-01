import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type ThemeChoice = "light" | "dark"

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
    const dark = choice === "dark"
    root.classList.toggle("dark", dark)
    root.style.colorScheme = dark ? "dark" : "light"
    document.getElementById("theme-color")?.setAttribute("content", dark ? "#09090b" : "#f4f4f5")
    try {
      localStorage.setItem(KEY, choice)
    } catch {
      /* Preference stays for this visit if storage is blocked. */
    }
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
    if (saved === "light" || saved === "dark") return saved
  } catch {
    /* ignore */
  }
  return "dark"
}
