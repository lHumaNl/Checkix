import { useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'theme'
const THEME_CHANGE_EVENT = 'checkix-theme-change'

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function subscribeToStoredTheme(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(THEME_CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(THEME_CHANGE_EVENT, callback)
  }
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
  const theme = useSyncExternalStore(
    subscribeToStoredTheme,
    getStoredTheme,
    () => 'system' as ThemeMode
  )
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
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }, [])

  const cycleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  }, [theme, setTheme])

  return { theme, isDark, setTheme, cycleTheme }
}
