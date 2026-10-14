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

/** Answer /api/spotify/now-playing from the test, so nothing depends on Spotify or the route's credentials. */
export const mockSpotify = (page: Page, body: object, status = 200) =>
  page.route('**/api/spotify/now-playing', respond(body, status))

/** The route's report that it could not get an answer out of Spotify. */
export const spotifyDown = { error: 'spotify_unavailable' }

/** Nothing playing and nothing recent, the quiet default for tests that are about something else. */
export const mockSpotifyQuiet = (page: Page) => mockSpotify(page, { isPlaying: false, recentTracks: [] })
