import { test, expect } from '../../fixtures/auth.fixture'
import { expectToast } from '../../utils/helpers'

test.describe('Profile Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/profile')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('renders profile page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible()
  })

  test('displays username', async ({ page }) => {
    await expect(page.getByText('@admin').first()).toBeVisible()
  })

  test('shows avatar with initials', async ({ page }) => {
    const avatar = page.locator('main .ant-avatar').filter({ hasText: /^[A-Z]{1,2}$/ })
    await expect(avatar.first()).toBeVisible()
  })

  test('has editable work and locale fields', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: 'Department' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Employee ID' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Timezone' })).toBeVisible()
  })

  test('saves profile changes', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Department' }).fill('Engineering')

    await page.getByRole('button', { name: /save/i }).click()

    await expectToast(page, /profile updated/i)
  })

  test('shows account information', async ({ page }) => {
    await expect(page.getByText('Member since', { exact: true })).toBeVisible()
  })
})
