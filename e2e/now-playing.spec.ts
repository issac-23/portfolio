import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { mockSpotify, spotifyDown, track } from './helpers/spotify'

/**
 * The classic page's Spotify card, in each state the one shared now-playing
 * feed can put it in. Spotify is always mocked at the route.
 */

const card = (page: Page) => page.locator('#music')

test('shows the track that is playing, linked out to Spotify', async ({ page }) => {
  await mockSpotify(page, { isPlaying: true, ...track('Nights', 'Frank Ocean'), recentTracks: [] })
  await page.goto('/classic')
  const link = card(page).getByRole('link', { name: /Nights/ })
  await expect(link).toContainText('Now playing')
  await expect(link).toContainText('Frank Ocean')
  await expect(link).toHaveAttribute('href', 'https://open.spotify.com/track/Nights')
  await expect(card(page).getByText('Recently played')).toHaveCount(0)
})

test('says nothing is playing and lists recent tracks once each', async ({ page }) => {
  const recent = [track('Ivy'), track('Ivy'), track('Pink + White')]
  await mockSpotify(page, { isPlaying: false, recentTracks: recent })
  await page.goto('/classic')
  await expect(card(page)).toContainText('Not playing right now')
  await expect(card(page)).toContainText('Last: Ivy')
  const list = card(page).locator('a[href^="https://open.spotify.com/track/"]')
  await expect(list).toHaveCount(2)
  await expect(list.first()).toContainText('Ivy')
})

test('says nothing is playing when there is no history either', async ({ page }) => {
  await mockSpotify(page, { isPlaying: false, recentTracks: [] })
  await page.goto('/classic')
  await expect(card(page)).toContainText('Not playing right now')
  await expect(card(page)).not.toContainText('Last:')
  await expect(card(page).getByText('Recently played')).toHaveCount(0)
})

test.describe('with Spotify down', () => {
  test('says it could not reach Spotify, and recovers on Try again', async ({ page }) => {
    await mockSpotify(page, spotifyDown)
    await page.goto('/classic')
    await expect(card(page)).toContainText("Couldn't reach Spotify")
    await expect(card(page)).not.toContainText('Not playing right now')

    await page.unroute('**/api/spotify/now-playing')
    await mockSpotify(page, { isPlaying: true, ...track('Ivy'), recentTracks: [] })
    await card(page).getByRole('button', { name: 'Try again' }).click()
    await expect(card(page)).toContainText('Now playing')
    await expect(card(page)).toContainText('Ivy')
  })

  test('keeps the last good answer through a failed poll', async ({ page }) => {
    await page.clock.install()
    await mockSpotify(page, { isPlaying: true, ...track('Nights'), recentTracks: [] })
    await page.goto('/classic')
    await expect(card(page)).toContainText('Now playing')

    await page.unroute('**/api/spotify/now-playing')
    let polled = false
    await page.route('**/api/spotify/now-playing', r => {
      polled = true
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(spotifyDown) })
    })
    await page.clock.fastForward(31_000)
    await expect.poll(() => polled).toBe(true)
    await expect(card(page)).toContainText('Now playing')
    await expect(card(page)).not.toContainText("Couldn't reach Spotify")
  })
})

test.describe('with the server failing outright', () => {
  // The 500 below is the point of the test; the browser logs it as an error.
  test.use({ expectedErrors: [/status of 500/] })

  test('treats a non-200 the same as an outage', async ({ page }) => {
    await mockSpotify(page, {}, 500)
    await page.goto('/classic')
    await expect(card(page)).toContainText("Couldn't reach Spotify")
  })
})
