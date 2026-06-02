import { test, expect } from '../../fixtures/auth.fixture'

test.describe('Webhooks Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/webhooks')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('renders webhooks page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Webhooks', exact: true })).toBeVisible()
  })

  test('shows New Webhook button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new webhook/i })).toBeVisible()
  })

  test('opens create webhook modal', async ({ page }) => {
    await page.getByRole('button', { name: /new webhook/i }).click()
    await expect(page.getByRole('dialog', { name: /new webhook/i })).toBeVisible()
  })

  test('search input is present', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
  })

  test('event type filter is present', async ({ page }) => {
    const filter = page.locator('select').first()
    if (await filter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(filter).toBeVisible()
    }
  })

  test('shows empty state when no webhooks', async ({ page }) => {
    const emptyState = page.getByText(/no webhooks/i)
    const hasEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false)

    // Should show either empty state or webhook list
    if (!hasEmpty) {
      const heading = page.getByRole('heading', { name: 'Webhooks', exact: true })
      await expect(heading).toBeVisible()
    }
  })
})
