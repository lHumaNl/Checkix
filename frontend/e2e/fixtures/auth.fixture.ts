import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test'

export interface TestUser {
  username: string
  password: string
}

export const testUsers: Record<string, TestUser> = {
  admin: { username: 'admin', password: '1' },
}

const API_ROOT = '/api'
const E2E_PREFIX = 'e2e-rich'

interface IdentifiedEntity {
  id: number
}

export interface RichE2EScenario {
  calendarEventTitle: string
  checklistDescription: string
  checklistId: number
  checklistItemTitles: string[]
  checklistTitle: string
  folderName: string
  instanceId: number
  tagName: string
  todoItemTitles: string[]
  todoListId: number
  todoListName: string
}

interface CreatedIds {
  calendarEvents: number[]
  checklists: number[]
  folders: number[]
  instances: number[]
  tags: number[]
  todoLists: number[]
}

export class E2EDataBuilder {
  private accessToken: string | null = null
  private readonly created: CreatedIds = {
    calendarEvents: [],
    checklists: [],
    folders: [],
    instances: [],
    tags: [],
    todoLists: [],
  }

  constructor(private readonly request: APIRequestContext) {}

  async createRichScenario(label = 'core'): Promise<RichE2EScenario> {
    const runId = this.makeRunId(label)
    const tag = await this.createTrackedTag(`${runId}-tag`)
    const folder = await this.createTrackedFolder(`${runId}-folder`)
    const checklist = await this.createTrackedChecklist(runId, folder.id, tag.id)
    const todo = await this.createTrackedTodoList(runId, folder.id, tag.id)
    await this.createTrackedCalendarEvent(runId, checklist.id)
    const instance = await this.createCompletedInstance(runId, checklist.id)

    return {
      calendarEventTitle: `${runId} calendar review`,
      checklistDescription: `${runId} checklist description`,
      checklistId: checklist.id,
      checklistItemTitles: [`${runId} first check`, `${runId} second check`],
      checklistTitle: `${runId} checklist`,
      folderName: `${runId}-folder`,
      instanceId: instance.id,
      tagName: `${runId}-tag`,
      todoItemTitles: [`${runId} pending todo`, `${runId} completed todo`],
      todoListId: todo.id,
      todoListName: `${runId} todo list`,
    }
  }

  async cleanup(): Promise<void> {
    if (!this.accessToken) return
    await this.deleteTracked('instances', (id) => `${API_ROOT}/instances/${id}/`)
    await this.deleteTracked('calendarEvents', (id) => `${API_ROOT}/calendar-events/${id}/`)
    await this.deleteTracked('todoLists', (id) => `${API_ROOT}/todos/${id}/`)
    await this.deleteTracked('checklists', (id) => `${API_ROOT}/checklists/${id}/`)
    await this.deleteTracked('folders', (id) => `${API_ROOT}/folders/${id}/`)
    await this.deleteTracked('tags', (id) => `${API_ROOT}/tags/${id}/`)
  }

  private makeRunId(label: string): string {
    const suffix = Math.random().toString(36).slice(2, 8)
    return `${E2E_PREFIX}-${label}-${Date.now()}-${suffix}`
  }

  private async createTrackedTag(name: string): Promise<IdentifiedEntity> {
    const tag = await this.api<IdentifiedEntity>('POST', `${API_ROOT}/tags/`, { name, color: '#2563eb' })
    this.created.tags.push(tag.id)
    return tag
  }

  private async createTrackedFolder(name: string): Promise<IdentifiedEntity> {
    const folder = await this.api<IdentifiedEntity>('POST', `${API_ROOT}/folders/`, { name })
    this.created.folders.push(folder.id)
    return folder
  }

  private async createTrackedChecklist(runId: string, folderId: number, tagId: number): Promise<IdentifiedEntity> {
    const checklist = await this.api<IdentifiedEntity>('POST', `${API_ROOT}/checklists/`, {
      name: `${runId} checklist`,
      description: `${runId} checklist description`,
      folder_id: folderId,
      tags: [tagId],
      status: 'active',
      sequential_mode: true,
      category: 'E2E',
      items: [
        { title: `${runId} first check`, order: 0, is_required: true },
        { title: `${runId} second check`, order: 1, is_required: false },
      ],
    })
    this.created.checklists.push(checklist.id)
    return checklist
  }

