import { expect, test } from './fixtures'
import { mockSpotifyQuiet } from './helpers/spotify'

/**
 * The classic page's section entrance, through the real scrolling path.
 * classic.spec.ts forces `visible` on to read colours; this checks that the
 * shared reveal module is what turns it on.
 */

const SECTIONS = ['about', 'projects', 'gallery', 'media', 'music', 'contact']

test.beforeEach(({ page }) => mockSpotifyQuiet(page))

test('a section stays hidden until it is scrolled to, then stays shown', async ({ page }) => {
  await page.goto('/classic')
  const contact = page.locator('#contact')
  await expect(contact).toHaveClass(/section-fade/)
  await expect(contact).not.toHaveClass(/visible/)

  await contact.scrollIntoViewIfNeeded()
  await expect(contact).toHaveClass(/visible/)

  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(contact).toHaveClass(/visible/)
})

test('every section on the page reveals as it is reached', async ({ page }) => {
  await page.goto('/classic')
  for (const id of SECTIONS) {
    const section = page.locator(`#${id}`)
    await section.scrollIntoViewIfNeeded()
    await expect(section, `#${id} should reveal`).toHaveClass(/visible/)
  }
  await expect(page.locator('.section-fade:not(.visible)')).toHaveCount(0)
})
