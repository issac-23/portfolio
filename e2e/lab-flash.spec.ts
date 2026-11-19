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
  // The lab sets window.__dsiLab in an effect, so it marks hydration. Then one
  // press of the screen-reader power button, which ends in the same press as
  // the 3D one: repeating it while the console boots would turn it off again.
  await page.waitForFunction(() => '__dsiLab' in window, null, { timeout: 30_000 })
  const power = page.getByRole('button', { name: /^Power (on|off)$/ })
  await power.evaluate(el => (el as HTMLButtonElement).click())
  await expect(power).toHaveAttribute('aria-label', 'Power off', { timeout: 20_000 })
  await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 30_000 })
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
