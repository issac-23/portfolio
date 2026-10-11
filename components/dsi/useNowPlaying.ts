'use client'

import { useSyncExternalStore } from 'react'

export interface Track {
  title: string
  artist: string
  album: string
  albumImageUrl: string
  songUrl: string
}

export interface NowPlaying {
  isPlaying: boolean
  title?: string
  artist?: string
  album?: string
  albumImageUrl?: string
  songUrl?: string
  recentTracks?: Track[]
}

export type SoundState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; data: NowPlaying }

const POLL_MS = 30_000

/**
 * One poll of /api/spotify/now-playing shared by everything that asks.
 * Both of Sound's screens need it, and two components each fetching on
 * their own would double the requests and could disagree for a moment.
 *
 * Polling only runs while something is subscribed, so it stops as soon as
 * Sound closes.
 */
let state: SoundState = { status: 'loading' }
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function set(next: SoundState) {
  state = next
  listeners.forEach(l => l())
}

async function poll() {
  try {
    const res = await fetch('/api/spotify/now-playing')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    set({ status: 'ready', data: (await res.json()) as NowPlaying })
  } catch {
    // Keep showing the last good answer through a blip.
    if (state.status !== 'ready') set({ status: 'failed' })
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
      state = { status: 'loading' }
    }
  }
}

const loading: SoundState = { status: 'loading' }

export function useNowPlaying(): SoundState {
  return useSyncExternalStore(subscribe, () => state, () => loading)
}

/** Recently played repeats a track once per play. */
export function dedupe(tracks: Track[]) {
  const seen = new Set<string>()
  return tracks.filter(t => {
    const key = `${t.title}|${t.artist}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
