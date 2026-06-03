import { test, expect } from '../../fixtures/auth.fixture'

test.describe('Global Search', () => {
  test('finds API-seeded checklist and todo results', async ({ page, e2eData }) => {
    const scenario = await e2eData.createRichScenario('search')

    await page.goto('/')
    const search = page.getByRole('searchbox', { name: /search/i })
    await search.fill(scenario.checklistTitle)

    await expect(page.getByText('Checklists')).toBeVisible({ timeout: 10_000 })
    const checklistResult = page.locator('button').filter({ hasText: scenario.checklistTitle }).first()
    await expect(checklistResult).toBeVisible()
    await checklistResult.click()
    await expect(page).toHaveURL(new RegExp(`/checklists/${scenario.checklistId}`))

    await page.goto('/')
    await search.fill(scenario.todoListName)
    await expect(page.getByText('Todos')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button').filter({ hasText: scenario.todoListName }).first()).toBeVisible()
  })
})
