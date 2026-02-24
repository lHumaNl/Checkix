import { test, expect } from '../../fixtures/auth.fixture'

test.describe('Data Isolation', () => {
  // Unauthenticated access tests need no stored auth
  test.use({ storageState: { cookies: [], origins: [] } })
  test.describe('Multi-user isolation', () => {
    // These tests require a second user to be seeded in the dev database.
    // To set up: python scripts/manage.py shell
    //   from django.contrib.auth import get_user_model
    //   User = get_user_model()
    //   User.objects.create_user(username='testuser-b', password='password456')

    test.skip(true, 'Requires second test user — see comment for setup instructions')

    test('User A cannot see User B checklists', async () => {
      // Placeholder for multi-user test
    })

    test('User A cannot access User B checklist via direct URL', async () => {
      // Placeholder for multi-user test
    })
  })

  test.describe('Unauthenticated access', () => {
    test('unauthenticated user cannot access checklists', async ({ page }) => {
      await page.goto('/checklists')
      await expect(page).toHaveURL(/login/)
    })

    test('unauthenticated user cannot access checklist detail', async ({ page }) => {
      await page.goto('/checklists/123')
      await expect(page).toHaveURL(/login/)
    })

    test('unauthenticated user cannot access instance page', async ({ page }) => {
      await page.goto('/instances/123')
      await expect(page).toHaveURL(/login/)
    })

    test('session expires and redirects to login', async ({ page }) => {
      await page.route('**/api/v1/**', (route) => {
        const url = route.request().url()
        if (url.includes('/auth/token/')) {
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
      await expect(page).toHaveURL(/login/)
    })
  })
})
