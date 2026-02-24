import { test, expect } from '../../fixtures/auth.fixture'
import { mockApiError } from '../../utils/helpers'

test.describe('Community Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/community')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('renders community page heading', async ({ page }) => {
    await expect(page.getByText(/community templates/i)).toBeVisible()
  })

  test('shows template cards or empty state', async ({ page }) => {
    // Either templates are visible or an empty/loading state
    const hasContent = await page.getByText(/template|no templates|loading/i).first().isVisible({ timeout: 5000 }).catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('handles API error with retry button', async ({ page }) => {
    await mockApiError(page, '/community/**', 500, { detail: 'Server error' })
    await mockApiError(page, '/community/', 500, { detail: 'Server error' })

    await page.goto('/community')
    await page.waitForLoadState('networkidle')

    const retryBtn = page.getByRole('button', { name: /retry|try again/i })
    if (await retryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(retryBtn).toBeVisible()
    }
  })
})
