import { aggregateWeek, playable, toItemTrack, toTrack } from './week'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN!

async function getAccessToken() {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN,
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    // Spotify's error code is safe to keep; the body can echo nothing secret.
    const code = (await res.json().catch(() => null))?.error
    throw new TokenError(res.status, typeof code === 'string' ? code : undefined)
  }
  const body = await res.json()
  if (!body.access_token) throw new Error('token response had no access_token')
  return body as { access_token: string }
}

/** The token endpoint refused the refresh grant. Carries only status and Spotify's error code. */
class TokenError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(`token request failed: ${status}${code ? ` ${code}` : ''}`)
  }
}

// Answers come from Spotify on every request; nothing here is worth building ahead.
export const dynamic = 'force-dynamic'

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
    const { access_token } = await getAccessToken()
    const headers = { Authorization: `Bearer ${access_token}` }

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

    // Every answer carries the week, so without recent plays there is no answer.
    if (!recentRes.ok) return unavailable(`recently-played ${recentRes.status}`)
    const recentItems: any[] = (await recentRes.json()).items ?? []
    const week = aggregateWeek(recentItems)

    if (nowRes.status === 204) {
      // Newest first, so the first five are the five most recent plays.
      const tracks = playable(recentItems).slice(0, 5).map(toTrack)
      return Response.json({ isPlaying: false, recentTracks: tracks, week })
    }

    if (!nowRes.ok) return unavailable(`currently-playing ${nowRes.status}`)

    const data = await nowRes.json()

    if (!data.item) {
      return Response.json({ isPlaying: false, recentTracks: [], week })
    }

    return Response.json({
      isPlaying: data.is_playing,
      ...toItemTrack(data.item),
      recentTracks: [],
      week,
    })
  } catch (err) {
    if (err instanceof TokenError) {
      const auth = err.status === 400 && err.code === 'invalid_grant'
      return failure(auth ? 'spotify_auth' : 'spotify_unavailable', `token ${err.status} ${err.code ?? 'no error code'}`)
    }
    // Only the error's name: a message could carry something from a response.
    return unavailable(`unexpected ${err instanceof Error ? err.name : typeof err}`)
  }
}
