import type { Page } from '@playwright/test'
import { galleryPhotos as photos } from '../data/gallery'
import { expect, test } from './fixtures'
import { openApp, openMenu } from './helpers/dsi'
import { mockSpotifyQuiet } from './helpers/spotify'

/**
 * The home photo's slideshow, the resume preview on the top screen, and the
 * favicon. Each is small, and each has a way to fail without anything else
 * noticing: a photo that never turns, a preview that is an empty canvas, a
 * resume library that loads on the menu after all.
 */

test.beforeEach(async ({ page }) => {
  await mockSpotifyQuiet(page)
})

test.describe('slideshow', () => {
  const front = (page: Page) => page.locator('.dsi-photo-front')
  const lit = (page: Page) =>
    page.locator('.dsi-photo-dots i').evaluateAll(dots => dots.findIndex(d => d.hasAttribute('data-on')))

  // The clock goes in before the page loads, so the slideshow's timers are
  // the fake ones from the start.
  async function openHome(page: Page) {
    await page.clock.install()
    await openMenu(page)
    // Hovering the photo pauses it, which would read as a broken slideshow.
    // The mouse starts at 0,0, nowhere near it, but say so.
    await page.mouse.move(0, 0)
    await expect(front(page)).toBeVisible()
    // The fake clock still runs with the real one until it is paused, and a
    // slow worker can spend 5s between hydrating and the first look. Stop it
    // here, so the only time that passes is the time a test advances.
    await page.clock.pauseAt(new Date(Date.now() + 1000))
  }

  test('turns to the next photo every 5s, moves the dot and shows the alt text', async ({ page }) => {
    await openHome(page)
    const n = photos.length
    expect(n).toBeGreaterThan(1)
    const from = await lit(page)
    const fromSrc = await front(page).getAttribute('src')
    await expect(page.locator('.dsi-photo-alt')).toHaveText(photos[from].alt!)

    await page.clock.runFor(5000)
    await expect.poll(() => lit(page)).toBe((from + 1) % n)
    await expect.poll(() => front(page).getAttribute('src')).not.toBe(fromSrc)
    await expect(page.locator('.dsi-photo-alt')).toHaveText(photos[(from + 1) % n].alt!)
    await expect(front(page)).toHaveAttribute('alt', photos[(from + 1) % n].alt!)
  })

  test('the Next photo button advances it, past the throttle', async ({ page }) => {
    // Reduced motion keeps the timer out of it. Clicking is still the
    // visitor's own choice, so it works there too.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openHome(page)
    // Clicks closer than 0.6s to the last change are ignored on purpose, and
    // the clock that throttle reads starts near zero, so let it get past that.
    await page.clock.runFor(1500)
    expect(await lit(page)).toBe(0)
    const before = await front(page).getAttribute('src')
    await expect(page.locator('.dsi-photo-alt')).toHaveText(photos[0].alt!)
    await page.getByRole('button', { name: 'Next photo' }).click()
    await expect.poll(() => lit(page)).toBe(1)
    await expect.poll(() => front(page).getAttribute('src')).not.toBe(before)
    await expect(page.locator('.dsi-photo-alt')).toHaveText(photos[1].alt!)
  })

  test('holds still while the mouse is over it', async ({ page }) => {
    await openHome(page)
    const box = (await page.locator('.dsi-photo').boundingBox())!
    const from = await lit(page)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    // The pause is state, and the timer is only cleared once React has acted on it.
    await expect(page.locator('.dsi-photo')).toHaveAttribute('data-held', 'true')
    await page.clock.runFor(12_000)
    expect(await lit(page)).toBe(from)
  })

  test('never turns by itself under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openHome(page)
    const before = await front(page).getAttribute('src')
    await page.clock.runFor(10_000)
    expect(await lit(page)).toBe(0)
    expect(await front(page).getAttribute('src')).toBe(before)
  })

  test("never turns by itself when System Settings asks for less motion", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dsi-motion', 'reduce'))
    await openHome(page)
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')
    await page.clock.runFor(10_000)
    expect(await lit(page)).toBe(0)
  })
})

test.describe('resume preview', () => {
  test('the menu never asks for pdf.js or the resume', async ({ page }) => {
    const seen: string[] = []
    page.on('request', r => seen.push(r.url()))
    await openMenu(page)
    // Give anything that loads late (an idle prefetch, a stray import) time to show.
    await page.waitForTimeout(1500)
    expect(seen.filter(u => /pdf/i.test(u))).toEqual([])
    // The pdf.js chunk has a hashed name, so the URLs alone would miss a static
    // import. Loading it at all defines this global.
    expect(await page.evaluate(() => 'pdfjsLib' in globalThis)).toBe(false)
  })

  test('the top screen draws the page, and the preview opens the PDF in a new tab', async ({ page }) => {
    await openApp(page, 'Resume')
    const link = page.getByRole('link', { name: 'Open resume (PDF, new tab)' })
    await expect(link).toHaveAttribute('href', '/resume.pdf')
    await expect(link).toHaveAttribute('target', '_blank')

    // Poll: the canvas is cleared whenever it redraws, and the first draw
    // waits on pdf.js and its worker.
    await expect
      .poll(
        () =>
          link.locator('canvas').evaluate(c => {
            const cv = c as HTMLCanvasElement
            if (!cv.width || !cv.height) return 0
            const { data } = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height)
            let ink = 0
            for (let i = 0; i < data.length; i += 4) {
              // Drawn and not white: a transparent or all-white canvas is blank.
              if (data[i + 3] > 0 && (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200)) ink++
            }
            return ink
          }),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(100)
  })
})

test('the favicon is an svg with no text in it', async ({ request }) => {
  const res = await request.get('/icon.svg')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/svg+xml')
  const body = await res.text()
  expect(body).toContain('<svg')
  expect(body).not.toMatch(/<text/i)
})
