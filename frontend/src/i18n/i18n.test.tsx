import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { I18nProvider, detectClientLanguage, normalizeLanguage } from '@/i18n'
import { LanguageSelector } from '@/components/LanguageSelector'
import { messages, messageCatalog, messageLanguages } from '@/i18n/messages'

describe('i18n', () => {
  it('normalizes supported locale tags', () => {
    expect(normalizeLanguage('es-MX')).toBe('es')
    expect(normalizeLanguage('zh-CN')).toBe('zh')
    expect(normalizeLanguage('pt-BR')).toBeNull()
  })

  it('uses persisted language before browser language', () => {
    localStorage.setItem('language', 'fr')

    expect(detectClientLanguage()).toBe('fr')
  })

  it('persists user language override', () => {
    render(
      <I18nProvider>
        <LanguageSelector />
      </I18nProvider>
    )

    fireEvent.change(screen.getByTestId('language-select'), { target: { value: 'es' } })

    expect(localStorage.getItem('language')).toBe('es')
    expect(screen.getByLabelText('Idioma')).toBeInTheDocument()
  })

  it('has complete translations for every supported language', () => {
    const keys = Object.keys(messageCatalog)

    for (const language of messageLanguages) {
      expect(Object.keys(messages[language])).toEqual(keys)
      for (const key of keys) {
        expect(messages[language][key as keyof typeof messages.en].trim()).not.toBe('')
      }
    }
  })

  it('keeps non-English fallback usage low', () => {
    const allowedSharedValues = new Set(['CSV', 'Webhooks', 'Email', 'Dashboard', 'Agenda'])

    for (const language of messageLanguages.filter((code) => code !== 'en')) {
      const sharedValues = Object.entries(messages.en).filter(([key, englishValue]) => {
        const localizedValue = messages[language][key as keyof typeof messages.en]
        return localizedValue === englishValue && !allowedSharedValues.has(englishValue)
      })

      expect(sharedValues.length / Object.keys(messages.en).length).toBeLessThan(0.05)
    }
  })
})
