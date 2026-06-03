import { type Page, expect } from '@playwright/test'

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded')
}

export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

export async function setLocalStorageToken(page: Page, accessToken: string, refreshToken: string) {
  await page.evaluate(
    ({ access, refresh }) => {
      localStorage.setItem('refresh_token', refresh)
      ;(window as unknown as Record<string, unknown>).__access_token = access
    },
    { access: accessToken, refresh: refreshToken }
  )
}

export async function mockApiError(page: Page, path: string, status: number, body: object) {
  await page.route(`**/api/v1${path}`, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

export async function mockApiSuccess(page: Page, path: string, body: object, method = 'GET') {
  await page.route(`**/api/v1${path}`, (route) => {
    if (route.request().method() === method) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    } else {
      route.continue()
    }
  })
}

export async function expectToast(page: Page, message: string | RegExp) {
  const toast = page
    .locator('[data-state="open"], .ant-message-notice, .ant-notification-notice')
    .filter({ hasText: message })
  await expect(toast.first()).toBeVisible({ timeout: 5000 })
}

export async function dismissToast(page: Page) {
  const closeBtn = page.locator('[data-state="open"] [toast-close]')
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click()
  }
}

export async function waitForSpinnerToDisappear(page: Page) {
  await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10_000 })
}

export function generateUniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function getAntStatisticNumber(page: Page, label: string | RegExp): Promise<number> {
  const statistic = page.locator('.ant-statistic').filter({ hasText: label }).first()
  await expect(statistic).toBeVisible({ timeout: 10_000 })
  const text = await statistic.locator('.ant-statistic-content-value').innerText()
  return Number(text.replace(/[^0-9.-]/g, ''))
}

export async function expectAntStatisticAtLeast(page: Page, label: string | RegExp, minimum: number) {
  await expect.poll(() => getAntStatisticNumber(page, label)).toBeGreaterThanOrEqual(minimum)
}

export async function expectAntStatisticIncrease(
  page: Page,
  label: string | RegExp,
  baseline: number,
  minimumIncrease = 1
) {
  await expect.poll(() => getAntStatisticNumber(page, label)).toBeGreaterThanOrEqual(baseline + minimumIncrease)
}
