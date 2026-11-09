import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'
type ThemeCtx = { theme: Theme; toggle: () => void }
const Ctx = createContext<ThemeCtx | null>(null)

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('bl_theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch {}
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('bl_theme', theme) } catch {}
  }, [theme])

  function toggle() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
