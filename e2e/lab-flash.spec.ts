import { expect, test } from './fixtures'

/**
 * The white flash on launch plays on both screens of the 3D lab's console,
 * not just the one the launching icon sits on. The shell draws each screen in
 * its own device wrapper there, so the effect layers are found console-wide.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/api/spotify/now-playing', r =>
    r.fulfill({ contentType: 'application/json', body: '{"isPlaying":false,"recentTracks":[]}' }),
  )
  await page.addInitScript(() => {
    const w = window as unknown as { __flash: { parents: Element[]; animated: boolean[] } }
    w.__flash = { parents: [], animated: [] }
    // A flash node is appended and animated in the same task, so by the time
    // this microtask-delivered callback runs it already has its animation.
    new MutationObserver(records => {
      for (const r of records)
        for (const n of r.addedNodes)
          if (n instanceof HTMLElement && n.classList.contains('dsi-fx-flash') && r.target instanceof Element) {
            w.__flash.parents.push(r.target)
            w.__flash.animated.push(n.getAnimations().length > 0)
          }
    }).observe(document, { subtree: true, childList: true })
  })
})

test('a launch in the 3D lab flashes both screens', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/lab/dsi-3d')
  await page.locator('canvas').waitFor({ timeout: 30_000 })
  // Enter on an unfocused page is the same as pressing POWER. Hydration is
  // not observable, so a press that lands too early is simply repeated until
  // the console is on.
  await expect(async () => {
    if ((await page.locator('.dsi-rail').count()) === 0) await page.keyboard.press('Enter')
    await expect(page.locator('.dsi-rail[data-ready]')).toBeAttached({ timeout: 1_500 })
  }).toPass({ timeout: 40_000 })
  await expect(page.locator('.dsi-fx')).toHaveCount(2)
  await page.keyboard.press('Enter')
  await page.locator('.dsi-app-lower').waitFor({ timeout: 15_000 })

  const flash = () =>
    page.evaluate(() => {
      const f = (window as unknown as { __flash: { parents: Element[]; animated: boolean[] } }).__flash
      return {
        layers: new Set(f.parents).size,
        inSeparateDevices: new Set(f.parents.map(p => p.closest('.dsi-device'))).size,
        animated: f.animated,
      }
    })
  await expect.poll(flash).toEqual({ layers: 2, inSeparateDevices: 2, animated: [true, true] })
})
