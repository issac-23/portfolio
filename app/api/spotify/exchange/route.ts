export async function POST(req: Request) {
  const { code, redirectUri } = await req.json()

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return Response.json({ error: 'Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env.local' }, { status: 400 })
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri ?? 'http://localhost:3000/callback',
    }),
  })

  const data = await res.json()

  if (!data.refresh_token) {
    return Response.json({ error: data.error_description ?? data.error ?? 'No refresh token returned' }, { status: 400 })
  }

  return Response.json({ refresh_token: data.refresh_token })
}
