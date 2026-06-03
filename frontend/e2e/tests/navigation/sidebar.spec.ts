import { test, expect } from '../../fixtures/auth.fixture'

const navLinks = [
  { label: 'Dashboard', url: '/' },
  { label: 'Checklists', url: '/checklists' },
  { label: 'Todos', url: '/todos' },
  { label: 'Calendar', url: '/calendar' },
  { label: 'Community', url: '/community' },
  { label: 'Assignments', url: '/assignments' },
  { label: 'Run Links', url: '/run-links' },
  { label: 'Webhooks', url: '/webhooks' },
  { label: 'Notifications', url: '/notifications' },
  { label: 'Statistics', url: '/stats' },
  { label: 'Profile', url: '/profile' },
]

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  function primaryNav(page: import('@playwright/test').Page) {
    return page.locator('.ant-layout-sider').getByRole('menu', { name: 'Primary navigation' })
  }

  test('all nav items are visible', async ({ page }) => {
    for (const { label } of navLinks) {
      await expect(primaryNav(page).getByRole('link', { name: label })).toBeVisible()
    }
  })

  for (const { label, url } of navLinks) {
    test(`navigates to ${label} (${url})`, async ({ page }) => {
      await primaryNav(page).getByRole('link', { name: label }).click()
      await page.waitForLoadState('networkidle')

      if (url === '/') {
        await expect(page).toHaveURL(url)
      } else {
        await expect(page).toHaveURL(new RegExp(url))
      }
    })
  }

  test('active nav item is highlighted', async ({ page }) => {
    await page.goto('/checklists')
    await page.waitForLoadState('networkidle')

    const activeItem = primaryNav(page).locator('.ant-menu-item-selected')
    await expect(activeItem).toContainText('Checklists')
  })

  test('Checkix logo navigates to dashboard', async ({ page }) => {
    await page.goto('/checklists')
    await page.waitForLoadState('networkidle')

    await page.locator('.ant-layout-sider').getByRole('link', { name: /checkix/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('theme toggle cycles through modes', async ({ page }) => {
    // The theme toggle is in the header
    const toggle = page.locator('header button[aria-label^="Theme:"]')
    await expect(toggle).toBeVisible()

    const firstLabel = await toggle.getAttribute('aria-label')
    await toggle.click()
    await expect(toggle).not.toHaveAttribute('aria-label', firstLabel ?? '')

    const secondLabel = await toggle.getAttribute('aria-label')
    expect(secondLabel).not.toBe(firstLabel)

    await toggle.click()
    await expect(toggle).not.toHaveAttribute('aria-label', secondLabel ?? '')

    const thirdLabel = await toggle.getAttribute('aria-label')
    expect(thirdLabel).not.toBe(secondLabel)

    await toggle.click()

    const fourthLabel = await toggle.getAttribute('aria-label')
    expect(fourthLabel).toBe(firstLabel)
  })
})
