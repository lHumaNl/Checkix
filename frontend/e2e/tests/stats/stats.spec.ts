import { test, expect } from '../../fixtures/auth.fixture'
import { expectAntStatisticIncrease, getAntStatisticNumber } from '../../utils/helpers'

test.describe('Statistics Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/stats')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('renders stats page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /statistics/i })).toBeVisible()
  })

  test('displays stat cards', async ({ page }) => {
    // Should show stats overview cards
    await expect(page.getByText(/template|instance|completed|completion/i).first()).toBeVisible()
  })

  test('shows API-seeded overview numbers', async ({ page, e2eData }) => {
    const templatesBaseline = await getAntStatisticNumber(page, /templates used/i)
    const instancesBaseline = await getAntStatisticNumber(page, /instances created/i)

    await e2eData.createRichScenario('stats')

    await page.goto('/stats')
    await page.waitForLoadState('networkidle')

    await expectAntStatisticIncrease(page, /templates used/i, templatesBaseline)
    await expectAntStatisticIncrease(page, /instances created/i, instancesBaseline)
  })

  test('date range inputs are present', async ({ page }) => {
    const dateInputs = page.locator('.ant-picker-range input')
    await expect(dateInputs.first()).toBeVisible()
    await expect(dateInputs.nth(1)).toBeVisible()
  })

  test('preset buttons are clickable', async ({ page }) => {
    const presets = ['Last 7 days', 'Last 30 days', 'Last 90 days']
    for (const preset of presets) {
      const btn = page.getByRole('button', { name: preset })
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('Export CSV button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible()
  })

  test('shows top templates section', async ({ page }) => {
    await expect(page.getByText(/top templates/i)).toBeVisible()
  })
})
