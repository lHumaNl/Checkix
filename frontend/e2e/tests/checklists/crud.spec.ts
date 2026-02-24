import { test, expect } from '../../fixtures/auth.fixture'
import { generateUniqueName } from '../../utils/helpers'

test.describe('Checklist CRUD Operations', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/checklists')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  /**
   * Helper: fill the auto-added empty item in the create form
   */
  async function fillDefaultItem(page: import('@playwright/test').Page) {
    const itemInput = page.locator('input[name="items.0.content"]')
    if (await itemInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await itemInput.fill('Default item')
    }
  }

  test('creates a new checklist', async ({ page }) => {
    const name = generateUniqueName('Test Checklist')

    await page.getByRole('button', { name: 'New Checklist' }).click()
    await expect(page.getByRole('heading', { name: 'Create Checklist' })).toBeVisible()

    await page.locator('input[name="title"]').fill(name)
    await fillDefaultItem(page)
    await page.getByRole('button', { name: 'Create Checklist' }).click()

    await page.waitForTimeout(1000)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 })
  })

  test('creates checklist with items', async ({ page }) => {
    const name = generateUniqueName('With Items')

    await page.getByRole('button', { name: 'New Checklist' }).click()
    await page.locator('input[name="title"]').fill(name)

    // Fill the first item (already exists)
    await page.locator('input[name="items.0.content"]').fill('First item')

    // Add second item
    await page.getByRole('button', { name: 'Add Item' }).click()
    await page.locator('input[name="items.1.content"]').fill('Second item')

    await page.getByRole('button', { name: 'Create Checklist' }).click()

    await page.waitForTimeout(1000)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 })
  })

  test('edits an existing checklist', async ({ page }) => {
    const name = generateUniqueName('Edit Test')
    const updatedName = generateUniqueName('Updated')

    // Create with active status
    await page.getByRole('button', { name: 'New Checklist' }).click()
    await page.locator('input[name="title"]').fill(name)
    await fillDefaultItem(page)
    await page.locator('input[type="radio"][value="active"]').check()
    await page.getByRole('button', { name: 'Create Checklist' }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 })

    // Navigate to detail page
    await page.getByText(name).first().click()
    await expect(page).toHaveURL(/\/checklists\/\d+/)

    // Click edit button (2nd button in action bar, after Start)
    const actionBar = page.getByRole('button', { name: 'Start' }).locator('..')
    await actionBar.locator('button').nth(1).click()

    // Edit title in modal
    await expect(page.getByRole('heading', { name: 'Edit Checklist' })).toBeVisible()
    await page.locator('input[name="title"]').fill(updatedName)
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await page.waitForTimeout(1000)
    await expect(page.getByText(updatedName).first()).toBeVisible()
  })

  test('deletes a checklist', async ({ page }) => {
    const name = generateUniqueName('Delete Test')

    // Create
    await page.getByRole('button', { name: 'New Checklist' }).click()
    await page.locator('input[name="title"]').fill(name)
    await fillDefaultItem(page)
    await page.getByRole('button', { name: 'Create Checklist' }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 })

    // Navigate to detail
    await page.getByText(name).first().click()
    await expect(page).toHaveURL(/\/checklists\/\d+/)

    // Open MoreVertical dropdown (3rd button in action bar)
    const actionBar = page.getByRole('button', { name: 'Start' }).locator('..')
    await actionBar.locator('button').nth(2).click()

    // Click Delete in dropdown menu
    await page.getByRole('menuitem', { name: /delete/i }).click()

    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).last().click()

    // Should redirect back to checklists
    await expect(page).toHaveURL('/checklists', { timeout: 5000 })
  })

  test('search input filters checklist list', async ({ page }) => {
    // Verify search input exists and typing triggers a filter
    const searchInput = page.locator('input[placeholder="Search..."]')
    await expect(searchInput).toBeVisible()

    // Type a search query that won't match anything
    await searchInput.fill('zzz-no-match-zzz')
    await page.waitForTimeout(500) // debounce

    // Should show empty state or filtered results
    await expect(page.getByText(/no checklists found/i)).toBeVisible({ timeout: 5000 })

    // Clear search and verify checklists reappear
    await searchInput.clear()
    await page.waitForTimeout(500)

    // Should show at least one checklist (from previous tests)
    const checklistLinks = page.locator('a[href^="/checklists/"]')
    await expect(checklistLinks.first()).toBeVisible({ timeout: 5000 })
  })

  test('shows empty state when no results', async ({ page }) => {
    await page.locator('input[placeholder="Search..."]').fill('zzz-nonexistent-checklist-zzz')
    await page.waitForTimeout(500)
    await expect(page.getByText(/no checklists found/i)).toBeVisible()
  })
})
