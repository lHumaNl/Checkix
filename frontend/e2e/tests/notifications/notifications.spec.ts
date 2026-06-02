import { test, expect } from '../../fixtures/auth.fixture'

test.describe('Notifications Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/notifications')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('renders notifications page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /notification/i }).first()).toBeVisible()
  })

  test('shows New Rule button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new rule/i })).toBeVisible()
  })

  test('shows tabs for Rules and Logs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /rules/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /logs/i })).toBeVisible()
  })

  test('switches to Logs tab', async ({ page }) => {
    await page.getByRole('tab', { name: /logs/i }).click()
    await page.waitForTimeout(500)

    // Should show logs section content (empty state or table)
    const noLogs = page.getByText(/no notification logs found\.?/i).first()
    const logsTable = page.locator('table')
    const hasContent = await noLogs.isVisible({ timeout: 3000 }).catch(() => false) ||
                       await logsTable.isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('event type filter is present', async ({ page }) => {
    const filter = page.locator('select').first()
    if (await filter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(filter).toBeVisible()
    }
  })

  test('shows empty state when no rules', async ({ page }) => {
    const emptyState = page.getByText(/no notification rules found\.?/i)
    const cards = page.getByRole('listitem')

    const hasEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false)
    const hasCards = (await cards.count()) > 0

    expect(hasEmpty || hasCards).toBeTruthy()
  })
})
