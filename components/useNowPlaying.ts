'use client'

import { useSyncExternalStore } from 'react'

export interface Track {
  title: string
  artist: string
  album: string
  albumImageUrl: string
  songUrl: string
}

/**
 * What the listener is doing, as every screen needs to say it. Screens pick
 * their own words and layout for each kind but never work the kind out
 * themselves.
 *
 * playing      a track is on right now
 * last         nothing is on; `track` is the most recent one, and `recent`
 *              is the deduped list it heads
 * nothing      nothing is on and there is no history to show
 * unreachable  Spotify has not answered yet, so there is nothing to show
 * loading      the first answer has not come back
 */
export type Listening =
  | { kind: 'loading' }
  | { kind: 'unreachable' }
  | { kind: 'playing'; track: Track; recent: Track[] }
  | { kind: 'last'; track: Track; recent: Track[] }
  | { kind: 'nothing' }

/** The route's success body. A failure is a non-200 and never reaches this. */
interface NowPlayingBody {
  isPlaying: boolean
  title?: string
  artist?: string
  album?: string
  albumImageUrl?: string
  songUrl?: string
  recentTracks?: Track[]
}

/** Recently played repeats a track once per play. */
function dedupe(tracks: Track[]) {
  const seen = new Set<string>()
  return tracks.filter(t => {
    const key = `${t.title}|${t.artist}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function derive(body: NowPlayingBody): Listening {
  const recent = dedupe(body.recentTracks ?? [])
  if (body.isPlaying && body.title) {
    const track: Track = {
      title: body.title,
      artist: body.artist ?? '',
      album: body.album ?? '',
      albumImageUrl: body.albumImageUrl ?? '',
      songUrl: body.songUrl ?? '',
    }
    return { kind: 'playing', track, recent }
  }
  return recent.length ? { kind: 'last', track: recent[0], recent } : { kind: 'nothing' }
}

const POLL_MS = 30_000

/**
 * One poll of /api/spotify/now-playing shared by every screen that asks. The
 * classic page and both of Sound's DSi screens read it, and each fetching on
 * its own would multiply the requests and let them disagree for a moment.
 *
 * Polling only runs while something is subscribed, so it stops as soon as
 * the last reader goes away.
 *
 * Tolerance policy: a failed poll after a good one is ignored and the last
 * good answer stays up. Only a failure with nothing to fall back on is
 * reported, as `unreachable`.
 */
const loading: Listening = { kind: 'loading' }
let state: Listening = loading
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function set(next: Listening) {
  state = next
  listeners.forEach(l => l())
}

async function poll() {
  try {
    const res = await fetch('/api/spotify/now-playing')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    set(derive((await res.json()) as NowPlayingBody))
  } catch {
    if (state.kind === 'loading' || state.kind === 'unreachable') set({ kind: 'unreachable' })
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    void poll()
    timer = setInterval(poll, POLL_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearInterval(timer)
      state = loading
    }
  }
}

export function useNowPlaying(): Listening {
  return useSyncExternalStore(subscribe, () => state, () => loading)
}

/** Ask again now, from the unreachable state. Shows loading until the answer lands. */
export function retryNowPlaying() {
  if (state.kind === 'unreachable') set(loading)
  void poll()
}
