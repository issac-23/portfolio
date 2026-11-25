import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, mock, test } from 'node:test'

// Fake values; the route reads these when it loads. No real credentials.
process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token'

const { GET } = await import('../app/api/spotify/now-playing/route')
const { resetTokenCacheForTests } = await import('../app/api/spotify/now-playing/token')

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const NOW_URL = 'https://api.spotify.com/v1/me/player/currently-playing'
const RECENT_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=50'

type Reply = Response | (() => Response | Promise<Response>)

const json = (body: unknown, status = 200) => Response.json(body, { status })

const spotifyTrack = (title: string, artist = 'Someone') => ({
  name: title,
  artists: [{ name: artist }],
  album: { name: `${title} (Album)`, images: [{ url: `${title}.jpg` }] },
  external_urls: { spotify: `https://open.spotify.com/track/${title}` },
})

/** Newest first, like Spotify; each play an hour apart starting an hour ago. */
const recentPlays = (titles: string[]) => ({
  items: titles.map((title, i) => ({
    played_at: new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toISOString(),
    track: spotifyTrack(title),
  })),
})

const calls: { url: string; init?: RequestInit }[] = []

/** Answers each Spotify URL from `replies`; any URL not listed fails the test. */
function mockSpotify(replies: Partial<Record<'token' | 'now' | 'recent', Reply>>) {
  const byUrl: Record<string, Reply | undefined> = {
    [TOKEN_URL]: replies.token ?? json({ access_token: 'test-access-token' }),
    [NOW_URL]: replies.now,
    [RECENT_URL]: replies.recent,
  }
  mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    const reply = byUrl[url]
    if (!reply) throw new Error(`unexpected fetch: ${url}`)
    return typeof reply === 'function' ? reply() : reply.clone()
  })
}

const get = async () => {
  const res = await GET()
  return { res, body: await res.json() }
}

beforeEach(() => {
  calls.length = 0
  // The token cache is module state and would carry over from the previous test.
  resetTokenCacheForTests()
  // The route logs the cause of every failure; keep it out of the test output.
  mock.method(console, 'error', () => {})
})

afterEach(() => {
  mock.timers.reset()
  mock.restoreAll()
})

