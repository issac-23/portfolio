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
  return res.json()
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

    if (!nowRes.ok) {
      return Response.json({ isPlaying: false, recentTracks: [] })
    }

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
    return Response.json({ isPlaying: false, recentTracks: [] })
  }
}
