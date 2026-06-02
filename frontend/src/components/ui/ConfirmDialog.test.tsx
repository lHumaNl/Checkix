import { render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  beforeAll(() => {
    const getComputedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element))
  })

  beforeEach(() => {
    localStorage.setItem('language', 'es')
  })

  afterEach(() => {
    localStorage.removeItem('language')
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('uses localized default action labels', () => {
    render(
      <I18nProvider>
        <ConfirmDialog
          open
          onOpenChange={vi.fn()}
          title="Delete item"
          onConfirm={vi.fn()}
        />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sí' })).toBeInTheDocument()
  })
})
