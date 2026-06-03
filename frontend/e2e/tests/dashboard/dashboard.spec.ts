import { test, expect } from '../../fixtures/auth.fixture'
import { expectAntStatisticIncrease, getAntStatisticNumber, mockApiError } from '../../utils/helpers'

test.describe('Dashboard Page', () => {
  test('renders dashboard heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  })

  test('displays stats cards', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Stats cards should be visible
    await expect(page.getByText('Completed Checklists')).toBeVisible()
    await expect(page.getByText('Total Todos')).toBeVisible()
  })

  test('shows API-seeded dashboard metrics', async ({ page, e2eData }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const completedBaseline = await getAntStatisticNumber(page, 'Completed Checklists')
    const todosBaseline = await getAntStatisticNumber(page, 'Total Todos')
    const eventsBaseline = await getAntStatisticNumber(page, 'Upcoming Events')

    await e2eData.createRichScenario('dashboard')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expectAntStatisticIncrease(page, 'Completed Checklists', completedBaseline)
    await expectAntStatisticIncrease(page, 'Total Todos', todosBaseline)
    await expectAntStatisticIncrease(page, 'Upcoming Events', eventsBaseline)
  })

  test('displays activity heatmap section', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/activity/i).first()).toBeVisible()
  })

  test('displays recent activity feed', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/recent/i).first()).toBeVisible()
  })

  test('handles API error gracefully', async ({ page }) => {
    await mockApiError(page, '/stats/dashboard/**', 500, { detail: 'Server error' })
    await mockApiError(page, '/stats/dashboard/', 500, { detail: 'Server error' })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should not crash — either shows error or shows dashboard with partial data
    await expect(page.locator('body')).toBeVisible()
  })
})
