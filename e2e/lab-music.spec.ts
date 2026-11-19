import { expect, test } from '@playwright/test'

// The lab keeps its music loop's flag on window.__dsiLab.musicPlaying. The 3D
// POWER button and the screen-reader button both end in the same `press`, so
// this drives the latter, which works without clicking into the WebGL canvas.
type Lab = { musicPlaying?: () => boolean; audioState?: () => string | null; sfxLog?: () => string[]; musicLevel?: () => number | null }
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
  await page.locator('.dsi-app-lower').waitFor({ timeout: 30_000 })
  await expect(toggle).toHaveAttribute('aria-label', 'Power off')
  await expect.poll(() => playing(page)).toBe(true)
})

test('muting the music silences it but not the sound effects', async ({ page }) => {
  test.setTimeout(90_000) // the WebGL scene is slow to boot under software rendering
  await page.goto('/lab/dsi-3d')
  await ready(page)

  const toggle = page.getByRole('button', { name: /^Power (on|off)$/ })
  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power off', { timeout: 60_000 })
  const level = () => page.evaluate(() => (window as unknown as { __dsiLab: Lab }).__dsiLab.musicLevel?.() ?? null)
  const sfx = () => page.evaluate(() => (window as unknown as { __dsiLab: Lab }).__dsiLab.sfxLog?.() ?? [])
  const state = () => page.evaluate(() => (window as unknown as { __dsiLab: Lab }).__dsiLab.audioState?.() ?? null)
  await expect.poll(level, { timeout: 20_000 }).toBeGreaterThan(0.01)

  await page.getByRole('button', { name: 'Mute music' }).click()
  await expect(page.getByRole('button', { name: 'Unmute music' })).toBeVisible()
  await expect.poll(level, { timeout: 20_000 }).toBeLessThan(0.0001)
  expect(await state()).toBe('running')

  // POWER off plays the power cue; it must still be heard while the music is muted.
  const before = (await sfx()).length
  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power on')
  expect((await sfx()).length).toBeGreaterThan(before)
  expect(await level()).toBeLessThan(0.0001)

  // Unmuting brings the music back: power on again, then unmute.
  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power off')
  await page.getByRole('button', { name: 'Unmute music' }).click()
  await expect.poll(level, { timeout: 20_000 }).toBeGreaterThan(0.01)
})

test('a remembered mute keeps the music silent but the sound effects audible', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('dsi-lab-muted', '1'))
  await page.goto('/lab/dsi-3d')
  await ready(page)
  await expect(page.getByRole('button', { name: 'Unmute music' })).toBeVisible()

  const toggle = page.getByRole('button', { name: /^Power (on|off)$/ })
  await toggle.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(toggle).toHaveAttribute('aria-label', 'Power off', { timeout: 60_000 })
  const read = <K extends keyof Lab>(k: K) => page.evaluate((key) => (window as unknown as { __dsiLab: Record<string, () => unknown> }).__dsiLab[key]?.() ?? null, k)
  expect(await read('audioState')).toBe('running')
  await expect.poll(() => read('musicPlaying')).toBe(true)
  expect(Number(await read('musicLevel'))).toBeLessThan(0.0001)
  expect((await read('sfxLog')) as string[]).toContain('power')
})
