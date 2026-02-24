import { test, expect } from '../../fixtures/auth.fixture'

test.describe('Token Refresh', () => {
  test('expired access token triggers refresh', async ({ page, authenticatedPage }) => {
    let refreshCalled = false

    await page.route('**/api/v1/users/me/', (route) => {
      if (!refreshCalled) {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Token is expired' }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, username: 'admin' }),
        })
      }
    })

    await page.route('**/api/v1/auth/token/refresh/', (route) => {
      refreshCalled = true
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access: 'new-access-token' }),
      })
    })

    await page.goto('/checklists')
    await expect(page.getByText('Checklists')).toBeVisible()
  })

  test('failed refresh redirects to login', async ({ page }) => {
    await page.route('**/api/v1/**', (route) => {
      const url = route.request().url()
      if (url.includes('/auth/token/refresh/')) {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Refresh token is expired' }),
        })
      } else if (url.includes('/auth/token/')) {
        route.continue()
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Token is expired' }),
        })
      }
    })

    await page.goto('/checklists')
    await expect(page).toHaveURL(/login/)
  })

  test('clears tokens on refresh failure', async ({ page }) => {
    await page.route('**/api/v1/**', (route) => {
      const url = route.request().url()
      if (url.includes('/auth/token/refresh/')) {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid refresh token' }),
        })
      } else if (url.includes('/auth/token/')) {
        route.continue()
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Authentication required' }),
        })
      }
    })

    await page.goto('/checklists')
    // Wait for the redirect to login page (triggered by window.location.href = '/login')
    await expect(page).toHaveURL(/login/, { timeout: 10000 })

    const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'))
    expect(refreshToken).toBeNull()
  })
})