describe('now-playing route', () => {
  test('playing: sends the track and no recent list', async () => {
    mockSpotify({
      now: json({ is_playing: true, item: spotifyTrack('Nights', 'Frank Ocean') }),
      recent: json(recentPlays(['Ivy', 'Pink + White'])),
    })
    const { res, body } = await get()
    assert.equal(res.status, 200)
    assert.equal(body.isPlaying, true)
    assert.equal(body.title, 'Nights')
    assert.equal(body.artist, 'Frank Ocean')
    assert.equal(body.songUrl, 'https://open.spotify.com/track/Nights')
    assert.deepEqual(body.recentTracks, [])
    assert.equal(body.week.plays, 2)
  })

  test('paused with recent plays: not playing, and the five newest plays are sent', async () => {
    mockSpotify({
      now: json({ is_playing: false, item: spotifyTrack('Nights', 'Frank Ocean') }),
      recent: json(recentPlays(['A', 'B', 'C', 'D', 'E', 'F', 'G'])),
    })
    const { body } = await get()
    assert.equal(body.isPlaying, false)
    assert.equal(body.title, 'Nights')
    assert.deepEqual(body.recentTracks.map((t: { title: string }) => t.title), ['A', 'B', 'C', 'D', 'E'])
    assert.equal(body.week.plays, 7)
  })

  test('paused with no recent plays: an empty list', async () => {
    mockSpotify({
      now: json({ is_playing: false, item: spotifyTrack('Nights') }),
      recent: json({ items: [] }),
    })
    const { body } = await get()
    assert.equal(body.isPlaying, false)
    assert.deepEqual(body.recentTracks, [])
    assert.equal(body.week.plays, 0)
  })

  test('204, nothing playing: the five newest plays, skipping null tracks', async () => {
    const recent = recentPlays(['A', 'B', 'C', 'D', 'E', 'F'])
    recent.items.splice(1, 0, { played_at: recent.items[0].played_at, track: null as never })
    mockSpotify({ now: new Response(null, { status: 204 }), recent: json(recent) })
    const { res, body } = await get()
    assert.equal(res.status, 200)
    assert.equal(body.isPlaying, false)
    assert.equal(body.title, undefined)
    assert.deepEqual(body.recentTracks.map((t: { title: string }) => t.title), ['A', 'B', 'C', 'D', 'E'])
    assert.equal(body.week.plays, 6)
  })

  test('ad (no item): not playing, with the recent plays', async () => {
    mockSpotify({
      now: json({ is_playing: true, item: null, currently_playing_type: 'ad' }),
      recent: json(recentPlays(['A', 'B'])),
    })
    const { body } = await get()
    assert.equal(body.isPlaying, false)
    assert.equal(body.title, undefined)
    assert.deepEqual(body.recentTracks.map((t: { title: string }) => t.title), ['A', 'B'])
  })

  test('asks Spotify with the refresh grant and the access token it got back', async () => {
    mockSpotify({
      now: new Response(null, { status: 204 }),
      recent: json({ items: [] }),
    })
    await get()
    const token = calls.find(c => c.url === TOKEN_URL)!
    assert.equal(token.init?.method, 'POST')
    const form = token.init?.body as URLSearchParams
    assert.equal(form.get('grant_type'), 'refresh_token')
    assert.equal(form.get('refresh_token'), 'test-refresh-token')
    const api = calls.filter(c => c.url !== TOKEN_URL)
    assert.equal(api.length, 2)
    for (const c of api) {
      assert.deepEqual(c.init?.headers, { Authorization: 'Bearer test-access-token' })
    }
  })

  describe('token cache', () => {
    const tokenCalls = () => calls.filter(c => c.url === TOKEN_URL).length
    const bearers = () =>
      calls.filter(c => c.url === NOW_URL).map(c => (c.init?.headers as Record<string, string>).Authorization)
    /** A token endpoint that hands out token-1, token-2, ... with the given lifetime. */
    const numberedTokens = (expiresIn: number) => {
      let n = 0
      return () => json({ access_token: `token-${++n}`, expires_in: expiresIn })
    }
    const idle = { now: new Response(null, { status: 204 }), recent: json({ items: [] }) }

    test('a second request within the token lifetime makes no new token call', async () => {
      mockSpotify({ token: numberedTokens(3600), ...idle })
      await get()
      await get()
      assert.equal(tokenCalls(), 1)
      assert.deepEqual(bearers(), ['Bearer token-1', 'Bearer token-1'])
    })

    test('a request after the token expires fetches a new one, 60 s early', async () => {
      mock.timers.enable({ apis: ['Date'], now: Date.now() })
      mockSpotify({ token: numberedTokens(3600), ...idle })
      await get()
      mock.timers.tick(3600_000 - 61_000)
      await get()
      assert.equal(tokenCalls(), 1, 'still cached 61 s before expiry')
      mock.timers.tick(2_000)
      await get()
      assert.equal(tokenCalls(), 2, 'refreshed inside the last 60 s')
      assert.equal(bearers()[2], 'Bearer token-2')
    })

    test('requests at the same time share one token call', async () => {
      mockSpotify({ token: numberedTokens(3600), ...idle })
      await Promise.all([get(), get(), get()])
      assert.equal(tokenCalls(), 1)
    })

    test('a 401 from Spotify drops the token and retries once with a fresh one', async () => {
      let nowCalls = 0
      mockSpotify({
        token: numberedTokens(3600),
        now: () => (++nowCalls === 1 ? json({ error: 'expired' }, 401) : new Response(null, { status: 204 })),
        recent: json({ items: [] }),
      })
      const { res, body } = await get()
      assert.equal(body.isPlaying, false)
      assert.equal(res.headers.get('cache-control'), 's-maxage=15, stale-while-revalidate=30')
      assert.equal(tokenCalls(), 2)
      assert.deepEqual(bearers(), ['Bearer token-1', 'Bearer token-2'])
    })

    test('a 401 even with the fresh token is spotify_unavailable, after one retry, and the token is not kept', async () => {
      mockSpotify({ token: numberedTokens(3600), now: json({ error: 'nope' }, 401), recent: json({ items: [] }) })
      const first = await get()
      assert.deepEqual(first.body, { error: 'spotify_unavailable' })
      assert.equal(tokenCalls(), 2)
      await get()
      assert.equal(tokenCalls(), 4, 'each request asked for a new token, nothing cached')
    })

    test('invalid_grant on refresh is spotify_auth and nothing stale is reused afterwards', async () => {
      mock.timers.enable({ apis: ['Date'], now: Date.now() })
      let refusing = false
      mockSpotify({
        token: () => (refusing ? json({ error: 'invalid_grant' }, 400) : json({ access_token: 'token-1', expires_in: 3600 })),
        ...idle,
      })
      await get()
      mock.timers.tick(3600_000)
      refusing = true
      assert.deepEqual((await get()).body, { error: 'spotify_auth' })
      refusing = false
      await get()
      assert.equal(tokenCalls(), 3)
    })

    test('the token never appears in a response', async () => {
      mockSpotify({ token: numberedTokens(3600), now: json({ is_playing: true, item: spotifyTrack('Nights') }), recent: json(recentPlays(['A'])) })
      const { res, body } = await get()
      assert.ok(!JSON.stringify(body).includes('token-1'))
      assert.ok(![...res.headers.values()].some(v => v.includes('token-1')))
    })
  })

  describe('caching headers', () => {
    const shared = 's-maxage=15, stale-while-revalidate=30'

    test('a playing answer is shareable at the CDN', async () => {
      mockSpotify({ now: json({ is_playing: true, item: spotifyTrack('Nights') }), recent: json(recentPlays(['A'])) })
      assert.equal((await get()).res.headers.get('cache-control'), shared)
    })

    test('204, nothing playing, is shareable too', async () => {
      mockSpotify({ now: new Response(null, { status: 204 }), recent: json({ items: [] }) })
      assert.equal((await get()).res.headers.get('cache-control'), shared)
    })

    test('an ad (no item) is shareable too', async () => {
      mockSpotify({ now: json({ is_playing: true, item: null }), recent: json({ items: [] }) })
      assert.equal((await get()).res.headers.get('cache-control'), shared)
    })

    test('errors are not shareable', async () => {
      mockSpotify({ now: json({ error: 'rate' }, 429), recent: json(recentPlays(['A'])) })
      assert.equal((await get()).res.headers.get('cache-control'), 'no-store')
      mockSpotify({ token: json({ error: 'invalid_grant' }, 400) })
      assert.equal((await get()).res.headers.get('cache-control'), 'no-store')
    })
  })

  describe('failures', () => {
    const noSecrets = (body: unknown) => {
      const text = JSON.stringify(body)
      for (const secret of ['test-client-secret', 'test-refresh-token', 'test-access-token']) {
        assert.ok(!text.includes(secret))
      }
    }

    test('a revoked refresh token (400 invalid_grant) is spotify_auth', async () => {
      mockSpotify({ token: json({ error: 'invalid_grant' }, 400) })
      const { res, body } = await get()
      assert.equal(res.status, 200)
      assert.deepEqual(body, { error: 'spotify_auth' })
      assert.equal(res.headers.get('cache-control'), 'no-store')
      assert.equal(calls.length, 1, 'no Spotify API call without a token')
    })

    test('a 400 with another error code is spotify_unavailable', async () => {
      mockSpotify({ token: json({ error: 'invalid_client' }, 400) })
      assert.deepEqual((await get()).body, { error: 'spotify_unavailable' })
    })

    test('a token endpoint outage is spotify_unavailable', async () => {
      mockSpotify({ token: new Response('bad gateway', { status: 502 }) })
      assert.deepEqual((await get()).body, { error: 'spotify_unavailable' })
    })

    test('a token response without an access_token is spotify_unavailable', async () => {
      mockSpotify({ token: json({ token_type: 'Bearer' }) })
      assert.deepEqual((await get()).body, { error: 'spotify_unavailable' })
    })

    test('a network error is spotify_unavailable and leaks nothing', async () => {
      mock.method(globalThis, 'fetch', async () => {
        throw new TypeError('fetch failed: test-refresh-token')
      })
      const { res, body } = await get()
      assert.equal(res.status, 200)
      assert.deepEqual(body, { error: 'spotify_unavailable' })
      noSecrets(body)
    })

    test('recently-played failing is spotify_unavailable even if currently-playing answered', async () => {
      mockSpotify({
        now: json({ is_playing: true, item: spotifyTrack('Nights') }),
        recent: json({ error: 'nope' }, 500),
      })
      const { res, body } = await get()
      assert.equal(res.status, 200)
      assert.deepEqual(body, { error: 'spotify_unavailable' })
    })

    test('currently-playing failing (not 204) is spotify_unavailable', async () => {
      mockSpotify({ now: json({ error: 'rate' }, 429), recent: json(recentPlays(['A'])) })
      assert.deepEqual((await get()).body, { error: 'spotify_unavailable' })
    })

    test('a currently-playing body that is not JSON is spotify_unavailable', async () => {
      mockSpotify({ now: new Response('<html>', { status: 200 }), recent: json(recentPlays(['A'])) })
      assert.deepEqual((await get()).body, { error: 'spotify_unavailable' })
    })

    test('failures are logged without the secrets', async () => {
      mockSpotify({ token: json({ error: 'invalid_grant' }, 400) })
      await get()
      const logged = (console.error as unknown as ReturnType<typeof mock.fn>).mock.calls
        .map(c => String(c.arguments[0]))
        .join('\n')
      assert.match(logged, /spotify_auth/)
      noSecrets(logged)
    })
  })
})
