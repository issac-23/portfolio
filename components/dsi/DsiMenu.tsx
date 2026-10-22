'use client'

import { useCallback, useEffect } from 'react'
import { galleryPhotos } from '@/data/gallery'
import AppRail from './AppRail'
import { APPS } from './apps'
import { appFromHash } from './deepLink'
import Device from './Device'
import PhotoFrame from './PhotoFrame'
import { SCREENS, type ScreenCtx } from './screens'
import StatusBar from './StatusBar'
import { useConsole } from './useConsole'
import { rememberedView } from './view'

/**
 * Owns both screens, and draws whatever the console says is showing. Which
 * app is open and what is selected in it live in the console, because opening
 * one replaces both screens at once and the top and bottom have to agree.
 */
export default function DsiMenu() {
  const [state, send] = useConsole()

  // Someone who chose plain view last time gets it again without hunting
  // for the setting. Plain view links back here and clears the choice.
  useEffect(() => {
    if (rememberedView() === 'plain') window.location.replace('/?view=plain')
  }, [])

  // Arriving on, or switching to, an app's address opens it straight away:
  // the link was the click, so there is nothing to animate from.
  useEffect(() => {
    const go = () => {
      const app = appFromHash(location.hash)
      send({ type: 'hash', app, slot: app ? APPS.findIndex(a => a.id === app) : 0 })
    }
    go()
    window.addEventListener('hashchange', go)
    return () => window.removeEventListener('hashchange', go)
  }, [send])

  const launch = useCallback((index: number, icon: HTMLElement) => send({ type: 'launch', app: APPS[index].id, icon }), [send])
  const back = useCallback(() => send({ type: 'back' }), [send])
  const setSel = useCallback((index: number) => send({ type: 'select', index }), [send])
  const railMoved = useCallback((index: number) => send({ type: 'railMoved', index }), [send])
  // Off closes whatever is open, so switching on always lands on the menu with
  // the rail back on Profile. The boot screen plays again unless motion is off.
  const togglePower = useCallback(() => send({ type: 'power' }), [send])

  // The same Device element whichever app is open, so the shell and its
  // effects layers survive the swap that happens mid-launch. Off renders
  // nothing in either screen, so no handler from the rail or an app is left
  // listening to a dark console.
  if (state.phase === 'off') return <Device top={null} bottom={null} power={false} phase={state.phase} onPower={togglePower} />

  // Launching still shows the menu, and returning still shows the app: each
  // swaps at the white, not when it starts.
  const open = state.phase === 'app' || state.phase === 'returning' ? state.app : null
  const screen = open ? SCREENS[open] : undefined
  if (screen) {
    const ctx: ScreenCtx = { sel: state.sel, setSel, back }
    return <Device top={screen.top(ctx)} bottom={screen.bottom(ctx)} power phase={state.phase} onPower={togglePower} />
  }

  return (
    <Device
      power
      phase={state.phase}
      onPower={togglePower}
      top={
        <>
          <StatusBar user="Issac" />
          <PhotoFrame photos={galleryPhotos} />
        </>
      }
      bottom={
        <div className="dsi-lower">
          <AppRail apps={APPS} initial={state.rail} autoFocus={state.refocus} onChange={railMoved} onLaunch={launch} />
        </div>
      }
    />
  )
}
