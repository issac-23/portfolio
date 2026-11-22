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
  ['the menu', '/'],
  ['plain view', '/?view=plain'],
] as const) {
  test(`the font swap barely moves ${where}`, async ({ page }) => {
    await page.route(/\.woff2$/, async route => {
      await new Promise(r => setTimeout(r, 800))
      await route.continue()
    })
    await page.route('**/api/spotify/now-playing', r =>
      r.fulfill({ contentType: 'application/json', body: '{"isPlaying":false,"recentTracks":[]}' }),
    )
    // Only shifts from the swap itself count. On a loaded machine the page can
    // also shift while it is still assembling, before the font arrives, and
    // that is not what this test is about.
    await page.addInitScript(() => {
      const w = window as unknown as { __shifts: { at: number; value: number }[]; __fontAt: number | null }
      w.__shifts = []
      w.__fontAt = null
      document.fonts.addEventListener('loadingdone', () => {
        w.__fontAt ??= performance.now()
      })
      new PerformanceObserver(list => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!e.hadRecentInput) w.__shifts.push({ at: e.startTime, value: e.value })
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })

    await page.goto(path)
    await page.evaluate(() => document.fonts.ready)
    // Let the swap's shift, if any, get reported.
    await page.waitForTimeout(500)
    const { fontAt, cls } = await page.evaluate(() => {
      const w = window as unknown as { __shifts: { at: number; value: number }[]; __fontAt: number | null }
      const from = (w.__fontAt ?? 0) - 50
      return { fontAt: w.__fontAt, cls: w.__shifts.filter(s => s.at >= from).reduce((n, s) => n + s.value, 0) }
    })
    expect(fontAt, 'the held-back font loaded').not.toBeNull()
    expect(cls).toBeLessThan(BUDGET)
  })
}
