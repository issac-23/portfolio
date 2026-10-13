import { SITE_URL } from '../app/site'
import { expect, test } from './fixtures'
import { APPS, expectSettledOn, openApp, openMenu } from './helpers/dsi'

/**
 * The DSi as the home page: every app has an address, the addresses the old
 * site handed out still work, and nothing that used to be reachable is lost.
 */

const OWN = [
  ['profile', 'Profile'],
  ['projects', 'Projects'],
  ['camera', 'Nintendo DSi Camera'],
  ['sound', 'Nintendo DSi Sound'],
  ['shelf', 'Shelf'],
  ['chat', 'PictoChat'],
  ['resume', 'Resume'],
  ['settings', 'System Settings'],
] as const

// The classic site's section anchors, as found on resumes and profiles.
// #projects is both, so it is covered above.
const CLASSIC = [
  ['about', 'Profile'],
  ['gallery', 'Nintendo DSi Camera'],
  ['music', 'Nintendo DSi Sound'],
  ['media', 'Shelf'],
  ['contact', 'PictoChat'],
] as const

test.beforeEach(async ({ page }) => {
  await page.route('**/api/spotify/now-playing', r =>
    r.fulfill({ contentType: 'application/json', body: '{"isPlaying":false,"recentTracks":[]}' }),
  )
})

for (const [hash, app] of [...OWN, ...CLASSIC]) {
  test(`/#${hash} opens ${app}, and Back lands on it in the rail`, async ({ page }) => {
    await page.goto(`/#${hash}`)
    await page.locator('.dsi-app-lower').waitFor()
    await page.keyboard.press('Escape')
    await expectSettledOn(page, app)
    expect(new URL(page.url()).hash, 'leaving the app clears its address').toBe('')
  })
}

test('opening an app puts its address in the bar, without a history entry', async ({ page }) => {
  await openMenu(page)
  const before = await page.evaluate(() => history.length)
  await openApp(page, 'Projects')
  await expect.poll(() => new URL(page.url()).hash).toBe('#projects')
  expect(await page.evaluate(() => history.length)).toBe(before)
})

test('the skip link does not close anything or count as an app', async ({ page }) => {
  await page.goto('/#main-content')
  await openMenu(page)
  await expectSettledOn(page, APPS[0])
})

test('/dsi, and /dsi?view=plain, redirect to their new homes', async ({ page }) => {
  await page.goto('/dsi')
  await expect(page).toHaveURL(url => url.pathname === '/' && !url.search)
  await page.goto('/dsi?view=plain')
  await expect(page).toHaveURL(url => url.pathname === '/' && url.search === '?view=plain')
  await expect(page.locator('.dsi-plain')).toBeVisible()
})

test('the home page is indexed and canonical; the classic one is kept but not indexed', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE_URL)
  await expect(page).toHaveTitle(/Issac Ip/)

  await page.goto('/?view=plain')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE_URL)

  await page.goto('/classic')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page.locator('#projects')).toBeAttached()
})

test('the resume is one Tab from the top of the page', async ({ page }) => {
  await openMenu(page)
  const resume = page.getByRole('navigation', { name: 'Shortcuts' }).getByRole('link', { name: 'Resume' })
  await expect(resume).toHaveAttribute('href', '/resume.pdf')
  await page.keyboard.press('Tab') // skip link
  await page.keyboard.press('Tab')
  await expect(resume).toBeFocused()
})
