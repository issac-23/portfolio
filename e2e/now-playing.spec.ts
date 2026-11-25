import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { mockSpotify, spotifyAuthExpired, spotifyDown, track } from './helpers/spotify'

/**
 * The shared now-playing feed, in each state it can be in, as the plain
 * view's Listening section shows it. Spotify is always mocked at the route.
 */

const listening = (page: Page) => page.getByRole('region', { name: 'Listening' })

test('shows the track that is playing, linked out to Spotify', async ({ page }) => {
  await mockSpotify(page, { isPlaying: true, ...track('Nights', 'Frank Ocean'), recentTracks: [] })
  await page.goto('/?view=plain')
  await expect(listening(page)).toContainText('Now playing: Nights by Frank Ocean')
  const link = listening(page).getByRole('link', { name: 'Nights' })
  await expect(link).toHaveAttribute('href', 'https://open.spotify.com/track/Nights')
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(listening(page).getByText('Recently played:')).toHaveCount(0)
})

test('lists recent tracks once each when nothing is playing', async ({ page }) => {
  const recent = [track('Ivy'), track('Ivy'), track('Pink + White')]
  await mockSpotify(page, { isPlaying: false, recentTracks: recent })
  await page.goto('/?view=plain')
  await expect(listening(page).getByText('Recently played:')).toBeVisible()
  const list = listening(page).locator('a[href^="https://open.spotify.com/track/"]')
  await expect(list).toHaveCount(2)
  await expect(list.first()).toContainText('Ivy')
  await expect(listening(page)).not.toContainText('Now playing')
})

test('shows history for a paused track, which the route sends as not playing', async ({ page }) => {
  // The route reports a paused track with its fields, isPlaying false and the recent plays.
  const recent = [track('Ivy'), track('Pink + White')]
  await mockSpotify(page, { isPlaying: false, ...track('Nights', 'Frank Ocean'), recentTracks: recent })
  await page.goto('/?view=plain')
  await expect(listening(page).getByText('Recently played:')).toBeVisible()
  await expect(listening(page)).not.toContainText('Now playing')
  await expect(listening(page)).not.toContainText('Nothing playing right now.')
  await expect(listening(page).locator('a[href^="https://open.spotify.com/track/"]')).toHaveCount(2)
})

test('says nothing is playing when there is no history either', async ({ page }) => {
  await mockSpotify(page, { isPlaying: false, recentTracks: [] })
  await page.goto('/?view=plain')
  await expect(listening(page)).toContainText('Nothing playing right now.')
  await expect(listening(page).getByText('Recently played:')).toHaveCount(0)
})

test.describe('with Spotify down', () => {
  test('says it could not reach Spotify', async ({ page }) => {
    await mockSpotify(page, spotifyDown)
    await page.goto('/?view=plain')
    await expect(listening(page)).toContainText("Couldn't reach Spotify")
    await expect(listening(page)).not.toContainText('Nothing playing right now.')
  })

  test('shows the same unreachable state when the token has expired', async ({ page }) => {
    await mockSpotify(page, spotifyAuthExpired)
    await page.goto('/?view=plain')
    await expect(listening(page)).toContainText("Couldn't reach Spotify")
    await expect(listening(page)).not.toContainText('Nothing playing right now.')
  })

  test('keeps the last good answer through a failed poll', async ({ page }) => {
    await page.clock.install()
    await mockSpotify(page, { isPlaying: true, ...track('Nights'), recentTracks: [] })
    await page.goto('/?view=plain')
    await expect(listening(page)).toContainText('Now playing')

    await page.unroute('**/api/spotify/now-playing')
    let polled = false
    await page.route('**/api/spotify/now-playing', r => {
      polled = true
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(spotifyDown) })
    })
    await page.clock.fastForward(31_000)
    await expect.poll(() => polled).toBe(true)
    await expect(listening(page)).toContainText('Now playing')
    await expect(listening(page)).not.toContainText("Couldn't reach Spotify")
  })
})

test('refreshes right away when a hidden tab comes back, not at the next tick', async ({ page }) => {
  await page.clock.install()
  await mockSpotify(page, { isPlaying: true, ...track('Nights'), recentTracks: [] })
  await page.goto('/?view=plain')
  await expect(listening(page)).toContainText('Now playing: Nights')

  // Headless Chromium is always 'visible', so stand in for the tab state.
  const setVisibility = (state: 'hidden' | 'visible') =>
    page.evaluate(s => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s })
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => s === 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
    }, state)

  let polls = 0
  await page.unroute('**/api/spotify/now-playing')
  await page.route('**/api/spotify/now-playing', r => {
    polls++
    return r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ isPlaying: true, ...track('Pink + White'), recentTracks: [] }),
    })
  })

  await setVisibility('hidden')
  await page.clock.fastForward(5_000)
  expect(polls).toBe(0)
  await expect(listening(page)).toContainText('Nights')

  await setVisibility('visible')
  await expect(listening(page)).toContainText('Now playing: Pink + White')
  expect(polls).toBe(1)
})
