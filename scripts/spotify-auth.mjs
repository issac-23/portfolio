/**
 * Spotify Auth Setup — run once to get your refresh token.
 * Usage: node scripts/spotify-auth.mjs <CLIENT_ID> <CLIENT_SECRET>
 */

import http from 'node:http'
import { exec } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { URL } from 'node:url'

const [,, clientId, clientSecret] = process.argv

if (!clientId || !clientSecret) {
  console.error('\nUsage: node scripts/spotify-auth.mjs YOUR_CLIENT_ID YOUR_CLIENT_SECRET\n')
  process.exit(1)
}

const REDIRECT_URI = 'http://127.0.0.1:8888/callback'
const SCOPES = 'user-read-currently-playing user-read-recently-played'

const authUrl =
  `https://accounts.spotify.com/authorize` +
  `?client_id=${clientId}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES)}`

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8888')
  if (url.pathname !== '/callback') { res.end(); return }

  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h2 style="font-family:sans-serif;color:red">Auth failed: ' + (error ?? 'no code') + '</h2>')
    server.close()
    return
  }

  // Exchange code for tokens
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  })

  const data = await tokenRes.json()

  if (!data.refresh_token) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h2 style="font-family:sans-serif;color:red">Error: ' + JSON.stringify(data) + '</h2>')
    server.close()
    return
  }

  // Write .env.local
  const envPath = new URL('../.env.local', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
  const content = `SPOTIFY_CLIENT_ID=${clientId}\nSPOTIFY_CLIENT_SECRET=${clientSecret}\nSPOTIFY_REFRESH_TOKEN=${data.refresh_token}\n`
  writeFileSync(envPath, content)

  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(`
    <html><body style="font-family:sans-serif;background:#0C0A09;color:#EDE8E3;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:1rem">
      <h2 style="color:#C8956C">✓ Spotify connected!</h2>
      <p style="color:#9A8F85">.env.local has been updated. Restart your dev server and you're done.</p>
      <p style="color:#9A8F85">You can close this tab.</p>
    </body></html>
  `)

  console.log('\n✅ Success! .env.local updated with your Spotify credentials.')
  console.log('Restart the dev server (Ctrl+C, then npm run dev) and your music section is live.\n')

  server.close()
})

server.listen(8888, '127.0.0.1', () => {
  console.log('\nOpening Spotify authorization in your browser...')
  // Open browser cross-platform
  const cmd = process.platform === 'win32' ? `start "" "${authUrl}"` : `open "${authUrl}"`
  exec(cmd)
  console.log('If the browser did not open, visit this URL manually:')
  console.log(authUrl + '\n')
})
