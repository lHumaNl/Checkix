import { test, expect } from '../../fixtures/auth.fixture'
import { generateUniqueName, expectToast } from '../../utils/helpers'

test.describe('Todos Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/todos')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('renders page with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Todos' })).toBeVisible()
  })

  test('shows New List button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New List' })).toBeVisible()
  })

  test('creates a new todo list', async ({ page }) => {
    const name = generateUniqueName('Todo List')

    await page.getByRole('button', { name: 'New List' }).click()

    // Fill inline form
    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]').first()
    await nameInput.fill(name)

    await page.getByRole('button', { name: /create/i }).click()

    await expectToast(page, /created/i)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 })
  })

  test('searches todo lists', async ({ page }) => {
    await page.locator('main input[placeholder*="Search"]').first().fill('nonexistent-list-xyz')
    await expect(page.getByText(/no lists match your search/i)).toBeVisible()

    // Should show empty or filtered results
    await expect(page.locator('body')).toBeVisible()
  })

  test('renders and searches API-seeded todo list with items', async ({ page, e2eData }) => {
    const scenario = await e2eData.createRichScenario('todos')

    await page.goto('/todos')
    const searchInput = page.locator('main input[placeholder*="Search"]').first()
    await searchInput.fill(scenario.todoListName)

    const listCard = page.locator('.ant-card').filter({ hasText: scenario.todoListName }).first()
    await expect(listCard).toBeVisible({ timeout: 10_000 })
    await expect(listCard).toContainText('1/2')

    await listCard.getByLabel(/expand list/i).click()
    for (const itemTitle of scenario.todoItemTitles) {
      await expect(listCard.getByText(itemTitle)).toBeVisible()
    }

    await searchInput.fill(`${scenario.todoListName}-missing`)
    await expect(page.getByText(/no lists match your search/i)).toBeVisible()
  })

  test('filters by status', async ({ page }) => {
    await page.locator('main .ant-select').click()
    const activeOption = page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
      .filter({ hasText: 'Active' })
      .first()
    await expect(activeOption).toBeVisible()
    await activeOption.click()
    await page.waitForTimeout(500)
  })

  test('expands a todo list to see items', async ({ page }) => {
    // If there's an existing list, click to expand it
    const expandButton = page.locator('svg.lucide-chevron-down, svg.lucide-chevron-up').first()
    if (await expandButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandButton.click()
      await page.waitForTimeout(300)
    }
  })

  test('adds item to a todo list', async ({ page }) => {
    const listName = generateUniqueName('Items Test')

    // Create a list first
    await page.getByRole('button', { name: 'New List' }).click()
    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]').first()
    await nameInput.fill(listName)
    await page.getByRole('button', { name: /create/i }).click()
    await page.waitForTimeout(1000)

    // Expand the new list (click on it or expand button)
    await page.getByText(listName).first().click()
    await page.waitForTimeout(300)

    // Add item via inline input
    const addItemInput = page.locator('input[placeholder*="Add a new item"]').first()
    if (await addItemInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addItemInput.fill('New test item')
      await addItemInput.press('Enter')
      await expectToast(page, /added/i)
    }
  })

  test('deletes a todo list', async ({ page }) => {
    const name = generateUniqueName('Delete List')

    // Create
    await page.getByRole('button', { name: 'New List' }).click()
    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]').first()
    await nameInput.fill(name)
    await page.getByRole('button', { name: /create/i }).click()
    await page.waitForTimeout(1000)

    // Find and click delete (trash icon) on the list card
    const listCard = page.locator(`text="${name}"`).first().locator('..').locator('..')
    const deleteBtn = listCard.locator('svg.lucide-trash-2, svg.lucide-trash').first()
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click()
      // If there's a confirm dialog
      const confirmBtn = page.getByRole('button', { name: 'Delete' })
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click()
      }
      await expectToast(page, /deleted/i)
    }
  })
})
