import { test as base, expect } from '@playwright/test'

/**
 * Every test fails if the page logs a console error, without each test having
 * to remember to check.
 *
 * The one exclusion is Vercel's analytics script, which only exists once the
 * site is deployed, so it always 404s on localhost.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', m => {
        if (m.type() !== 'error') return
        if (/_vercel\/insights/.test(m.location().url)) return
        errors.push(m.text())
      })
      page.on('pageerror', e => errors.push(e.message))
      await use(errors)
      expect(errors, 'no console errors or uncaught exceptions').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
