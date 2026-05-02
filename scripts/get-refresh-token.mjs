/**
 * One-time script to exchange your Spotify auth code for a refresh token.
 * Run after completing Step 3 in SPOTIFY_SETUP.md
 *
 * Usage:
 *   node scripts/get-refresh-token.mjs <CODE> <CLIENT_ID> <CLIENT_SECRET>
 */

import https from 'node:https'

const [,, code, clientId, clientSecret] = process.argv

if (!code || !clientId || !clientSecret) {
  console.error('\nUsage: node scripts/get-refresh-token.mjs <CODE> <CLIENT_ID> <CLIENT_SECRET>\n')
  process.exit(1)
}

const body = new URLSearchParams({
  grant_type: 'authorization_code',
  code,
  redirect_uri: 'http://localhost:3000',
})

const req = https.request(
  {
    hostname: 'accounts.spotify.com',
    path: '/api/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
  },
  (res) => {
    let data = ''
    res.on('data', (chunk) => (data += chunk))
    res.on('end', () => {
      const json = JSON.parse(data)
      if (json.refresh_token) {
        console.log('\n✅ Got your refresh token! Add these to your .env.local:\n')
        console.log(`SPOTIFY_CLIENT_ID=${clientId}`)
        console.log(`SPOTIFY_CLIENT_SECRET=${clientSecret}`)
        console.log(`SPOTIFY_REFRESH_TOKEN=${json.refresh_token}`)
        console.log()
      } else {
        console.error('\n❌ Something went wrong:', json)
      }
    })
  }
)

req.write(body.toString())
req.end()
