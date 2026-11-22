import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { expectSettledOn, openMenu, railState } from './helpers/dsi'

/**
 * The boot screen, the POWER button, and the device filling the page.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/api/spotify/now-playing', r =>
    r.fulfill({ contentType: 'application/json', body: '{"isPlaying":false,"recentTracks":[]}' }),
  )
})

const html = (page: Page) => page.locator('html')
const power = (page: Page, name: 'Power off' | 'Power on') => page.getByRole('button', { name })
const ready = (page: Page) => page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 20_000 })

/**
 * Holds the boot screen on for a starved worker. The fade is CSS that runs from
 * first paint while hydration (which arms the 3s safety timer) can come
 * seconds later, so without this the boot can finish before a test looks.
 * The 3s safety timer is left alone, so it is what hands over.
 */
const holdBoot = (page: Page) =>
  page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style')
      st.textContent = '.dsi-boot, .dsi-boot-mark { animation-delay: 60s !important }'
      document.head.append(st)
    })
  })

test.describe('with the boot screen on', () => {
  test.use({ boot: true })

  test('the boot screen shows the name on white, then hands over to the menu', async ({ page }) => {
    // The fade is held, so it is the safety timer that hands over here.
    await holdBoot(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(html(page)).toHaveAttribute('data-boot', '')
    await expect(page.locator('.dsi-boot-mark').first()).toBeVisible()
    await expect(page.locator('.dsi-boot-mark').first()).toHaveText('Issac Ip')
    // The 3s safety timer starts at hydration, not at goto, so wait for that first.
    await ready(page)
    await expect(html(page)).not.toHaveAttribute('data-boot', '', { timeout: 5000 })
    await expectSettledOn(page, 'Profile')
  })

  test('the boot plays once a visit', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(html(page)).toHaveAttribute('data-boot', '')
    await ready(page)
    await expect(html(page)).not.toHaveAttribute('data-boot', '', { timeout: 5000 })
    await page.reload()
    await expect(html(page)).not.toHaveAttribute('data-boot', '')
  })

  test('the boot still plays under the system reduced motion, with its fades at full length', async ({ page }) => {
    await holdBoot(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(html(page)).toHaveAttribute('data-boot', '')
    // The global reduced-motion rule would make these 0.01ms.
    const durations = await page.evaluate(() =>
      ['.dsi-boot', '.dsi-boot-mark'].map(s => getComputedStyle(document.querySelector(s)!).animationDuration),
    )
    expect(durations).toEqual(['0.5s', '0.5s'])
    await ready(page)
    await expect(html(page)).not.toHaveAttribute('data-boot', '', { timeout: 5000 })
  })
})

test('power turns the screens off and back on', async ({ page }) => {
  await openMenu(page)
  await power(page, 'Power off').click()
  await expect(page.locator('.dsi-device')).toHaveAttribute('data-power', 'off')
  await expect(power(page, 'Power on')).toBeVisible()
  const leftovers = await page.evaluate(() =>
    [...document.querySelectorAll('.dsi-screen')].map(s =>
      [...s.children].filter(c => !c.matches('.dsi-fx, .dsi-boot')).length,
    ),
  )
  expect(leftovers, 'both screens are blank').toEqual([0, 0])

  await power(page, 'Power on').click()
  await expectSettledOn(page, 'Profile')
})

test('the power button comes after the rail in the Tab order', async ({ page }) => {
  await openMenu(page)
  // Skip link, Resume, Plain view, then the selected app.
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
  expect((await railState(page)).focus).toBe('Profile')

  const after = await page.evaluate(() => {
    const rail = document.querySelector('.dsi-rail')!
    const btn = document.querySelector('.dsi-power')!
    return !!(rail.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING)
  })
  expect(after, 'the power button follows the rail in the DOM').toBe(true)
})

/** Whether the Shortcuts nav and the device's boxes intersect. */
async function shortcutsOverlapDevice(page: Page) {
  const [nav, dev] = await Promise.all([
    page.getByRole('navigation', { name: 'Shortcuts' }).boundingBox(),
    page.locator('.dsi-device').boundingBox(),
  ])
  return (
    nav!.x < dev!.x + dev!.width &&
    nav!.x + nav!.width > dev!.x &&
    nav!.y < dev!.y + dev!.height &&
    nav!.y + nav!.height > dev!.y
  )
}

const screenWidths = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll('.dsi-screen')].map(s => s.getBoundingClientRect().width))

test('a 1080p screen gets tall screens in a DSi XL sized shell', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'sized for a desktop viewport')

  await page.setViewportSize({ width: 1920, height: 1080 })
  await openMenu(page)
  const device = await page.locator('.dsi-device').boundingBox()
  for (const w of await screenWidths(page)) {
    expect(w, 'screens take the height').toBeGreaterThanOrEqual(560)
    // As wide as a DSi XL round screens that size, and no wider.
    expect(device!.width / w, 'shell is about two screens wide').toBeGreaterThanOrEqual(1.8)
    expect(device!.width / w).toBeLessThanOrEqual(2.2)
  }
  expect((await railState(page)).pageScrolls).toBe(false)

  // A 768p laptop: still no scrolling, and the shell has to stay clear of
  // the shortcuts above it.
  for (const width of [1366, 1024]) {
    await page.setViewportSize({ width, height: 768 })
    await expectSettledOn(page, 'Profile')
    expect(await shortcutsOverlapDevice(page), `the shortcuts do not sit on the device at ${width}x768`).toBe(false)
  }
})

test('a phone keeps the stacked device with screens at most of its width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'sized for a phone viewport')

  await openMenu(page)
  const device = await page.locator('.dsi-device').boundingBox()
  const vp = page.viewportSize()!
  expect(device!.width, 'the device spans the phone').toBeGreaterThan(vp.width - 24)
  for (const w of await screenWidths(page)) {
    expect(w / device!.width, 'screens are about 70% of the device').toBeGreaterThan(0.6)
    expect(w / device!.width).toBeLessThan(0.8)
  }
  expect((await railState(page)).pageScrolls).toBe(false)
  expect(await shortcutsOverlapDevice(page)).toBe(false)
})
