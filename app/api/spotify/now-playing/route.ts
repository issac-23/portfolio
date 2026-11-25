import { aggregateWeek, playable, toItemTrack, toTrack } from './week'
import { TokenError, dropAccessToken, getAccessToken } from './token'

// Spotify is asked fresh on every request that reaches this function (every
// upstream fetch is no-store), so nothing is built ahead. Sharing between
// visitors happens at the CDN through the Cache-Control on a good answer.
export const dynamic = 'force-dynamic'

/** Concurrent visitors within 15 s share one upstream fetch; a stale answer is served for 30 s more while it refreshes. */
const SHARED = { 'Cache-Control': 's-maxage=15, stale-while-revalidate=30' }

/** One try with the cached token, and one retry with a fresh token if Spotify says the cached one is no good. */
async function fetchPlayer() {
  for (let attempt = 0; ; attempt++) {
    const accessToken = await getAccessToken()
    const headers = { Authorization: `Bearer ${accessToken}` }
    // Recently played is always needed for the week's counts, so fetch it
    // alongside currently-playing instead of after it.
    const [nowRes, recentRes] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers,
        cache: 'no-store',
      }),
      fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
        headers,
        cache: 'no-store',
      }),
    ])
    const refused = nowRes.status === 401 || recentRes.status === 401
    if (refused) dropAccessToken()
    if (refused && attempt === 0) continue
    return { nowRes, recentRes }
  }
}

/**
 * Failure has its own body so the client can tell "Spotify did not answer"
 * from "nothing is playing". Both used to look the same: a 200 with isPlaying
 * false, so an outage or a bad token read as a quiet day.
 *
 * `spotify_auth` is the one failure that needs a person: the refresh token
 * was revoked or expired (400 invalid_grant) and only rerunning
 * scripts/spotify-auth.mjs fixes it. Everything else is `spotify_unavailable`.
 * The cause goes to the server log, never the body, and never a secret.
 *
 * Both stay a 200 on purpose. A non-2xx fetch is logged by the browser as a
 * console error on every poll of an outage, and the shared poll already
 * treats the body as the answer, so the field is enough to carry it.
 */
function failure(error: 'spotify_unavailable' | 'spotify_auth', cause: string) {
  console.error(`[spotify now-playing] ${error}: ${cause}`)
  return Response.json({ error }, { headers: { 'Cache-Control': 'no-store' } })
}

const unavailable = (cause: string) => failure('spotify_unavailable', cause)

export async function GET() {
  try {
    const { nowRes, recentRes } = await fetchPlayer()

    // Every answer carries the week, so without recent plays there is no answer.
    if (!recentRes.ok) return unavailable(`recently-played ${recentRes.status}`)
    const recentItems: any[] = (await recentRes.json()).items ?? []
    const week = aggregateWeek(recentItems)

    // Newest first, so the first five are the five most recent plays. Sent
    // whenever nothing is playing (idle, paused or an ad) so the client has
    // history to show instead of its empty state.
    const recentTracks = playable(recentItems).slice(0, 5).map(toTrack)

    if (nowRes.status === 204) {
      return Response.json({ isPlaying: false, recentTracks, week }, { headers: SHARED })
    }

    if (!nowRes.ok) return unavailable(`currently-playing ${nowRes.status}`)

    const data = await nowRes.json()

    if (!data.item) {
      return Response.json({ isPlaying: false, recentTracks, week }, { headers: SHARED })
    }

    // While a track is playing the client shows it, not the history.
    return Response.json(
      {
        isPlaying: data.is_playing,
        ...toItemTrack(data.item),
        recentTracks: data.is_playing ? [] : recentTracks,
        week,
      },
      { headers: SHARED },
    )
  } catch (err) {
    if (err instanceof TokenError) {
      const auth = err.status === 400 && err.code === 'invalid_grant'
      return failure(auth ? 'spotify_auth' : 'spotify_unavailable', `token ${err.status} ${err.code ?? 'no error code'}`)
    }
    // Only the error's name: a message could carry something from a response.
    return unavailable(`unexpected ${err instanceof Error ? err.name : typeof err}`)
  }
}
