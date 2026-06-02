/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import enUS from 'antd/locale/en_US'
import ruRU from 'antd/locale/ru_RU'
import esES from 'antd/locale/es_ES'
import deDE from 'antd/locale/de_DE'
import frFR from 'antd/locale/fr_FR'
import zhCN from 'antd/locale/zh_CN'
import type { Locale } from 'antd/es/locale'
import { messages, type MessageKey } from './messages'

export type SupportedLanguage = 'en' | 'ru' | 'es' | 'de' | 'fr' | 'zh'

export interface LanguageOption {
  code: SupportedLanguage
  label: string
}

const LANGUAGE_STORAGE_KEY = 'language'

export const languageOptions: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Russian' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'zh', label: '中文' },
]

const antdLocales: Record<SupportedLanguage, Locale> = {
  en: enUS,
  ru: ruRU,
  es: esES,
  de: deDE,
  fr: frFR,
  zh: zhCN,
}

interface I18nContextValue {
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
  t: (key: MessageKey, values?: Record<string, string | number>) => string
  antdLocale: Locale
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function normalizeLanguage(language: string | null | undefined): SupportedLanguage | null {
  if (!language) return null
  const baseLanguage = language.toLowerCase().split('-')[0]
  return isSupportedLanguage(baseLanguage) ? baseLanguage : null
}

export function detectClientLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en'

  const storedLanguage = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  if (storedLanguage) return storedLanguage

  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const browserLanguage of browserLanguages) {
    const normalizedLanguage = normalizeLanguage(browserLanguage)
    if (normalizedLanguage) return normalizedLanguage
  }

  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(detectClientLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((newLanguage: SupportedLanguage) => {
    setLanguageState(newLanguage)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage)
  }, [])

  const t = useCallback(
    (key: MessageKey, values?: Record<string, string | number>) => {
      const translatedText = messages[language][key] ?? messages.en[key] ?? key
      return interpolate(translatedText, values)
    },
    [language]
  )

  const value = useMemo(
    () => ({ language, setLanguage, t, antdLocale: antdLocales[language] }),
    [language, setLanguage, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

function isSupportedLanguage(language: string): language is SupportedLanguage {
  return ['en', 'ru', 'es', 'de', 'fr', 'zh'].includes(language)
}

function interpolate(text: string, values?: Record<string, string | number>) {
  if (!values) return text
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text
  )
}
