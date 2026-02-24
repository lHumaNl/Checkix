import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function subscribeToSystemPreference(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

function getSystemPreferenceSnapshot() {
  return getSystemPreference()
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme)
  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemPreference,
    getSystemPreferenceSnapshot,
    () => false
  )

  const isDark = useMemo(() => {
    if (theme === 'system') {
      return systemPrefersDark
    }
    return theme === 'dark'
  }, [theme, systemPrefersDark])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }, [])

  const cycleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  }, [theme, setTheme])

  return { theme, isDark, setTheme, cycleTheme }
}
