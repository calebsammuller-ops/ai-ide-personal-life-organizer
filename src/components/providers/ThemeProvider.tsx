'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'dark' | 'light' | 'system' | 'time'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  forcedTheme?: Theme
}

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  forcedTheme?: Theme
}

const initialState: ThemeProviderState = {
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

// Time-based theme: light from 6am to 6pm, dark otherwise
function getTimeBasedTheme(): 'light' | 'dark' {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18 ? 'light' : 'dark'
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'life-organizer-theme',
  forcedTheme,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(forcedTheme || defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  const resolveTheme = useCallback((currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'light' || currentTheme === 'dark') {
      return currentTheme
    }
    if (currentTheme === 'time') {
      return getTimeBasedTheme()
    }
    // system
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  }, [])

  useEffect(() => {
    // If forced theme, always use it
    if (forcedTheme) {
      setTheme(forcedTheme)
    } else {
      const stored = localStorage.getItem(storageKey) as Theme | null
      if (stored) {
        setTheme(stored)
      }
    }
    setMounted(true)
  }, [storageKey, forcedTheme])

  useEffect(() => {
    if (!mounted) return

    const effectiveTheme = forcedTheme || theme
    const resolved = resolveTheme(effectiveTheme)
    setResolvedTheme(resolved)

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
  }, [theme, mounted, forcedTheme, resolveTheme])

  // Update time-based theme every minute
  useEffect(() => {
    if (!mounted || (theme !== 'time' && forcedTheme !== 'time')) return

    const interval = setInterval(() => {
      const newResolved = getTimeBasedTheme()
      if (newResolved !== resolvedTheme) {
        setResolvedTheme(newResolved)
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(newResolved)
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [mounted, theme, forcedTheme, resolvedTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const newResolved = mediaQuery.matches ? 'dark' : 'light'
      setResolvedTheme(newResolved)
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(newResolved)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mounted, theme])

  const value = {
    theme: forcedTheme || theme,
    resolvedTheme,
    forcedTheme,
    setTheme: (newTheme: Theme) => {
      // Don't allow changing if forced
      if (forcedTheme) return
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
