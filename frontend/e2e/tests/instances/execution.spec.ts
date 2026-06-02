import { test, expect, InstancePage, ChecklistsPage } from '../../fixtures/auth.fixture'
import { generateUniqueName, expectToast } from '../../utils/helpers'

test.describe('Instance Execution', () => {
  /**
   * Helper: create checklist with items and set status to "active" so we can start instances.
   */
  async function createChecklistWithItems(page: import('@playwright/test').Page, name: string, itemCount: number = 2) {
    const checklistsPage = new ChecklistsPage(page)
    await checklistsPage.goto()

    await page.getByRole('button', { name: 'New Checklist' }).click()
    await page.getByRole('dialog').getByRole('textbox', { name: 'Checklist title' }).fill(name)

    // Set status to active
    await page.getByRole('dialog').getByText('Active', { exact: true }).click()

    for (let i = 0; i < itemCount; i++) {
      if (i > 0) {
        await page.getByRole('button', { name: 'Add Item' }).click()
      }
      await page.getByRole('dialog').getByRole('textbox', { name: 'Item content' }).nth(i).fill(`Item ${i + 1}`)
    }

    await page.getByRole('button', { name: 'Create Checklist' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 })
  }

  /**
   * Helper: navigate to checklist detail, click Start to create instance, then start it.
   */
  async function startInstance(page: import('@playwright/test').Page, checklistName: string) {
    // Click checklist card to go to detail
    await page.getByText(checklistName).first().click()
    await expect(page).toHaveURL(/\/checklists\/\d+/)

    // Click Start button on detail page (creates instance)
    await page.getByRole('button', { name: 'Start' }).click()

    // Should navigate to instance page
    await expect(page).toHaveURL(/\/instances\/\d+/, { timeout: 5000 })
    await page.waitForLoadState('networkidle')

    // Instance is created in draft status — click Start on instance page
    const startBtn = page.getByRole('button', { name: 'Start' })
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click()
      await page.waitForTimeout(500)
    }

    // Verify we're in in_progress status
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 10000 })
  }

  test('creates and starts an instance from checklist', async ({ authenticatedPage: page }) => {
    const name = generateUniqueName('Instance Create')
    await createChecklistWithItems(page, name, 2)
    await startInstance(page, name)

    await expect(page.getByText(name)).toBeVisible()
    await expect(page.getByText('Item 1')).toBeVisible()
    await expect(page.getByText('Item 2')).toBeVisible()
  })

  test('checks and unchecks items', async ({ authenticatedPage: page }) => {
    const name = generateUniqueName('Check Items')
    await createChecklistWithItems(page, name, 2)
    await startInstance(page, name)

    const instancePage = new InstancePage(page)

    // Check Item 1
    await instancePage.checkItem('Item 1')
    await instancePage.expectItemChecked('Item 1')

    // Uncheck Item 1
    await instancePage.checkItem('Item 1')
    await instancePage.expectItemNotChecked('Item 1')
  })

  test('shows progress bar updates', async ({ authenticatedPage: page }) => {
    const name = generateUniqueName('Progress')
    await createChecklistWithItems(page, name, 2)
    await startInstance(page, name)

    // Initially 0 of 2
    await expect(page.getByText('0 of 2')).toBeVisible()

    // Check Item 1
    await page.getByText('Item 1', { exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('1 of 2')).toBeVisible()

    // Check Item 2
    await page.getByText('Item 2', { exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('2 of 2')).toBeVisible()
  })

  test('pauses and resumes instance', async ({ authenticatedPage: page }) => {
    const name = generateUniqueName('Pause Resume')
    await createChecklistWithItems(page, name, 1)
    await startInstance(page, name)

    // Pause
    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible({ timeout: 5000 })

    // Resume
    await page.getByRole('button', { name: 'Resume' }).click()

    // After resume, status should be in_progress (Pause button visible)
    // Allow time for the API call and UI update
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 10000 })
  })

  test('completes an instance', async ({ authenticatedPage: page }) => {
    const name = generateUniqueName('Complete')
    await createChecklistWithItems(page, name, 1)
    await startInstance(page, name)

    // Check item
    await page.getByText('Item 1', { exact: true }).click()
    await page.waitForTimeout(500)

    // Click Complete
    await page.getByRole('button', { name: 'Complete' }).click()

    // Confirm in dialog
    const confirmBtn = page.getByRole('button', { name: 'Complete' }).last()
    await confirmBtn.click()

    await expectToast(page, 'completed')
  })

  test('cancels an instance', async ({ authenticatedPage: page }) => {
    const name = generateUniqueName('Cancel')
    await createChecklistWithItems(page, name, 1)
    await startInstance(page, name)

    // Pause first (cancel is available when paused)
    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).first().click()

    // Confirm in dialog
    await page.getByRole('button', { name: 'Cancel checklist' }).click()

    await expectToast(page, 'cancelled')
  })

  test('completed instance disables checkboxes', async ({ authenticatedPage: page }) => {
    const name = generateUniqueName('Disabled')
    await createChecklistWithItems(page, name, 1)
    await startInstance(page, name)

    // Check item and complete
    await page.getByText('Item 1', { exact: true }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Complete' }).click()
    await page.getByRole('button', { name: 'Complete' }).last().click()
    await page.waitForTimeout(500)

    // Verify items have disabled/opacity-50 styling
    await expect(page.locator('.opacity-50').filter({ hasText: 'Item 1' })).toBeVisible()
  })
})

test.describe('Instance Page - Edge Cases', () => {
  test('redirects for invalid instance ID', async ({ page }) => {
    await page.goto('/instances/invalid')
    await expect(page).toHaveURL(/\/checklists/)
  })

  test('shows not found for non-existent instance', async ({ page }) => {
    await page.route('**/api/instances/99999/', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not found' }),
      })
    })

    await page.goto('/instances/99999')
    await expect(page.getByText('Instance not found')).toBeVisible()
  })
})
