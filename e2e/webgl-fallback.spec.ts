import { expect, test } from '@playwright/test'

/**
 * Without WebGL the 3D lab can't draw anything, so it says so and points to
 * the regular home page. Named outside the lab-* pattern on purpose: it never
 * renders the scene, so it is cheap enough for the default run and CI.
 */
test('the 3D lab without WebGL links to the home page instead of a blank canvas', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      if (/^(webgl2?|experimental-webgl)$/.test(id)) return null
      return (get as (...a: unknown[]) => unknown).call(this, id, ...rest)
    } as typeof get
  })
  await page.goto('/lab/dsi-3d')

  const home = page.getByRole('link', { name: 'The regular DSi home page' })
  await expect(home).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.getByText('Loading the DSi...')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Power (on|off)$/ })).toHaveCount(0)

  await home.click()
  await page.waitForURL(url => url.pathname === '/')
})
