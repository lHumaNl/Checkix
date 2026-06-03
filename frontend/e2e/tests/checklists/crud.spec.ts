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

  function checklistCard(page: import('@playwright/test').Page, name: string) {
    return page.locator('main .ant-card').filter({ hasText: name }).first()
  }

  async function gotoChecklistByName(page: import('@playwright/test').Page, name: string) {
    const href = await page.getByRole('link', { name }).getAttribute('href')
    expect(href).toMatch(/\/checklists\/\d+/)
    await page.goto(href!)
  }

  test('creates a new checklist', async ({ page }) => {
    const name = generateUniqueName('Test Checklist')

    await page.getByRole('button', { name: 'New Checklist' }).click()
    await expect(page.getByRole('dialog', { name: /Create Checklist/ })).toBeVisible()

    await fillChecklistTitle(page, name)
    await fillDefaultItem(page)
    await page.getByRole('button', { name: 'Create Checklist' }).click()

    await page.waitForTimeout(1000)
    await expect(checklistCard(page, name)).toBeVisible({ timeout: 5000 })
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
    await expect(checklistCard(page, name)).toBeVisible({ timeout: 5000 })
  })

  test('renders API-seeded checklist with folder, tag, and items', async ({ page, e2eData }) => {
    const scenario = await e2eData.createRichScenario('checklists')

    await page.goto('/checklists')
    await page.locator('main input[placeholder*="Search"]').first().fill(scenario.checklistTitle)

    const checklistCard = page.locator('main .ant-card').filter({ hasText: scenario.checklistTitle }).first()
    await expect(checklistCard).toBeVisible({ timeout: 10_000 })
    await expect(checklistCard).toContainText('In folder')
    await expect(checklistCard).toContainText(scenario.tagName)

    await page.goto(`/checklists/${scenario.checklistId}`)
    await expect(page).toHaveURL(new RegExp(`/checklists/${scenario.checklistId}`))
    await expect(page.getByRole('heading', { name: scenario.checklistTitle })).toBeVisible()
    await expect(page.getByText(scenario.checklistDescription)).toBeVisible()

    for (const itemTitle of scenario.checklistItemTitles) {
      await expect(page.getByText(itemTitle)).toBeVisible()
    }
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
    await expect(checklistCard(page, name)).toBeVisible({ timeout: 5000 })

    // Navigate to detail page
    await gotoChecklistByName(page, name)
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
    await expect(checklistCard(page, name)).toBeVisible({ timeout: 5000 })

    // Navigate to detail
    await gotoChecklistByName(page, name)
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
    await expect(page.locator('main .ant-card').filter({ hasText: /test|with|edit|delete|checklist/i }).first()).toBeVisible({ timeout: 5000 })
  })

  test('shows empty state when no results', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search...' }).last().fill('zzz-nonexistent-checklist-zzz')
    await page.waitForTimeout(500)
    await expect(page.getByText(/no checklists found/i)).toBeVisible()
  })
})
