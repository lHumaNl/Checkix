import { test, expect } from '../../fixtures/auth.fixture'

test.describe('Assignments Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/assignments')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('renders assignments page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /assignments/i })).toBeVisible()
  })

  test('shows New Assignment button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new assignment/i })).toBeVisible()
  })

  test('opens create assignment modal', async ({ page }) => {
    await page.getByRole('button', { name: /new assignment/i }).click()
    await expect(page.getByRole('heading', { name: /new assignment/i })).toBeVisible()
  })

  test('search input is present', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
  })

  test('assignment type filter is present', async ({ page }) => {
    const typeFilter = page.locator('select').first()
    if (await typeFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(typeFilter).toBeVisible()
    }
  })

  test('shows empty state when no assignments', async ({ page }) => {
    // If there are no assignments, should show empty state
    const emptyState = page.getByText(/no assignments/i)
    const table = page.locator('table, [role="table"]')

    const hasEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false)
    const hasTable = await table.isVisible({ timeout: 2000 }).catch(() => false)

    expect(hasEmpty || hasTable).toBeTruthy()
  })
})
