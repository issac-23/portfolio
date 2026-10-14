import type { Page, Route } from '@playwright/test'
import { expect, test } from './fixtures'
import { APPS, effectsEmpty, expectSettledOn, openApp, openMenu } from './helpers/dsi'
import { mockSpotify, spotifyDown, track } from './helpers/spotify'

/**
 * Every app on the rail that opens, and what each one is for. Content is
 * checked against the data files it reads, so a test names the screen that
 * broke rather than just "something changed".
 */


for (const app of APPS) {
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

// Three artists and five songs, counted so both "1 play" and "N plays" show up.
const WEEK = {
  since: '2026-10-06T00:00:00.000Z',
  plays: 21,
  topArtists: [
    { name: 'Frank Ocean', plays: 9, imageUrl: '' },
    { name: 'Tyler, the Creator', plays: 4, imageUrl: '' },
    { name: 'Steve Lacy', plays: 1, imageUrl: '' },
  ],
  topTracks: ['Ivy', 'Nights', 'Pink + White', 'Sunday', 'Dark Red'].map((t, n) => ({ ...track(t), plays: 5 - n })),
}

test('Sound lists the week: three artists and five songs that open Spotify', async ({ page }) => {
  await mockSpotify(page, { isPlaying: false, recentTracks: [track('Ivy')], week: WEEK })
  await openApp(page, 'Nintendo DSi Sound')

  await expect(page.getByRole('heading', { level: 3, name: 'Top artists this week' })).toBeVisible()
  const artists = page.locator('h3:has-text("Top artists this week") + ul > li')
  await expect(artists).toHaveCount(3)
  await expect(artists.nth(0)).toContainText('Frank Ocean')
  await expect(artists.nth(0)).toContainText('9 plays')
  await expect(artists.nth(2)).toContainText('Steve Lacy')
  await expect(artists.nth(2)).toContainText('1 play')
  await expect(artists.nth(2)).not.toContainText('1 plays')
  await expect(artists.locator('a')).toHaveCount(0)

  await expect(page.getByRole('heading', { level: 3, name: 'Top songs this week' })).toBeVisible()
  const songs = page.locator('h3:has-text("Top songs this week") + ul > li')
  await expect(songs).toHaveCount(5)
  const links = songs.getByRole('link')
  await expect(links).toHaveCount(5)
  await expect(links.nth(0)).toContainText('Ivy')
  await expect(links.nth(0)).toContainText('5 plays')
  await expect(links.nth(4)).toContainText('1 play')
  for (let n = 0; n < 5; n++) {
    await expect(links.nth(n)).toHaveAttribute('target', '_blank')
    await expect(links.nth(n)).toHaveAttribute('href', /^https:\/\/open\.spotify\.com\/track\//)
  }
})

test('Sound shows a song with no Spotify page as plain text', async ({ page }) => {
  const local = { ...track('Voice Memo'), songUrl: '', plays: 2 }
  await mockSpotify(page, {
    isPlaying: false,
    recentTracks: [],
    week: { ...WEEK, topTracks: [local, { ...track('Ivy'), plays: 1 }] },
  })
  await openApp(page, 'Nintendo DSi Sound')
  const songs = page.locator('h3:has-text("Top songs this week") + ul > li')
  await expect(songs).toHaveCount(2)
  await expect(songs.nth(0)).toContainText('Voice Memo')
  await expect(songs.nth(0).getByRole('link')).toHaveCount(0)
  await expect(songs.nth(1).getByRole('link')).toHaveCount(1)
})

test('Sound says so when nothing has played this week', async ({ page }) => {
  await mockSpotify(page, {
    isPlaying: false,
    recentTracks: [],
    week: { since: WEEK.since, plays: 0, topArtists: [], topTracks: [] },
  })
  await openApp(page, 'Nintendo DSi Sound')
  await expect(page.locator('.dsi-app-lower .dsi-sound-note')).toHaveText('No plays this week yet.')
  await expect(page.getByRole('heading', { level: 3, name: /this week/ })).toHaveCount(0)
})

test('the plain view lists the same week', async ({ page }) => {
  await mockSpotify(page, { isPlaying: false, recentTracks: [], week: WEEK })
  await page.goto('/?view=plain')
  const plain = page.locator('.dsi-plain')
  await expect(plain.getByText('Top artists this week:')).toBeVisible()
  await expect(plain.getByText('Frank Ocean, 9 plays')).toBeVisible()
  await expect(plain.getByText('Steve Lacy, 1 play', { exact: true })).toBeVisible()
  await expect(plain.getByText('Top songs this week:')).toBeVisible()
  const songs = plain.getByRole('link', { name: /^(Ivy|Nights|Pink \+ White|Sunday|Dark Red)$/ })
  await expect(songs).toHaveCount(5)
  await expect(songs.first()).toHaveAttribute('target', '_blank')
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

test('Sound with nothing to go on says there are no recent plays', async ({ page }) => {
  // While the request is out the lower screen stays quiet; once the route
  // reports the outage there is no data at all, which is its own message.
  let answer = () => {}
  await page.route('**/api/spotify/now-playing', r => {
    answer = () => void r.fulfill({ contentType: 'application/json', body: JSON.stringify(spotifyDown) })
  })
  await openApp(page, 'Nintendo DSi Sound')
  await expect(page.locator('.dsi-app-lower .dsi-sound-note')).toHaveCount(0)
  answer()
  await expect(page.locator('.dsi-app-top')).toContainText("Couldn't reach Spotify")
  await expect(page.locator('.dsi-app-lower .dsi-sound-note')).toHaveText('No recent plays to show.')
  await expect(page.getByRole('heading', { level: 3, name: /this week/ })).toHaveCount(0)
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

test('Contact offers email, LinkedIn and GitHub as channels', async ({ page }) => {
  await openApp(page, 'Contact')
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
