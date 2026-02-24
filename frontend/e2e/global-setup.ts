import { chromium, type FullConfig } from '@playwright/test'

const AUTH_FILE = 'e2e/.auth/user.json'

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173'

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(`${baseURL}/login`)
  await page.locator('#username').fill('admin')
  await page.locator('#password').fill('1')
  await page.locator('button[type="submit"]').click()

  // Wait for redirect away from login
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15_000 })

  // Save storage state (cookies + localStorage)
  await page.context().storageState({ path: AUTH_FILE })

  await browser.close()
}

export default globalSetup
