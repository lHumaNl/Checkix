import { test, expect } from '../fixtures/auth.fixture'

test.describe('Theme, i18n, and calendar readability', () => {
  test('applies dark theme to dashboard Ant Design cards', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    const cardBackground = await page.locator('.ant-pro-card').first().evaluate((element) => {
      return getComputedStyle(element).backgroundColor
    })
    expect(cardBackground).not.toBe('rgb(255, 255, 255)')
  })

  test('updates dashboard text colors during live light to dark toggle', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('language', 'en')
      localStorage.setItem('theme', 'light')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    await page.getByRole('button', { name: 'Theme: light' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await expect.poll(async () => (
      page.locator('.ant-pro-card').first().evaluate((element) => getComputedStyle(element).backgroundColor)
    )).toBe('rgb(17, 24, 39)')

    const blackTextViolations = await page.locator('main').evaluate((main) => {
      function parseCssColor(value: string) {
        const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
        if (!match) return null
        return {
          r: Number(match[1]),
          g: Number(match[2]),
          b: Number(match[3]),
          a: match[4] === undefined ? 1 : Number(match[4]),
        }
      }

      function isBlackish(value: string) {
        const color = parseCssColor(value)
        return Boolean(color && color.a > 0.4 && color.r < 80 && color.g < 80 && color.b < 80)
      }

      const walker = document.createTreeWalker(
        main,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            return node.textContent?.trim()
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT
          },
        }
      )
      const violations = []

      while (walker.nextNode()) {
        const node = walker.currentNode
        const element = node.parentElement
        if (!element) continue

        const rect = element.getBoundingClientRect()
        const text = (node.textContent || '').trim().replace(/\s+/g, ' ')
        if (!text || rect.width === 0 || rect.height === 0) continue

        const style = getComputedStyle(element)
        const colorValues = [style.color]
        if (element instanceof SVGTextElement || element.tagName.toLowerCase() === 'text') {
          colorValues.push(style.fill)
        }

        if (!colorValues.some(isBlackish)) continue

        violations.push({
          tag: element.tagName,
          className: element.getAttribute('class') || '',
          text: text.slice(0, 120),
          color: style.color,
          fill: style.fill,
        })
      }

      return violations
    })

    expect(blackTextViolations).toEqual([])
  })

  test('persists language override and renders localized labels', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('language-select').selectOption('es')

    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()
    await expect(page.getByText('Listas').first()).toBeVisible()

    const storedLanguage = await page.evaluate(() => localStorage.getItem('language'))
    expect(storedLanguage).toBe('es')
  })

  test('renders readable calendar controls in dark mode', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('.calendar-shell')).toBeVisible()
    await expect(page.locator('.rbc-month-view')).toBeVisible()
    await expect(page.getByRole('button', { name: /new event/i })).toBeVisible()

    const calendarBackground = await page.locator('.calendar-shell').evaluate((element) => {
      return getComputedStyle(element).backgroundColor
    })
    expect(calendarBackground).not.toBe('rgb(255, 255, 255)')
  })
})
