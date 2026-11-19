import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { APPS } from './helpers/dsi'
import type { AppName } from '../components/dsi/apps'

/**
 * The 3D lab plays a 'move' cue when an arrow key moves the list on the lower
 * screen and a 'bump' when it is pressed past the end. The page keeps the cues
 * that played in window.__dsiLab.sfxLog(), which is what these read.
 *
 * The 3D scene does render headless (software WebGL), so this drives the real
 * console: power on, pick the app on the rail, then arrow around its list.
 */
test.describe.configure({ timeout: 90_000 })

const cues = (page: Page) => page.evaluate(() => (window as unknown as { __dsiLab: { sfxLog(): string[] } }).__dsiLab.sfxLog())

async function openLabApp(page: Page, app: AppName) {
  await page.goto('/lab/dsi-3d')
  // The scene loads in the browser only; Enter before anything has focus is POWER.
  await expect.poll(() => page.evaluate(() => !!document.querySelector('canvas') && !!(window as unknown as { __dsiLab?: unknown }).__dsiLab), { timeout: 30_000 }).toBe(true)
  await page.keyboard.press('Enter')
  await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 30_000 })
  await expect.poll(() => page.evaluate(() => document.querySelector('.dsi-slot[aria-current="true"]') !== null), { timeout: 30_000 }).toBe(true)
  for (let i = 0; i < APPS.indexOf(app); i++) await page.keyboard.press('ArrowRight')
  await expect(page.locator('.dsi-slot[aria-current="true"]')).toHaveAttribute('aria-label', app, { timeout: 15_000 })
  await page.keyboard.press('Enter')
  await page.locator('.dsi-app-lower').waitFor()
  // Everything up to here is the menu's own cues; only the list's count from now on.
  await expect.poll(async () => (await cues(page)).includes('whoosh'), { timeout: 15_000 }).toBe(true)
  await expect(page.locator('.dsi-screen').nth(1).locator('.dsi-app-lower')).toHaveCount(1)
  await expect(page.locator('.dsi-screen').nth(1).locator('[data-idx="0"]')).toBeFocused()
}

/** Presses `key` and returns the cue it played. */
async function press(page: Page, key: string) {
  const before = (await cues(page)).length
  await page.keyboard.press(key)
  await expect.poll(async () => (await cues(page)).length, { message: `a cue after ${key}`, timeout: 15_000 }).toBe(before + 1)
  return (await cues(page)).at(-1)
}

test('Camera album: a move plays move, the end plays bump', async ({ page }) => {
  // The album's items are images with no text, so a cue that compares text cannot tell them apart.
  await openLabApp(page, 'Nintendo DSi Camera')
  expect(await press(page, 'ArrowRight')).toBe('move')
  expect(await press(page, 'ArrowLeft')).toBe('move')
  expect(await press(page, 'ArrowLeft')).toBe('bump')
})

test('the top screen marking something current does not decide the cue', async ({ page }) => {
  await openLabApp(page, 'Projects')
  // Something on the top screen says "current", as a list there might.
  await page.evaluate(() => document.querySelector('.dsi-screen')!.querySelector('.dsi-boot-mark, .dsi-fx')!.setAttribute('aria-current', 'true'))
  expect(await page.evaluate(() => document.querySelector('.dsi-screen [aria-current="true"]')?.closest('.dsi-app-lower'))).toBeNull()
  expect(await press(page, 'ArrowDown')).toBe('move')
  expect(await press(page, 'ArrowUp')).toBe('move')
  expect(await press(page, 'ArrowUp')).toBe('bump')
})
