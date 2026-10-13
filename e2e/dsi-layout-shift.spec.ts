import { expect, test } from './fixtures'

/**
 * The rounded face swaps in after a fallback. The device never moved, since
 * it is a fixed size with fixed-width slots, but plain view shifted by 0.033:
 * its column was sized in ch, which changes with the font, and the fallback
 * was a different size. Both are fixed; this keeps them fixed.
 *
 * The font is held back on purpose so the fallback is what paints first,
 * the way it does on a real first visit over a slow connection.
 */

// Well under web.dev's 0.1 "good" line.
const BUDGET = 0.01

for (const [where, path] of [
  ['the menu', '/dsi'],
  ['plain view', '/dsi?view=plain'],
] as const) {
  test(`the font swap barely moves ${where}`, async ({ page }) => {
    await page.route(/\.woff2$/, async route => {
      await new Promise(r => setTimeout(r, 800))
      await route.continue()
    })
    await page.route('**/api/spotify/now-playing', r =>
      r.fulfill({ contentType: 'application/json', body: '{"isPlaying":false,"recentTracks":[]}' }),
    )
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number }
      w.__cls = 0
      new PerformanceObserver(list => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!e.hadRecentInput) w.__cls += e.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })

    await page.goto(path)
    await page.evaluate(() => document.fonts.ready)
    // Let the swap's shift, if any, get reported.
    await page.waitForTimeout(500)
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
    expect(cls).toBeLessThan(BUDGET)
  })
}
