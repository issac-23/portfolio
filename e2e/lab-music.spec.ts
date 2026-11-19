import { expect, test } from '@playwright/test'

// The lab keeps its music loop's flag on window.__dsiLab.musicPlaying. The 3D
// POWER button and the screen-reader button both end in the same `press`, so
// this drives the latter, which works without clicking into the WebGL canvas.
type Lab = { musicPlaying?: () => boolean; audioState?: () => string | null }
const playing = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __dsiLab?: Lab }).__dsiLab?.musicPlaying?.() ?? null)

test('powering off the lab console stops the music, powering on starts it again', async ({ page }) => {
  await page.goto('/lab/dsi-3d')
  await page.waitForFunction(() => typeof (window as unknown as { __dsiLab?: Lab }).__dsiLab?.musicPlaying === 'function')
  expect(await playing(page)).toBe(false)

  const toggle = page.getByRole('button', { name: /^Power (on|off)$/ })
  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power off', { timeout: 20_000 })
  expect(await playing(page)).toBe(true)

  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power on')
  expect(await playing(page)).toBe(false)

  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power off')
  expect(await playing(page)).toBe(true)
})
