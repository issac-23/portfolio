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
  if (!res.ok) throw new Error(`token request failed: ${res.status}`)
  const body = await res.json()
  if (!body.access_token) throw new Error('token response had no access_token')
  return body as { access_token: string }
}

// Answers come from Spotify on every request; nothing here is worth building ahead.
export const dynamic = 'force-dynamic'

/**
 * Failure has its own status and body so the client can tell "Spotify did not
 * answer" from "nothing is playing". Both used to come back as a 200 with
 * isPlaying false, which made an outage or a bad token look like a quiet day.
 */
function unavailable() {
  return Response.json({ error: 'spotify_unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  try {
    const { access_token } = await getAccessToken()

    const nowRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: 'no-store',
    })

    if (nowRes.status === 204) {
      const recentRes = await fetch(
        'https://api.spotify.com/v1/me/player/recently-played?limit=5',
        { headers: { Authorization: `Bearer ${access_token}` }, cache: 'no-store' }
      )
      if (!recentRes.ok) return unavailable()
      const recentData = await recentRes.json()
      const tracks = (recentData.items ?? []).map((item: any) => ({
        title: item.track.name,
        artist: item.track.artists.map((a: any) => a.name).join(', '),
        album: item.track.album.name,
        albumImageUrl: item.track.album.images[0]?.url ?? '',
        songUrl: item.track.external_urls.spotify,
      }))
      return Response.json({ isPlaying: false, recentTracks: tracks })
    }

    if (!nowRes.ok) return unavailable()

    const data = await nowRes.json()

    if (!data.item) {
      return Response.json({ isPlaying: false, recentTracks: [] })
    }

    return Response.json({
      isPlaying: data.is_playing,
      title: data.item.name,
      artist: data.item.artists?.map((a: any) => a.name).join(', ') ?? '',
      album: data.item.album?.name ?? data.item.show?.name ?? '',
      albumImageUrl: data.item.album?.images[0]?.url ?? data.item.images?.[0]?.url ?? '',
      songUrl: data.item.external_urls?.spotify ?? '',
      recentTracks: [],
    })
  } catch {
    return unavailable()
  }
}
