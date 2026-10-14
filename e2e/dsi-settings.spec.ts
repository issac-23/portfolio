import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { openApp, openMenu } from './helpers/dsi'
import { mockSpotifyQuiet } from './helpers/spotify'

/**
 * System Settings: the three switches that let the theme exist without
 * trapping anyone in it.
 */

const isDark = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('dark'))
const shell = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.querySelector('.dsi-root')!).getPropertyValue('--dsi-shell').trim())
const stored = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key)

const LIGHT_BLUE = '#58c8e9'
const MATTE_BLACK = '#2f3337'

test('Theme cycles Auto, Light Blue, Matte Black and back, and sticks across visits', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await openApp(page, 'System Settings')
  const theme = page.getByRole('button', { name: /^Theme/ })
  await expect(theme).toBeFocused()
  await expect(theme).toContainText('Auto')

  await theme.click()
  await expect(theme).toContainText('Light Blue')
  expect(await stored(page, 'theme')).toBe('light')
  expect(await shell(page)).toBe(LIGHT_BLUE)

  await theme.click()
  await expect(theme).toContainText('Matte Black')
  expect(await stored(page, 'theme')).toBe('dark')
  expect(await isDark(page)).toBe(true)
  expect(await shell(page)).toBe(MATTE_BLACK)

  // Set before first paint by the root layout's script, not after hydration.
  await page.reload({ waitUntil: 'commit' })
  await page.waitForSelector('.dsi-root', { state: 'attached' })
  expect(await isDark(page)).toBe(true)

  await openApp(page, 'System Settings')
  await page.getByRole('button', { name: /^Theme/ }).click()
  await expect(page.getByRole('button', { name: /^Theme/ })).toContainText('Auto')
  expect(await stored(page, 'theme')).toBeNull()
  expect(await isDark(page)).toBe(false)
})

test('Auto follows the device when it changes mid-visit', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await openMenu(page)
  expect(await isDark(page)).toBe(false)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => isDark(page)).toBe(true)
})

test('a theme picked on the classic site carries over to the DSi', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
  await openMenu(page)
  expect(await shell(page)).toBe(MATTE_BLACK)
})

test('Reduce motion turns off every effect from then on, and is remembered', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __fxAdded: number }
    w.__fxAdded = 0
    new MutationObserver(rs => {
      for (const r of rs) if ((r.target as Element).classList?.contains('dsi-fx')) w.__fxAdded += r.addedNodes.length
    }).observe(document, { childList: true, subtree: true })
  })
  const added = () => page.evaluate(() => (window as unknown as { __fxAdded: number }).__fxAdded)

  await openApp(page, 'System Settings')
  const sw = page.getByRole('switch', { name: 'Reduce motion' })
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  expect(await page.evaluate(() => document.documentElement.dataset.motion)).toBe('reduce')
  expect(await stored(page, 'dsi-motion')).toBe('reduce')

  const before = await added()
  await page.keyboard.press('Escape')
  await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached' })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await page.locator('.dsi-app-lower').waitFor()
  expect(await added(), 'neither the return nor the launch drew anything').toBe(before)

  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.dataset.motion)).toBe('reduce')
  const railTransition = await page.evaluate(() => getComputedStyle(document.querySelector('.dsi-rail')!).transitionDuration)
  expect(railTransition).toBe('0s')
})

test('Plain view opens from Settings, is remembered, and the DSi is one link away', async ({ page }) => {
  await mockSpotifyQuiet(page)
  await openApp(page, 'System Settings')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('list', { name: 'Settings' }).getByRole('link', { name: /Plain view/ })).toBeFocused()
  await page.keyboard.press('Enter')

  await page.waitForURL('**/?view=plain')
  await expect(page.locator('.dsi-device')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Issac Ip')

  // A bare / next time goes straight to plain.
  await page.goto('/')
  await page.waitForURL('**/?view=plain')

  await page.getByRole('link', { name: 'Back to the DSi' }).click()
  await page.waitForURL(url => url.pathname === '/' && !url.search)
  await openMenu(page)
  expect(await stored(page, 'dsi-view')).toBeNull()
})
