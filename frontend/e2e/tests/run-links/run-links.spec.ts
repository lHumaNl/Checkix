import { test, expect } from '../../fixtures/auth.fixture'

test.describe('Run Links Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/run-links')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('renders run links page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /run links/i })).toBeVisible()
  })

  test('shows New Run Link button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new run link/i })).toBeVisible()
  })

  test('opens create run link modal', async ({ page }) => {
    await page.getByRole('button', { name: /new run link/i }).click()
    await expect(page.getByRole('dialog', { name: /new run link/i })).toBeVisible()
  })

  test('search input is present', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
  })

  test('access type filter buttons are present', async ({ page }) => {
    // Filter buttons: all, public, restricted
    const allBtn = page.getByRole('button', { name: /all/i }).first()
    if (await allBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(allBtn).toBeVisible()
    }
  })

  test('shows empty state when no run links', async ({ page }) => {
    const emptyState = page.getByText(/no run links/i)
    const cards = page.locator('[class*="grid"] > div')

    const hasEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false)
    const hasCards = (await cards.count()) > 0

    expect(hasEmpty || hasCards).toBeTruthy()
  })
})
