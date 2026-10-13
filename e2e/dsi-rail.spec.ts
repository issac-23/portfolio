import { expect, test } from './fixtures'
import { APPS, expectSettledOn, mod, openMenu } from './helpers/dsi'

/**
 * The DSi home menu rail. Each test is a bug that actually happened while
 * building it, so a failure names the regression rather than just a symptom.
 */

const N = APPS.length

test('slot widths do not change when the rounded font swaps in', async ({ page }) => {
  // Slots used to size to their caption. On a phone the icon is narrower than
  // the START pill, so when the real font replaced the fallback the widths
  // changed and the rail was left off centre.
  await page.addInitScript(() => {
    const w = window as unknown as { __firstWidths: number[] | null }
    w.__firstWidths = null
    new MutationObserver(() => {
      const slots = document.querySelectorAll('.dsi-slot')
      // Wait for the whole rail and for dsi.css to apply. Under load the
      // parser can hand over half a rail, or slots laid out before the
      // stylesheet lands, and either one reads as a width change.
      const styled = slots.length === 24 && getComputedStyle(slots[0]).flexDirection === 'column'
      if (styled && !w.__firstWidths) {
        w.__firstWidths = [...slots].map(e => Math.round(e.getBoundingClientRect().width))
      }
    }).observe(document, { childList: true, subtree: true })
  })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)

  const { first, after } = await page.evaluate(() => ({
    first: (window as unknown as { __firstWidths: number[] }).__firstWidths,
    after: [...document.querySelectorAll('.dsi-slot')].map(e => Math.round(e.getBoundingClientRect().width)),
  }))
  expect(first).not.toBeNull()
  expect(after).toEqual(first)
})

test('loads centred on Profile and running off both edges', async ({ page }) => {
  await openMenu(page)
})

test('arrow keys work before anything has focus', async ({ page }) => {
  // Bound to the rail at first, so they did nothing until a slot was focused.
  await openMenu(page)
  await page.keyboard.press('ArrowRight')
  await expectSettledOn(page, APPS[1])
})

test('Tab lands on the selected app, and a second Tab leaves the rail', async ({ page }) => {
  await openMenu(page)
  await page.keyboard.press('ArrowRight')
  await expectSettledOn(page, APPS[1])

  await page.keyboard.press('Tab') // skip link comes first, correctly
  await expect(page.locator(':focus')).toHaveText('Skip to content')
  await page.keyboard.press('Tab') // then the shortcuts: resume, plain view
  await expect(page.locator(':focus')).toHaveText('Resume')
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toHaveText('Plain view')
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', APPS[1])

  await page.keyboard.press('Tab')
  const inRail = await page.evaluate(() => !!document.querySelector('.dsi-rail')?.contains(document.activeElement))
  expect(inRail, 'roving tabindex lets one Tab leave the rail').toBe(false)
})

for (const [dir, key, d] of [
  ['right', 'ArrowRight', 1],
  ['left', 'ArrowLeft', -1],
] as const) {
  test(`focus held across the copy seam going ${dir} stays on the real copy and never scrolls`, async ({ page }) => {
    // With overflow: hidden, focusing a slot past the right edge scrolled the
    // viewport and shoved the selection 279px off centre.
    await openMenu(page)
    // Straight onto the rail; the Tab order itself has its own test.
    await page.getByRole('button', { name: APPS[0], exact: true }).focus()

    let L = 0
    for (let k = 0; k < 10; k++) {
      await page.keyboard.press(key)
      L = mod(L + d, N)
      const s = await expectSettledOn(page, APPS[L])
      expect(s.focus, 'focus follows the selection').toBe(APPS[L])
      expect(s.focusHidden, 'focus never lands on a hidden copy').toBe(false)
      expect(s.scrollLeft, 'the viewport never scrolls').toBe(0)
    }
  })
}

test('a held key outruns the settle timer without walking off the rail', async ({ page }) => {
  // Waiting only for the settle timer let anything faster, like key repeat,
  // push the selection past the last copy.
  await openMenu(page)
  const presses = 40
  for (let k = 0; k < presses; k++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(33) // about a held key's repeat rate
  }
  await expectSettledOn(page, APPS[mod(presses, N)])
})

test('the arrow buttons step the selection and announce it', async ({ page }) => {
  await openMenu(page)

  await page.getByRole('button', { name: 'Next app' }).click()
  const s = await expectSettledOn(page, APPS[1])
  expect(s.lit, 'track lights the selected segment').toBe(1)
  await expect(page.locator('[aria-live="polite"]')).toHaveText(`${APPS[1]}, 2 Game Cards`)

  await page.getByRole('button', { name: 'Previous app' }).click()
  await page.getByRole('button', { name: 'Previous app' }).click()
  await expectSettledOn(page, APPS[N - 1])
})

test('re-centres when the screen resizes without a window resize', async ({ page }) => {
  // A font swap once resized the screen after the rail had centred, and only
  // a window resize would have corrected it. Shrink the device directly, with
  // no resize event, and the rail has to follow.
  await openMenu(page)
  const before = await page.evaluate(() => document.querySelector('.dsi-viewport')!.clientWidth)
  await page.addStyleTag({ content: '.dsi-device { width: 300px !important; }' })
  await expect
    .poll(() => page.evaluate(() => document.querySelector('.dsi-viewport')!.clientWidth))
    .toBeLessThan(before)
  await expectSettledOn(page, APPS[0])
})

test('the device fits the viewport without the page scrolling', async ({ page }) => {
  await page.goto('/')
  const r = await page.evaluate(() => {
    const de = document.documentElement
    const d = document.querySelector('.dsi-device')!.getBoundingClientRect()
    return {
      y: de.scrollHeight > de.clientHeight + 1,
      x: de.scrollWidth > de.clientWidth + 1,
      fits: Math.round(d.bottom) <= de.clientHeight + 1,
    }
  })
  expect(r).toEqual({ y: false, x: false, fits: true })
})

test.describe('short laptop screens', () => {
  // Sized from width alone, the device is 808px tall and overflows these.
  for (const [w, h] of [[1366, 768], [1280, 720]]) {
    test(`device fits at ${w}x${h}`, async ({ page }) => {
      test.skip(test.info().project.name !== 'desktop', 'sets its own viewport, once is enough')
      await page.setViewportSize({ width: w, height: h })
      await page.goto('/')
      const scrolls = await page.evaluate(
        () => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      )
      expect(scrolls).toBe(false)
      await expect(page.locator('.dsi-device')).toBeInViewport({ ratio: 1 })
    })
  }
})
