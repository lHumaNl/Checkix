import { test, expect, testUsers } from '../../fixtures/auth.fixture'

// Login tests must start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders login form correctly', async ({ page }) => {
    await expect(page.locator('h2:has-text("Checkix")')).toBeVisible()
    await expect(page.locator('#username')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.getByText('Sign in to your account')).toBeVisible()
  })

  test('shows loading state during login', async ({ page }) => {
    await page.route('**/api/v1/auth/token/', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      route.continue()
    })

    await page.locator('#username').fill('testuser')
    await page.locator('#password').fill('password')
    await page.locator('button[type="submit"]').click()

    await expect(page.locator('.animate-spin')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
  })

  test('redirects to dashboard on valid credentials', async ({ page, authPage }) => {
    await authPage.login(testUsers.admin.username, testUsers.admin.password)
    await authPage.expectLoggedIn()
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('shows error on invalid credentials', async ({ page, authPage }) => {
    await authPage.login('invaliduser', 'wrongpassword')
    await authPage.expectError(/invalid|credentials|No active account/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows error message when API returns error', async ({ page }) => {
    await page.route('**/api/v1/auth/token/', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials' }),
      })
    })

    await page.locator('#username').fill('testuser')
    await page.locator('#password').fill('wrongpass')
    await page.locator('button[type="submit"]').click()

    await expect(page.locator('.bg-red-50, .bg-red-900\\/50')).toContainText('Invalid credentials')
  })

  test('shows generic error on network failure', async ({ page }) => {
    await page.route('**/api/v1/auth/token/', (route) => route.abort('failed'))

    await page.locator('#username').fill('testuser')
    await page.locator('#password').fill('password')
    await page.locator('button[type="submit"]').click()

    await expect(page.locator('.bg-red-50, .bg-red-900\\/50')).toContainText(/failed|error/i)
  })

  test('prevents submit with empty fields via HTML required', async ({ page }) => {
    // HTML required attribute prevents form submission
    // Verify the fields have the required attribute
    await expect(page.locator('#username')).toHaveAttribute('required', '')
    await expect(page.locator('#password')).toHaveAttribute('required', '')
  })

  test('submit button is disabled while loading', async ({ page }) => {
    await page.route('**/api/v1/auth/token/', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access: 'token', refresh: 'refresh' }),
      })
    })

    await page.locator('#username').fill('testuser')
    await page.locator('#password').fill('password')
    await page.locator('button[type="submit"]').click()

    await expect(page.locator('button[type="submit"]')).toBeDisabled()
  })

  test('theme toggle cycles through modes', async ({ page }) => {
    const toggle = page.locator('button[aria-label^="Theme:"]')
    await expect(toggle).toBeVisible()

    // Click through: light → dark → system → light
    const initialLabel = await toggle.getAttribute('aria-label')
    await toggle.click()
    await page.waitForTimeout(200)
    const secondLabel = await toggle.getAttribute('aria-label')
    expect(secondLabel).not.toBe(initialLabel)

    await toggle.click()
    await page.waitForTimeout(200)
    const thirdLabel = await toggle.getAttribute('aria-label')
    expect(thirdLabel).not.toBe(secondLabel)
  })
})
