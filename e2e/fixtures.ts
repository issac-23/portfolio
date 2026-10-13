import { test as base, expect } from '@playwright/test'

/**
 * Every test fails if the page logs a console error, without each test having
 * to remember to check.
 *
 * The one standing exclusion is Vercel's analytics script, which only exists
 * once the site is deployed, so it always 404s on localhost. A test that
 * provokes an error on purpose lists it in `expectedErrors`, so the
 * exception sits next to the reason for it.
 *
 * The boot screen is skipped unless a test asks for it with `boot: true`.
 * It swallows the first key on purpose, which every other test would trip on.
 */
export const test = base.extend<{ expectedErrors: RegExp[]; boot: boolean; consoleErrors: string[]; skipBoot: void }>({
  expectedErrors: [[], { option: true }],
  boot: [false, { option: true }],
  skipBoot: [
    async ({ page, boot }, use) => {
      if (!boot) await page.addInitScript(() => sessionStorage.setItem('dsi-booted', '1'))
      await use()
    },
    { auto: true },
  ],
  consoleErrors: [
    async ({ page, expectedErrors }, use) => {
      const errors: string[] = []
      page.on('console', m => {
        if (m.type() !== 'error') return
        if (/_vercel\/insights/.test(m.location().url)) return
        if (expectedErrors.some(re => re.test(m.text()))) return
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
