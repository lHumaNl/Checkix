import { useCallback, useState } from 'react'
import type { ProLayoutProps } from '@ant-design/pro-components'

type ProLayoutMode = NonNullable<ProLayoutProps['layout']>

export type AppLayoutMode = Exclude<ProLayoutMode, 'mix'>
export type AppNavTheme = NonNullable<ProLayoutProps['navTheme']>

export interface AppLayoutSettings {
  layout: AppLayoutMode
  navTheme: AppNavTheme
  fixedHeader: boolean
  fixSiderbar: boolean
}

const LAYOUT_SETTINGS_KEY = 'checkix.layout.settings'
const DEFAULT_LAYOUT_SETTINGS: AppLayoutSettings = {
  layout: 'side',
  navTheme: 'light',
  fixedHeader: true,
  fixSiderbar: true,
}

export function useLayoutSettings() {
  const [settings, setSettingsState] = useState<AppLayoutSettings>(readLayoutSettings)

  const setSettings = useCallback((nextSettings: Partial<AppLayoutSettings>) => {
    setSettingsState((currentSettings) => {
      const mergedSettings = normalizeLayoutSettings({ ...currentSettings, ...nextSettings })
      writeLayoutSettings(mergedSettings)
      return mergedSettings
    })
  }, [])

  return { settings, setSettings }
}

function readLayoutSettings(): AppLayoutSettings {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT_SETTINGS
  const parsedSettings = parseStoredSettings(localStorage.getItem(LAYOUT_SETTINGS_KEY))
  const normalizedSettings = normalizeLayoutSettings({ ...DEFAULT_LAYOUT_SETTINGS, ...parsedSettings })
  persistNormalizedSettings(parsedSettings, normalizedSettings)
  return normalizedSettings
}

function parseStoredSettings(value: string | null): Partial<AppLayoutSettings> {
  if (!value) return {}
  try {
    return validateSettings(JSON.parse(value))
  } catch {
    return {}
  }
}

function validateSettings(value: unknown): Partial<AppLayoutSettings> {
  if (!value || typeof value !== 'object') return {}
  const rawSettings = value as Record<string, unknown>
  return {
    layout: getLayoutMode(rawSettings.layout),
    navTheme: getNavTheme(rawSettings.navTheme),
    fixedHeader: getBooleanValue(rawSettings.fixedHeader),
    fixSiderbar: getBooleanValue(rawSettings.fixSiderbar),
  }
}

function normalizeLayoutSettings(settings: AppLayoutSettings): AppLayoutSettings {
  return {
    ...settings,
    fixedHeader: true,
    fixSiderbar: true,
  }
}

function getLayoutMode(value: unknown): AppLayoutMode | undefined {
  if (value === 'mix') return DEFAULT_LAYOUT_SETTINGS.layout
  return value === 'side' || value === 'top' ? value : undefined
}

function getNavTheme(value: unknown): AppNavTheme | undefined {
  return value === 'light' || value === 'realDark' ? value : undefined
}

function getBooleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function writeLayoutSettings(settings: AppLayoutSettings) {
  localStorage.setItem(LAYOUT_SETTINGS_KEY, JSON.stringify(settings))
}

function persistNormalizedSettings(parsedSettings: Partial<AppLayoutSettings>, normalizedSettings: AppLayoutSettings) {
  if (Object.keys(parsedSettings).length === 0) return
  const storedSettings = JSON.stringify(parsedSettings)
  const nextSettings = JSON.stringify(normalizedSettings)
  if (storedSettings !== nextSettings) writeLayoutSettings(normalizedSettings)
}
