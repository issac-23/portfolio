import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, mock, test } from 'node:test'

// Fake values; the route reads these when it loads. No real credentials.
process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token'

const { GET } = await import('../app/api/spotify/now-playing/route')

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
  // The route logs the cause of every failure; keep it out of the test output.
  mock.method(console, 'error', () => {})
})

afterEach(() => mock.restoreAll())

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
