const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN!

/** Refresh this long before Spotify says the token expires, so a request never sends one that dies in flight. */
const EARLY_MS = 60_000

/**
 * The access token lives in module memory for most of the hour Spotify gives
 * it, so a request normally costs the two API calls and no token call. A
 * serverless instance that restarts just fetches a new one. It is never
 * logged or put in a response.
 */
let cached: { token: string; expiresAt: number } | null = null
// One refresh at a time: requests that arrive while it is in flight share it.
let inflight: Promise<string> | null = null

/** The token endpoint refused the refresh grant. Carries only status and Spotify's error code. */
export class TokenError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(`token request failed: ${status}${code ? ` ${code}` : ''}`)
  }
}

async function requestToken(): Promise<string> {
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
    cached = null
    // Spotify's error code is safe to keep; the body can echo nothing secret.
    const code = (await res.json().catch(() => null))?.error
    throw new TokenError(res.status, typeof code === 'string' ? code : undefined)
  }
  const body = await res.json()
  if (!body.access_token) throw new Error('token response had no access_token')
  const lifetimeMs = (typeof body.expires_in === 'number' ? body.expires_in : 3600) * 1000
  cached = { token: body.access_token, expiresAt: Date.now() + lifetimeMs - EARLY_MS }
  return body.access_token
}

export async function getAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token
  inflight ??= requestToken().finally(() => {
    inflight = null
  })
  return inflight
}

/** Drop the cached token, e.g. after Spotify answered 401, so the next call fetches a fresh one. */
export function dropAccessToken() {
  cached = null
}

/** Test-only: forget the cached token and any refresh in flight, since module state outlives one test. */
export function resetTokenCacheForTests() {
  cached = null
  inflight = null
}
