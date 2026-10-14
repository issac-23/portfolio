import type { Page, Route } from '@playwright/test'

/** A Spotify track as the now-playing route reports it. */
export const track = (title: string, artist = 'Someone') => ({
  title,
  artist,
  album: `${title} (Album)`,
  // Empty art takes the placeholder path, so nothing reaches out to Spotify.
  albumImageUrl: '',
  songUrl: `https://open.spotify.com/track/${encodeURIComponent(title)}`,
})

const respond = (body: object, status: number) => (route: Route) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

/**
 * Answer /api/spotify/now-playing from the test, so nothing depends on the
 * route's own credentials or on Spotify being up. A failure status is the
 * route's way of saying it could not reach Spotify; the browser logs it as a
 * console error, so a test that sends one lists it in `expectedErrors`.
 */
export const mockSpotify = (page: Page, body: object, status = 200) =>
  page.route('**/api/spotify/now-playing', respond(body, status))

/** Nothing playing and nothing recent, the quiet default for tests that are about something else. */
export const mockSpotifyQuiet = (page: Page) => mockSpotify(page, { isPlaying: false, recentTracks: [] })
