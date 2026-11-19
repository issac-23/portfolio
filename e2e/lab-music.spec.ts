import { expect, test } from '@playwright/test'

// The lab keeps its music loop's flag on window.__dsiLab.musicPlaying. The 3D
// POWER button and the screen-reader button both end in the same `press`, so
// this drives the latter, which works without clicking into the WebGL canvas.
type Lab = { musicPlaying?: () => boolean; audioState?: () => string | null }
const playing = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __dsiLab?: Lab }).__dsiLab?.musicPlaying?.() ?? null)
// The page hooks are set on hydration, but POWER only reaches the console once
// the 3D scene has loaded and drawn its screens.
const ready = async (page: import('@playwright/test').Page) => {
  await page.waitForFunction(() => typeof (window as unknown as { __dsiLab?: Lab }).__dsiLab?.musicPlaying === 'function')
  await page.locator('.dsi-device').first().waitFor({ state: 'attached', timeout: 30_000 })
}

// The 3D scene alone can take most of the default 30 s to load on a busy machine.
test.describe.configure({ timeout: 90_000 })

test('powering off the lab console stops the music, powering on starts it again', async ({ page }) => {
  await page.goto('/lab/dsi-3d')
  await ready(page)
  expect(await playing(page)).toBe(false)

  const toggle = page.getByRole('button', { name: /^Power (on|off)$/ })
  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power off', { timeout: 20_000 })
  await expect.poll(() => playing(page)).toBe(true)

  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power on')
  await expect.poll(() => playing(page)).toBe(false)

  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power off')
  await expect.poll(() => playing(page)).toBe(true)
})

test('a POWER press the console ignores mid-launch leaves the music playing', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/lab/dsi-3d')
  await ready(page)
  const toggle = page.getByRole('button', { name: /^Power (on|off)$/ })
  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power off', { timeout: 20_000 })
  await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 30_000 })

  // Launch and press POWER in one task, so the press lands while launching.
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.dsi-slot[data-sel]')!.click()
    document.querySelector<HTMLButtonElement>('button[aria-label="Power off"]')!.click()
  })
  await page.locator('.dsi-app-lower').waitFor({ timeout: 15_000 })
  await expect(toggle).toHaveAttribute('aria-label', 'Power off')
  await expect.poll(() => playing(page)).toBe(true)
})
