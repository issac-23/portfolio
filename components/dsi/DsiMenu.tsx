'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { galleryPhotos } from '@/data/gallery'
import AppRail from './AppRail'
import { APPS, type AppId } from './apps'
import Device from './Device'
import { playLaunch, playReturn } from './launch'
import PhotoFrame from './PhotoFrame'
import { SCREENS, type ScreenCtx } from './screens'
import StatusBar from './StatusBar'
import { rememberedView } from './view'

/**
 * Owns both screens. Selection state has to drive the top and bottom screen
 * together, so it lives here rather than in either one, and so does which
 * app is open, since opening one replaces both screens at once.
 */
export default function DsiMenu() {
  const [open, setOpen] = useState<AppId | null>(null)
  const [app, setApp] = useState(0)
  const [sel, setSel] = useState(0)
  // Set while a transition is running, so a second press cannot start
  // another one on top of it.
  const busy = useRef(false)
  // Only hand focus back to the rail when coming back from an app, never on
  // first load, where it would steal the skip link's place.
  const returning = useRef(false)

  // Someone who chose plain view last time gets it again without hunting
  // for the setting. Plain view links back here and clears the choice.
  useEffect(() => {
    if (rememberedView() === 'plain') window.location.replace('/dsi?view=plain')
  }, [])

  const launch = useCallback((index: number, icon: HTMLElement) => {
    const id = APPS[index].id
    if (busy.current || !SCREENS[id]) return
    busy.current = true
    // Busy only until the swap. The white fading off afterwards is just
    // paint, and holding input through it dropped a quick Escape or Enter.
    playLaunch(icon, () => {
      flushSync(() => {
        setSel(0)
        setOpen(id)
      })
      busy.current = false
    }).catch(() => {
      // Failed before reaching the swap: let the next press through.
      busy.current = false
    })
  }, [])

  const back = useCallback(() => {
    if (busy.current) return
    busy.current = true
    returning.current = true
    const from = document.querySelector('.dsi-device') ?? document.body
    playReturn(from, () => {
      flushSync(() => setOpen(null))
      busy.current = false
    }).catch(() => {
      // Failed before reaching the swap: let the next press through.
      busy.current = false
    })
  }, [])

  // The same Device element whichever app is open, so the shell and its
  // effects layers survive the swap that happens mid-launch.
  const screen = open ? SCREENS[open] : undefined
  if (screen) {
    const ctx: ScreenCtx = { sel, setSel, back }
    return <Device top={screen.top(ctx)} bottom={screen.bottom(ctx)} />
  }

  return (
    <Device
      top={
        <>
          <StatusBar user="Issac" />
          <PhotoFrame photos={galleryPhotos} />
        </>
      }
      bottom={
        <div className="dsi-lower">
          <AppRail apps={APPS} initial={app} autoFocus={returning.current} onChange={setApp} onLaunch={launch} />
        </div>
      }
    />
  )
}
