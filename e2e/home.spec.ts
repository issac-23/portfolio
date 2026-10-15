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
  ['chat', 'Contact'],
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
  ['contact', 'Contact'],
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

test('Contact answers to /#contact and to the old /#chat, and is never called PictoChat', async ({ page }) => {
  for (const hash of ['contact', 'chat']) {
    await page.goto(`/#${hash}`)
    await page.locator('.dsi-app-lower').waitFor()
    await expect(page.getByRole('log', { name: 'Messages' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Channels' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expectSettledOn(page, 'Contact')
    await expect(page.locator('.dsi-namebox b')).toHaveText('Contact')
    await expect(page.getByText('PictoChat')).toHaveCount(0)
  }
})

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

test('the Spotify token setup routes are gone', async ({ request }) => {
  // The exchange endpoint traded codes for tokens with the client secret, for
  // anyone who asked. Neither it nor its /callback page should come back.
  expect((await request.post('/api/spotify/exchange', { data: { code: 'x' } })).status()).toBe(404)
  expect((await request.get('/callback?code=x')).status()).toBe(404)
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

const FAN_MADE = 'Fan-made tribute. Not affiliated with or endorsed by Nintendo.'

test('the fan-made line shows on the device page and in plain view', async ({ page }) => {
  await openMenu(page)
  const line = page.getByText(FAN_MADE)
  await expect(line).toBeVisible()
  // Not a Tab stop, and clear of the device.
  expect(await line.evaluate(e => e.tabIndex)).toBe(-1)
  const [box, dev] = await Promise.all([line.boundingBox(), page.locator('.dsi-device').boundingBox()])
  expect(box!.y, 'sits under the device').toBeGreaterThanOrEqual(dev!.y + dev!.height)

  await page.goto('/?view=plain')
  await expect(page.getByText(FAN_MADE)).toBeVisible()
})

for (const [width, height] of [
  [1914, 936],
  [1920, 1080],
  [1366, 768],
  [390, 844],
]) {
  test(`the fan-made line costs the page no scroll at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await openMenu(page)
    await expect(page.getByText(FAN_MADE)).toBeVisible()
    const scrolls = await page.evaluate(() => {
      const de = document.documentElement
      return de.scrollHeight > de.clientHeight + 1 || de.scrollWidth > de.clientWidth + 1
    })
    expect(scrolls).toBe(false)
    const [box, nav] = await Promise.all([
      page.getByText(FAN_MADE).boundingBox(),
      page.getByRole('navigation', { name: 'Shortcuts' }).boundingBox(),
    ])
    expect(box!.y).toBeGreaterThan(nav!.y + nav!.height)
    expect(box!.y + box!.height).toBeLessThanOrEqual(height)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(width)
  })
}
