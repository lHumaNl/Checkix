import '@testing-library/jest-dom/vitest'
import { afterEach, afterAll, beforeAll, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, 'localStorage', {
  value: {
    store: {} as Record<string, string>,
    getItem(key: string) {
      return this.store[key] || null
    },
    setItem(key: string, value: string) {
      this.store[key] = value
    },
    removeItem(key: string) {
      delete this.store[key]
    },
    clear() {
      this.store = {}
    },
    get length() {
      return Object.keys(this.store).length
    },
    key(index: number) {
      const keys = Object.keys(this.store)
      return keys[index] || null
    },
  },
})

beforeEach(() => {
  window.localStorage.clear()
})

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
