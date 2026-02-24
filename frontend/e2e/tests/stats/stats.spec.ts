import { test, expect } from '../../fixtures/auth.fixture'

test.describe('Statistics Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/stats')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('renders stats page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /statistics/i })).toBeVisible()
  })

  test('displays stat cards', async ({ page }) => {
    // Should show stats overview cards
    await expect(page.getByText(/template|instance|completed|completion/i).first()).toBeVisible()
  })

  test('date range inputs are present', async ({ page }) => {
    const dateInputs = page.locator('input[type="date"]')
    await expect(dateInputs.first()).toBeVisible()
  })

  test('preset buttons are clickable', async ({ page }) => {
    const presets = ['7d', '30d', '90d']
    for (const preset of presets) {
      const btn = page.getByRole('button', { name: preset })
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('Export CSV button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible()
  })

  test('shows top templates section', async ({ page }) => {
    await expect(page.getByText(/top templates/i)).toBeVisible()
  })
})