  private async createTrackedTodoList(runId: string, folderId: number, tagId: number): Promise<IdentifiedEntity> {
    const list = await this.api<IdentifiedEntity>('POST', `${API_ROOT}/todos/`, {
      name: `${runId} todo list`,
      description: `${runId} todo description`,
      folder_id: folderId,
      tags: [tagId],
      priority: 'high',
    })
    this.created.todoLists.push(list.id)
    await this.createTodoItems(runId, list.id)
    return list
  }

  private async createTodoItems(runId: string, listId: number): Promise<void> {
    await this.api('POST', `${API_ROOT}/todos/${listId}/items/`, { title: `${runId} pending todo`, priority: 'high', order: 0 })
    const done = await this.api<IdentifiedEntity>('POST', `${API_ROOT}/todos/${listId}/items/`, { title: `${runId} completed todo`, priority: 'medium', order: 1 })
    await this.api('PUT', `${API_ROOT}/todos/${listId}/items/${done.id}/`, { status: 'completed', is_completed: true })
  }

  private async createTrackedCalendarEvent(runId: string, checklistId: number): Promise<IdentifiedEntity> {
    const event = await this.api<IdentifiedEntity>('POST', `${API_ROOT}/calendar-events/`, {
      title: `${runId} calendar review`,
      description: `${runId} calendar description`,
      start_time: this.futureAtHour(10),
      end_time: this.futureAtHour(11),
      event_type: 'checklist',
      checklist_template: checklistId,
      color: '#7c3aed',
    })
    this.created.calendarEvents.push(event.id)
    return event
  }

  private async createCompletedInstance(runId: string, checklistId: number): Promise<IdentifiedEntity> {
    const instance = await this.api<IdentifiedEntity>('POST', `${API_ROOT}/instances/`, {
      template_id: checklistId,
      name: `${runId} completed run`,
    })
    this.created.instances.push(instance.id)
    await this.api('POST', `${API_ROOT}/instances/${instance.id}/start/`)
    await this.api('POST', `${API_ROOT}/instances/${instance.id}/complete/`)
    return instance
  }

  private futureAtHour(hour: number): string {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(hour, 0, 0, 0)
    return date.toISOString()
  }

  private async api<T = unknown>(method: string, url: string, data?: unknown): Promise<T> {
    await this.ensureAuthenticated()
    const response = await this.request.fetch(url, { data, headers: this.authHeaders(), method })
    expect(response.ok(), `${method} ${url} should succeed`).toBeTruthy()
    return response.json() as Promise<T>
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken) return
    const response = await this.request.post(`${API_ROOT}/auth/token/`, { data: testUsers.admin })
    expect(response.ok(), 'E2E API login should succeed').toBeTruthy()
    const body = await response.json() as { access: string }
    this.accessToken = body.access
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}` }
  }

  private async deleteTracked(key: keyof CreatedIds, urlFor: (id: number) => string): Promise<void> {
    const ids = [...this.created[key]].reverse()
    await Promise.all(ids.map((id) => this.deleteIfExists(urlFor(id))))
  }

  private async deleteIfExists(url: string): Promise<void> {
    await this.request.delete(url, { headers: this.authHeaders() }).catch(() => undefined)
  }
}

export class AuthPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async login(username: string, password: string) {
    await this.page.getByLabel('Username').fill(username)
    await this.page.getByLabel('Password').fill(password)
    await this.page.getByRole('button', { name: 'Sign in' }).click()
  }

  async expectLoggedIn() {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 10_000 })
  }

  async expectError(message: string | RegExp) {
    await expect(this.page.getByRole('alert')).toContainText(message)
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
    const dialog = this.page.getByRole('dialog', { name: /Checklist/ })
    await dialog.getByRole('textbox', { name: 'Checklist title' }).fill(title)

    if (options?.items) {
      for (let i = 0; i < options.items.length; i++) {
        // First item slot already exists at index 0
        if (i > 0) {
          await dialog.getByRole('button', { name: 'Add Item' }).click()
        }
        await dialog.getByRole('textbox', { name: 'Item content' }).nth(i).fill(options.items[i])
      }
    }

    if (options?.status) {
      const statusLabel = options.status[0].toUpperCase() + options.status.slice(1)
      await dialog.getByText(statusLabel, { exact: true }).click()
    }

    await dialog.getByRole('button', { name: 'Create Checklist' }).click()
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
  e2eData: E2EDataBuilder
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

  e2eData: async ({ request }, fixture) => {
    const builder = new E2EDataBuilder(request)
    await fixture(builder)
    await builder.cleanup()
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
