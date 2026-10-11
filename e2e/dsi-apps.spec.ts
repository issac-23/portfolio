import type { Page, Route } from '@playwright/test'
import { expect, test } from './fixtures'
import { APPS, expectSettledOn, openMenu } from './helpers/dsi'

/**
 * Every app on the rail that opens, and what each one is for. Content is
 * checked against the data files it reads, so a test names the screen that
 * broke rather than just "something changed".
 */

const OPENING = APPS.filter(a => a !== 'System Settings')

const effectsEmpty = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll('.dsi-fx')].map(l => l.childElementCount))

/** Starts `app` from a cold menu by walking the rail to it. */
async function openApp(page: Page, app: (typeof APPS)[number]) {
  await openMenu(page)
  const steps = APPS.indexOf(app)
  for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowRight')
  await expectSettledOn(page, app)
  await page.keyboard.press('Enter')
  await page.locator('.dsi-app-lower').waitFor()
  await expect.poll(() => effectsEmpty(page)).toEqual([0, 0])
}

for (const app of OPENING) {
  test(`${app} opens, and Escape brings the rail back centred on it`, async ({ page }) => {
    await openApp(page, app)
    // Focus lands inside the app, never back on the page.
    expect(await page.evaluate(() => !!document.activeElement?.closest('.dsi-app-lower'))).toBe(true)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    await page.keyboard.press('Escape')
    await expectSettledOn(page, app)
    await expect(page.getByRole('button', { name: app, exact: true })).toBeFocused()
    await expect.poll(() => effectsEmpty(page)).toEqual([0, 0])
  })
}

test('System Settings, which lands in #15, stays on the menu', async ({ page }) => {
  await openMenu(page)
  await page.keyboard.press('ArrowLeft')
  await expectSettledOn(page, 'System Settings')
  await page.keyboard.press('Enter')
  // Long enough for a launch to have got well under way if one had started.
  await page.waitForTimeout(800)
  await expectSettledOn(page, 'System Settings')
  await expect(page.locator('.dsi-app-lower')).toHaveCount(0)
})

test('Profile lists the stats and links the resume', async ({ page }) => {
  await openApp(page, 'Profile')
  await expect(page.getByRole('heading', { level: 2, name: 'Issac Ip' })).toBeVisible()
  const stats = page.locator('.dsi-stats')
  await expect(stats.locator('dt')).toHaveText(['Studying', 'School', 'Year', 'Based'])
  await expect(stats).toContainText('Northeastern University')
  await expect(page.getByRole('link', { name: 'Resume (PDF, new tab)' })).toHaveAttribute('href', '/resume.pdf')
})

test('Camera moves through the album in two dimensions and the top screen follows', async ({ page }) => {
  await openApp(page, 'Nintendo DSi Camera')
  const album = page.getByRole('list', { name: 'Album' }).getByRole('button')
  const shown = page.locator('.dsi-photo-front')

  await expect(album.nth(0)).toBeFocused()
  const first = await album.nth(0).getAttribute('aria-label')
  await expect(shown).toHaveAttribute('alt', first!)

  await page.keyboard.press('ArrowRight')
  await expect(album.nth(1)).toBeFocused()
  await expect(shown).toHaveAttribute('alt', (await album.nth(1).getAttribute('aria-label'))!)

  // Down is a whole row, four across.
  await page.keyboard.press('ArrowDown')
  await expect(album.nth(5)).toBeFocused()
  await expect(album.nth(5)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.dsi-photo-tag')).toContainText('6 /')
})

const track = (title: string, artist = 'Someone') => ({
  title,
  artist,
  album: `${title} (Album)`,
  // Empty art takes the placeholder path, so nothing reaches out to Spotify.
  albumImageUrl: '',
  songUrl: `https://open.spotify.com/track/${encodeURIComponent(title)}`,
})

const spotify = (body: object, status = 200) => (route: Route) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

test('Sound shows what is playing right now', async ({ page }) => {
  await page.route('**/api/spotify/now-playing', spotify({ isPlaying: true, ...track('Nights', 'Frank Ocean'), recentTracks: [] }))
  await openApp(page, 'Nintendo DSi Sound')
  await expect(page.locator('.dsi-sound')).toContainText('Now playing')
  await expect(page.getByRole('heading', { level: 2, name: 'Nights' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nights on Spotify (new tab)' })).toHaveAttribute(
    'href',
    'https://open.spotify.com/track/Nights',
  )
})

test('Sound falls back to recently played, once per track', async ({ page }) => {
  const recent = [track('Ivy'), track('Ivy'), track('Pink + White')]
  await page.route('**/api/spotify/now-playing', spotify({ isPlaying: false, recentTracks: recent }))
  await openApp(page, 'Nintendo DSi Sound')
  await expect(page.locator('.dsi-sound')).toContainText('Last played')
  await expect(page.getByRole('heading', { level: 2, name: 'Ivy' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Recently played' }).getByRole('link')).toHaveCount(2)
  await expect(page.locator('.dsi-actions')).toContainText('Not playing')
})

test.describe('with Spotify down', () => {
  // The 500 below is the point of the test; the browser logs it as an error.
  test.use({ expectedErrors: [/status of 500/] })

  test('Sound says so when Spotify is unreachable', async ({ page }) => {
    await page.route('**/api/spotify/now-playing', spotify({}, 500))
    await openApp(page, 'Nintendo DSi Sound')
    await expect(page.locator('.dsi-app-top')).toContainText("Couldn't reach Spotify")
  })
})

test('Shelf shows the note for the selected item and opens it', async ({ page }) => {
  await openApp(page, 'Shelf')
  const items = page.getByRole('list', { name: 'Shelf' }).getByRole('button')
  await expect(items.first()).toBeFocused()
  await expect(page.locator('.dsi-note')).toBeVisible()

  await page.keyboard.press('ArrowDown')
  const title = await items.nth(1).locator('b').textContent()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(title!)
  await expect(page.getByRole('link', { name: `Open ${title} (new tab)` })).toHaveAttribute('target', '_blank')
})

test('PictoChat offers email, LinkedIn and GitHub as channels', async ({ page }) => {
  await openApp(page, 'PictoChat')
  await expect(page.getByRole('log', { name: 'Messages' }).locator('.dsi-bubble')).not.toHaveCount(0)
  const links = page.getByRole('list', { name: 'Channels' }).getByRole('link')
  await expect(links).toHaveCount(3)
  await expect(links.nth(0)).toHaveAttribute('href', 'mailto:issacip23@gmail.com')
  await expect(links.nth(1)).toHaveAttribute('href', 'https://www.linkedin.com/in/issacip1/')
  await expect(links.nth(2)).toHaveAttribute('href', 'https://github.com/issac-23')

  await expect(links.nth(0)).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(links.nth(1)).toBeFocused()
})

test('Resume reads or downloads the booklet', async ({ page }) => {
  await openApp(page, 'Resume')
  await expect(page.getByRole('list', { name: 'Contents' }).getByRole('listitem')).toHaveCount(4)
  await expect(page.getByRole('link', { name: 'Read resume (PDF, new tab)' })).toHaveAttribute('href', '/resume.pdf')
  const dl = page.getByRole('link', { name: 'Download resume (PDF)' })
  await expect(dl).toHaveAttribute('href', '/resume.pdf')
  await expect(dl).toHaveAttribute('download', '')
})
