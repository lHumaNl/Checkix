import { test as base, expect, type Page } from '@playwright/test'

export interface TestUser {
  username: string
  password: string
}

export const testUsers: Record<string, TestUser> = {
  admin: { username: 'admin', password: '1' },
}

export class AuthPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async login(username: string, password: string) {
    await this.page.locator('#username').fill(username)
    await this.page.locator('#password').fill(password)
    await this.page.locator('button[type="submit"]').click()
  }

  async expectLoggedIn() {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 10_000 })
  }

  async expectError(message: string | RegExp) {
    await expect(this.page.locator('.bg-red-50, .bg-red-900\\/50')).toContainText(message)
  }
}

export class ChecklistsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/checklists')
    await this.page.waitForLoadState('networkidle')
  }

  async createChecklist(title: string, options?: { items?: string[]; status?: string }) {
    await this.page.getByRole('button', { name: 'New Checklist' }).click()
    await this.page.locator('input[name="title"]').fill(title)

    if (options?.items) {
      for (let i = 0; i < options.items.length; i++) {
        // First item slot already exists at index 0
        if (i > 0) {
          await this.page.getByRole('button', { name: 'Add Item' }).click()
        }
        await this.page.locator(`input[name="items.${i}.content"]`).fill(options.items[i])
      }
    }

    if (options?.status) {
      await this.page.locator(`input[type="radio"][value="${options.status}"]`).check()
    }

    await this.page.getByRole('button', { name: 'Create Checklist' }).click()
    // Wait for modal to close
    await this.page.waitForTimeout(500)
  }

  async expectChecklistVisible(title: string) {
    await expect(this.page.getByText(title).first()).toBeVisible({ timeout: 5000 })
  }

  async expectChecklistNotVisible(title: string) {
    await expect(this.page.getByText(title)).not.toBeVisible({ timeout: 5000 })
  }
}

export class InstancePage {
  constructor(private page: Page) {}

  async goto(id: number) {
    await this.page.goto(`/instances/${id}`)
  }

  async start() {
    await this.page.getByRole('button', { name: 'Start' }).click()
  }

  async pause() {
    await this.page.getByRole('button', { name: 'Pause' }).click()
  }

  async resume() {
    await this.page.getByRole('button', { name: 'Resume' }).click()
  }

  async complete() {
    await this.page.getByRole('button', { name: 'Complete' }).click()
    // Confirm in ConfirmDialog
    await this.page.getByRole('button', { name: 'Complete' }).last().click()
  }

  async cancel() {
    // Use the dropdown Cancel
    await this.page.getByRole('button', { name: 'Cancel' }).click()
    // Confirm in ConfirmDialog
    await this.page.getByRole('button', { name: 'Cancel checklist' }).click()
  }

  async checkItem(content: string) {
    // ItemCheckbox — clicking the text toggles it
    await this.page.getByText(content, { exact: true }).click()
  }

  async expectItemChecked(content: string) {
    await expect(this.page.locator('.line-through').filter({ hasText: content })).toBeVisible({ timeout: 3000 })
  }

  async expectItemNotChecked(content: string) {
    await expect(this.page.locator('.line-through').filter({ hasText: content })).not.toBeVisible()
  }

  async expectStarted() {
    await expect(this.page.getByRole('button', { name: 'Pause' })).toBeVisible()
  }

  async expectCompleted() {
    await expect(this.page.getByText('Completed')).toBeVisible()
  }

  async expectPaused() {
    await expect(this.page.getByRole('button', { name: 'Resume' })).toBeVisible()
  }
}

type TestFixtures = {
  authPage: AuthPage
  checklistsPage: ChecklistsPage
  instancePage: InstancePage
  authenticatedPage: Page
}

export const test = base.extend<TestFixtures>({
  authPage: async ({ page }, fixture) => {
    await fixture(new AuthPage(page))
  },

  checklistsPage: async ({ page }, fixture) => {
    await fixture(new ChecklistsPage(page))
  },

  instancePage: async ({ page }, fixture) => {
    await fixture(new InstancePage(page))
  },

  authenticatedPage: async ({ page }, fixture) => {
    // storageState from global-setup provides auth automatically.
    // Just navigate to the app and verify we're logged in.
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await fixture(page)
  },
})

export { expect }
