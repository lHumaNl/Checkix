import { test, expect, testUsers } from '../../fixtures/auth.fixture'

// Login tests must start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders login form correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Checkix' })).toBeVisible()
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByText('Sign in to your account')).toBeVisible()
  })

  test('shows loading state during login', async ({ page }) => {
    await page.route('**/api/auth/token/', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      route.continue()
    })

    await page.getByLabel('Username').fill('testuser')
    await page.getByLabel('Password').fill('password')
    const submitButton = page.getByRole('button', { name: 'Sign in' })
    await submitButton.click()

    await expect(submitButton).toHaveClass(/ant-btn-loading/)
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
    await page.route('**/api/auth/token/', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials' }),
      })
    })

    await page.getByLabel('Username').fill('testuser')
    await page.getByLabel('Password').fill('wrongpass')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('alert')).toContainText('Invalid credentials')
  })

  test('shows generic error on network failure', async ({ page }) => {
    await page.route('**/api/auth/token/', (route) => route.abort('failed'))

    await page.getByLabel('Username').fill('testuser')
    await page.getByLabel('Password').fill('password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('alert')).toContainText(/failed|error/i)
  })

  test('validates empty required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Username is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('submit button is disabled while loading', async ({ page }) => {
    await page.route('**/api/auth/token/', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access: 'token', refresh: 'refresh' }),
      })
    })

    await page.getByLabel('Username').fill('testuser')
    await page.getByLabel('Password').fill('password')
    const submitButton = page.getByRole('button', { name: 'Sign in' })
    await submitButton.click()

    await expect(submitButton).toHaveClass(/ant-btn-loading/)
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
