/**
 * Spotify Auth Setup: gets a fresh refresh token and writes it to .env.local.
 * Refresh tokens expire 6 months after authorization, so rerun this about
 * twice a year.
 *
 * Usage: node scripts/spotify-auth.mjs [CLIENT_ID] [CLIENT_SECRET]
 *
 * CLIENT_ID / CLIENT_SECRET default to SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET
 * in .env.local; arguments override it. If no secret is found, you are asked
 * for it on stdin (input hidden when run in a terminal).
 *
 * Test hooks: SPOTIFY_AUTH_NO_OPEN=1 prints the browser command instead of
 * running it. SPOTIFY_AUTH_PORT overrides the port (the redirect URI must
 * still match the dashboard, so only use it for local testing).
 */

import http from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.SPOTIFY_AUTH_PORT) || 8888
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`
const SCOPES = 'user-read-currently-playing user-read-recently-played'
const ENV_PATH = fileURLToPath(new URL('../.env.local', import.meta.url))

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    let v = m[2]
    if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1)
    out[m[1]] = v
  }
  return out
}

// Replace the given keys in place, append any that are missing, keep every other line.
function updateEnvText(text, values) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text === '' ? [] : text.split(/\r?\n/)
  if (lines.length && lines[lines.length - 1] === '') lines.pop()
  const seen = new Set()
  const next = lines.map((line) => {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)
    if (m && m[1] in values) {
      seen.add(m[1])
      return `${m[1]}=${values[m[1]]}`
    }
    return line
  })
  for (const [k, v] of Object.entries(values)) if (!seen.has(k)) next.push(`${k}=${v}`)
  return next.join(eol) + eol
}

function promptHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question)
    const stdin = process.stdin
    if (!stdin.isTTY) {
      let buf = ''
      stdin.setEncoding('utf8')
      stdin.on('data', (d) => (buf += d))
      stdin.on('end', () => resolve(buf.split(/\r?\n/)[0].trim()))
      return
    }
    let value = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n' || c === '\u0004') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off('data', onData)
          process.stdout.write('\n')
          return resolve(value.trim())
        }
        if (c === '\u0003') process.exit(130)
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1)
        else value += c
      }
    }
    stdin.on('data', onData)
  })
}

// Command + args array for opening a URL. No shell, so '&' in the URL survives on Windows.
function openCommand(url, platform = process.platform) {
  if (platform === 'win32') return ['rundll32', ['url.dll,FileProtocolHandler', url]]
  if (platform === 'darwin') return ['open', [url]]
  return ['xdg-open', [url]]
}

function openBrowser(url) {
  const [cmd, args] = openCommand(url)
  if (process.env.SPOTIFY_AUTH_NO_OPEN) {
    console.log(`[no-open] would run: ${cmd} ${JSON.stringify(args)}`)
    return
  }
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true })
    child.on('error', () => {})
    child.unref()
  } catch {}
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const page = (body) =>
  `<html><body style="font-family:sans-serif;background:#0C0A09;color:#EDE8E3;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:1rem">${body}</body></html>`

const envText = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : ''
const env = parseEnv(envText)

const clientId = process.argv[2] || env.SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID
let clientSecret = process.argv[3] || env.SPOTIFY_CLIENT_SECRET || process.env.SPOTIFY_CLIENT_SECRET

if (!clientId) {
  console.error(
    '\nNo client id found. Put SPOTIFY_CLIENT_ID in .env.local or run:\n' +
      '  node scripts/spotify-auth.mjs [CLIENT_ID] [CLIENT_SECRET]\n',
  )
  process.exit(1)
}

if (!clientSecret) {
  clientSecret = await promptHidden('Spotify client secret (input hidden): ')
  if (!clientSecret) {
    console.error('\nNo client secret given.\n')
    process.exit(1)
  }
}

const authUrl =
  `https://accounts.spotify.com/authorize` +
  `?client_id=${encodeURIComponent(clientId)}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES)}`

function fail(res, message) {
  console.error(`\nAuth failed: ${message}`)
  console.error('Fix the problem, then open this URL again (the script is still running):')
  console.error(authUrl + '\n')
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(
    page(
      `<h2 style="color:#e5604d">Auth failed</h2>` +
        `<p style="color:#9A8F85;max-width:40rem;word-break:break-word">${esc(message)}</p>` +
        `<p style="color:#9A8F85">Fix it, then open the authorization URL from the terminal again.</p>`,
    ),
  )
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  if (url.pathname !== '/callback') {
    res.end()
    return
  }

  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) return fail(res, error ?? 'no code in callback')

  let data
  try {
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
    data = await tokenRes.json()
    if (!tokenRes.ok || !data.refresh_token) {
      // Only the error fields; never echo tokens.
      const msg = [data.error, data.error_description].filter(Boolean).join(': ')
      return fail(res, `token exchange failed (HTTP ${tokenRes.status})${msg ? ': ' + msg : ''}`)
    }
  } catch (e) {
    return fail(res, `token exchange failed: ${e.message}`)
  }

  try {
    const current = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : ''
    writeFileSync(
      ENV_PATH,
      updateEnvText(current, {
        SPOTIFY_CLIENT_ID: clientId,
        SPOTIFY_CLIENT_SECRET: clientSecret,
        SPOTIFY_REFRESH_TOKEN: data.refresh_token,
      }),
    )
  } catch (e) {
    return fail(res, `could not write .env.local: ${e.message}`)
  }

  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(
    page(
      `<h2 style="color:#C8956C">Spotify connected!</h2>` +
        `<p style="color:#9A8F85">.env.local has been updated. Restart your dev server and you're done.</p>` +
        `<p style="color:#9A8F85">You can close this tab.</p>`,
    ),
  )

  console.log('\nSuccess! .env.local updated with your Spotify credentials.')
  console.log('Restart the dev server, and copy SPOTIFY_REFRESH_TOKEN into Vercel (Production) and redeploy.\n')

  server.close()
})

server.on('error', (e) => {
  console.error(`\nCould not start the callback server on port ${PORT}: ${e.message}\n`)
  process.exit(1)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log('\nOpening Spotify authorization in your browser...')
  openBrowser(authUrl)
  console.log('If the browser did not open, visit this URL manually:')
  console.log(authUrl + '\n')
})
