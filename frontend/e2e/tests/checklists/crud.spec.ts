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
    const itemInput = page.getByRole('dialog').getByRole('textbox', { name: 'Item content' }).first()
    if (await itemInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await itemInput.fill('Default item')
    }
  }

  async function fillChecklistTitle(page: import('@playwright/test').Page, name: string) {
    await page.getByRole('dialog').getByRole('textbox', { name: 'Checklist title' }).fill(name)
  }

  function itemInput(page: import('@playwright/test').Page, index: number) {
    return page.getByRole('dialog').getByRole('textbox', { name: 'Item content' }).nth(index)
  }

  test('creates a new checklist', async ({ page }) => {
    const name = generateUniqueName('Test Checklist')

    await page.getByRole('button', { name: 'New Checklist' }).click()
    await expect(page.getByRole('dialog', { name: /Create Checklist/ })).toBeVisible()

    await fillChecklistTitle(page, name)
    await fillDefaultItem(page)
    await page.getByRole('button', { name: 'Create Checklist' }).click()

    await page.waitForTimeout(1000)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 })
  })

  test('creates checklist with items', async ({ page }) => {
    const name = generateUniqueName('With Items')

    await page.getByRole('button', { name: 'New Checklist' }).click()
    await fillChecklistTitle(page, name)

    // Fill the first item (already exists)
    await itemInput(page, 0).fill('First item')

    // Add second item
    await page.getByRole('button', { name: 'Add Item' }).click()
    await itemInput(page, 1).fill('Second item')

    await page.getByRole('button', { name: 'Create Checklist' }).click()

    await page.waitForTimeout(1000)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 })
  })

  test('edits an existing checklist', async ({ page }) => {
    const name = generateUniqueName('Edit Test')
    const updatedName = generateUniqueName('Updated')

    // Create with active status
    await page.getByRole('button', { name: 'New Checklist' }).click()
    await fillChecklistTitle(page, name)
    await fillDefaultItem(page)
    await page.getByRole('dialog').getByText('Active', { exact: true }).click()
    await page.getByRole('button', { name: 'Create Checklist' }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 })

    // Navigate to detail page
    await page.getByText(name).first().click()
    await expect(page).toHaveURL(/\/checklists\/\d+/)

    // Click edit button (2nd button in action bar, after Start)
    await page.getByRole('button', { name: 'Edit' }).click()

    // Edit title in modal
    await expect(page.getByRole('dialog', { name: /Edit Checklist/ })).toBeVisible()
    await fillChecklistTitle(page, updatedName)
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await page.waitForTimeout(1000)
    await expect(page.getByText(updatedName).first()).toBeVisible()
  })

  test('deletes a checklist', async ({ page }) => {
    const name = generateUniqueName('Delete Test')

    // Create
    await page.getByRole('button', { name: 'New Checklist' }).click()
    await fillChecklistTitle(page, name)
    await fillDefaultItem(page)
    await page.getByRole('button', { name: 'Create Checklist' }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 })

    // Navigate to detail
    await page.getByText(name).first().click()
    await expect(page).toHaveURL(/\/checklists\/\d+/)

    // Open MoreVertical dropdown (3rd button in action bar)
    await page.getByRole('button', { name: 'Actions' }).last().click()

    // Click Delete in dropdown menu
    await page.getByRole('menuitem', { name: /delete/i }).click()

    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).last().click()

    // Should redirect back to checklists
    await expect(page).toHaveURL('/checklists', { timeout: 5000 })
  })

  test('search input filters checklist list', async ({ page }) => {
    // Verify search input exists and typing triggers a filter
    const searchInput = page.getByRole('searchbox', { name: 'Search...' }).last()
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
    await page.getByRole('searchbox', { name: 'Search...' }).last().fill('zzz-nonexistent-checklist-zzz')
    await page.waitForTimeout(500)
    await expect(page.getByText(/no checklists found/i)).toBeVisible()
  })
})
