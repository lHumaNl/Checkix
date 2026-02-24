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
    // Avatar is a div with initials, bg-blue-600 or similar
    const avatar = page.locator('.bg-blue-600, .bg-indigo-600').filter({ hasText: /[A-Z]/ })
    await expect(avatar.first()).toBeVisible()
  })

  test('has editable name fields', async ({ page }) => {
    const firstName = page.locator('input[name="first_name"]')
    const lastName = page.locator('input[name="last_name"]')

    await expect(firstName).toBeVisible()
    await expect(lastName).toBeVisible()
  })

  test('saves profile changes', async ({ page }) => {
    const firstName = page.locator('input[name="first_name"]')
    await firstName.fill('TestName')

    await page.getByRole('button', { name: /save/i }).click()

    await expectToast(page, /profile updated/i)
  })

  test('shows account information', async ({ page }) => {
    await expect(page.getByText('Member since', { exact: true })).toBeVisible()
  })
})
