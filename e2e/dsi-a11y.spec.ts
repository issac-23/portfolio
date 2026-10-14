import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { APPS, openApp, openMenu } from './helpers/dsi'

/**
 * The bar the home page has to clear: WCAG 2 AA by axe in
 * both themes, on the menu, inside every app, and in plain view, plus the
 * keyboard basics axe cannot see.
 */

async function expectNoViolations(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const summary = violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)
  expect(summary, `axe violations on ${where}`).toEqual([])
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(t => localStorage.setItem('theme', t), theme)
      await page.route('**/api/spotify/now-playing', r =>
        r.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            isPlaying: false,
            recentTracks: [{ title: 'Ivy', artist: 'Frank Ocean', album: 'Blonde', albumImageUrl: '', songUrl: 'https://open.spotify.com/track/x' }],
            // The week's lists are part of Sound, so axe has to see them too.
            week: {
              since: '2026-10-06T00:00:00.000Z',
              plays: 3,
              topArtists: [{ name: 'Frank Ocean', plays: 2, imageUrl: '' }],
              topTracks: [
                { title: 'Ivy', artist: 'Frank Ocean', album: 'Blonde', albumImageUrl: '', songUrl: 'https://open.spotify.com/track/x', plays: 1 },
              ],
            },
          }),
        }),
      )
    })

    test('the menu', async ({ page }) => {
      await openMenu(page)
      await expectNoViolations(page, 'the menu')
    })

    for (const app of APPS) {
      test(app, async ({ page }) => {
        await openApp(page, app)
        await expectNoViolations(page, app)
      })
    }

    test('plain view', async ({ page }) => {
      await page.goto('/?view=plain')
      await expectNoViolations(page, 'plain view')
    })
  })
}

test('one h1 on the menu and in plain view', async ({ page }) => {
  await openMenu(page)
  await expect(page.locator('h1')).toHaveCount(1)
  await page.goto('/?view=plain')
  await expect(page.locator('h1')).toHaveCount(1)
})

test('the skip link is the first stop and moves focus into the page', async ({ page }) => {
  await openMenu(page)
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main-content$/)
  // The next Tab carries on from inside main, so the resume and the way out
  // are right there.
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Resume' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Plain view' })).toBeFocused()
})

test('every app is reachable and returns using the keyboard alone', async ({ page }) => {
  await openMenu(page)
  for (const app of APPS) {
    await page.keyboard.press('Enter')
    await page.locator('.dsi-app-lower').waitFor()
    await page.keyboard.press('Escape')
    await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached' })
    await expect(page.getByRole('button', { name: app, exact: true })).toBeFocused()
    await page.keyboard.press('ArrowRight')
  }
})
