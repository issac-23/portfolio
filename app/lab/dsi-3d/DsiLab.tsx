'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createChiptune, type Chiptune } from '@/components/dsi/lab/chiptune'
import { createSfx, type Cue } from '@/components/dsi/lab/sfx'
import PowerHint from './PowerHint'

// three, the model and the whole DSi UI load only in the browser, and only on this route.
const DsiScene = dynamic(() => import('./DsiScene'), {
  ssr: false,
  loading: () => <p className="absolute inset-0 grid place-items-center text-sm text-[#0e4155]">Loading the DSi...</p>,
})

const CREDIT = {
  model: 'https://sketchfab.com/3d-models/dsi-2d03bc1178a54658872030e22ac77c35',
  author: 'https://sketchfab.com/Cleanman00',
  license: 'http://creativecommons.org/licenses/by/4.0/',
}

// Without WebGL the scene can only show its loading line or a blank canvas.
const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    // Hand the probe's context straight back, so it never competes with the scene's.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}

const MUTE_KEY = 'dsi-lab-muted'
const readMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export default function DsiLab() {
  const [lit, setLit] = useState(false)
  const [muted, setMuted] = useState(false)
  // The "Press POWER" pointer is for a visitor who has not turned the console on
  // yet: it waits for the lid to be up, and once they have, it stays gone for
  // the rest of the visit, however often they switch off and on.
  const [opened, setOpened] = useState(false)
  const [everLit, setEverLit] = useState(false)
  useEffect(() => {
    if (lit) setEverLit(true)
  }, [lit])
  // Unknown until the browser has been asked, so the server render matches.
  const [webgl, setWebgl] = useState<boolean | null>(null)
  useEffect(() => setWebgl(hasWebGL()), [])
  const mutedRef = useRef(false)
  const power = useRef<() => void>(() => {})
  const music = useRef<Chiptune | null>(null)
  const sfx = useRef<ReturnType<typeof createSfx> | null>(null)
  if (!sfx.current) sfx.current = createSfx(() => music.current?.context() ?? null)
  const cue = useCallback((name: Cue) => void sfx.current?.play(name), [])

  // The saved choice is read after hydration, so the first render matches the server's.
  useEffect(() => {
    mutedRef.current = readMuted()
    setMuted(mutedRef.current)
    const w = window as unknown as { __dsiLab?: Record<string, unknown> }
    w.__dsiLab = { ...w.__dsiLab, audioState: () => music.current?.state() ?? null, sfxLog: () => sfx.current?.log() ?? [], musicPlaying: () => music.current?.playing() ?? false, musicLevel: () => music.current?.level() ?? null }
    const stop = () => music.current?.dispose()
    window.addEventListener('pagehide', stop)
    return () => {
      window.removeEventListener('pagehide', stop)
      stop()
      music.current = null
    }
  }, [])

  // Every way of pressing POWER ends here. The first press is the user gesture
  // the browser wants before it will play anything, so it creates the audio,
  // but whether the loop plays is left to the console below.
  const press = useCallback(() => {
    if (!music.current) {
      music.current = createChiptune(mutedRef.current)
      music.current.start()
      music.current.stop()
    }
    cue('power')
    power.current()
  }, [cue])

  // The music follows the console, not the press: POWER is ignored while an
  // app launches or returns, and does nothing before the scene has loaded.
  useEffect(() => {
    if (lit) music.current?.start()
    else music.current?.stop()
  }, [lit])

  const onOpened = useCallback(() => {
    cue('reveal')
    setOpened(true)
  }, [cue])

  const register = useCallback((fn: () => void) => {
    power.current = fn
  }, [])

  const toggleMute = () => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    try {
      localStorage.setItem(MUTE_KEY, next ? '1' : '0')
    } catch {
      // Blocked storage: the choice holds for this visit.
    }
    music.current?.setMuted(next)
  }

  // Enter or Space before anything has focus is the same as pressing POWER.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lit || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === document.body) {
        e.preventDefault()
        press()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lit, press])

  return (
    <main
      className="relative h-[100svh] w-full overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #a9cbee 0%, #bad6f2 35%, #cbe1f4 65%, #dcebf4 100%)' }}
    >
      {webgl === false ? (
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-[#0e4155]">
          <p>
            This browser can&apos;t show the 3D DSi (WebGL is off or unavailable).{' '}
            <Link href="/" className="underline">
              The regular DSi home page
            </Link>{' '}
            has everything in it.
          </p>
        </div>
      ) : webgl ? (
        <DsiScene onPress={press} register={register} onLit={setLit} lit={lit} onCue={cue} onOpened={onOpened} />
      ) : null}

      {webgl !== false && (
        <>
          {/* The keyboard and screen reader way to press the model's POWER button. */}
          <button
            type="button"
            onClick={press}
            aria-label={lit ? 'Power off' : 'Power on'}
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-[#0e4155] focus:px-3 focus:py-1.5 focus:text-sm focus:text-white"
          >
            {lit ? 'Power off' : 'Power on'}
          </button>

          {opened && !lit && !everLit && <PowerHint />}

          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute music' : 'Mute music'}
            className="absolute right-3 top-3 z-50 rounded-full bg-[#0e4155]/85 px-3 py-1.5 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e4155]"
          >
            {muted ? 'Music off' : 'Music on'}
          </button>
        </>
      )}

      <p className="pointer-events-none absolute inset-x-0 bottom-2 px-4 text-center text-[10px] leading-snug text-[#0e4155]/80">
        <span className="pointer-events-auto">
          This work is based on &quot;DSi&quot; (<a href={CREDIT.model}>{CREDIT.model}</a>) by Cleanman00 (
          <a href={CREDIT.author}>{CREDIT.author}</a>) licensed under CC-BY-4.0 (
          <a href={CREDIT.license}>{CREDIT.license}</a>)
        </span>
      </p>
    </main>
  )
}
