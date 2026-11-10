'use client'

import { useSyncExternalStore } from 'react'
import type { Week } from '@/app/api/spotify/now-playing/week'

export type { Week, WeekTrack } from '@/app/api/spotify/now-playing/week'

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

/**
 * The week's most played, as every screen needs to say it. Like `Listening`,
 * screens pick words and layout, and never work the kind out or cut the lists
 * themselves.
 *
 * loading  no answer to show yet (still waiting, or Spotify has not answered)
 * empty    an answer came back but nothing was played this week
 * week     `topArtists` and `topTracks` are already cut to the lengths the
 *          screens show, most played first
 */
export type ListeningWeek =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'week'; topArtists: Week['topArtists']; topTracks: Week['topTracks'] }

// Both Sound screens show the same cut of the week.
const TOP_ARTISTS = 3
const TOP_TRACKS = 5

function deriveWeek(w: Week | undefined): ListeningWeek {
  if (!w) return { kind: 'loading' }
  if (w.plays <= 0) return { kind: 'empty' }
  return {
    kind: 'week',
    topArtists: w.topArtists.slice(0, TOP_ARTISTS),
    topTracks: w.topTracks.slice(0, TOP_TRACKS),
  }
}

/** What the route sends back: an answer, or `error` when it could not get one. */
interface NowPlayingBody {
  error?: string
  isPlaying: boolean
  title?: string
  artist?: string
  album?: string
  albumImageUrl?: string
  songUrl?: string
  recentTracks?: Track[]
  /** Counted from the last 50 plays that fall inside the past 7 days. */
  week?: Week
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
const loadingWeek: ListeningWeek = { kind: 'loading' }
let state: Listening = loading
/** The week from the same answer as `state`, kept apart so `Listening` stays about right now. */
let week: ListeningWeek = loadingWeek
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function set(next: Listening, nextWeek: ListeningWeek = week) {
  state = next
  week = nextWeek
  listeners.forEach(l => l())
}

function answered(s: Listening) {
  return s.kind !== 'loading' && s.kind !== 'unreachable'
}

async function poll() {
  // Each poll costs two Spotify calls, so a background tab that already has
  // an answer waits until it is looked at again.
  if (document.hidden && answered(state)) return
  try {
    const res = await fetch('/api/spotify/now-playing')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = (await res.json()) as NowPlayingBody
    if (body.error) throw new Error(body.error)
    set(derive(body), deriveWeek(body.week))
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
      week = loadingWeek
    }
  }
}

export function useNowPlaying(): Listening {
  return useSyncExternalStore(subscribe, () => state, () => loading)
}

/**
 * The week's most played, from the same shared poll as `useNowPlaying`.
 * `loading` until an answer lands, and kept through a failed poll like the
 * rest of the answer.
 */
export function useListeningWeek(): ListeningWeek {
  return useSyncExternalStore(subscribe, () => week, () => loadingWeek)
}

/** Ask again now, from the unreachable state. Shows loading until the answer lands. */
export function retryNowPlaying() {
  if (state.kind === 'unreachable') set(loading)
  void poll()
}
