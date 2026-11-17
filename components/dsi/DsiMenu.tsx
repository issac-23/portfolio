'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { galleryPhotos } from '@/data/gallery'
import AppRail from './AppRail'
import Device, { type DeviceProps } from './Device'
import type { ConsoleState } from './console'
import PhotoFrame from './PhotoFrame'
import { APPS } from './apps'
import { SCREENS, type ScreenCtx } from './screens'
import StatusBar from './StatusBar'
import { useConsole } from './useConsole'
import { rememberedView } from './view'

/**
 * Owns both screens, and draws whatever the console says is showing. Which
 * app is open and what is selected in it live in the console, because opening
 * one replaces both screens at once and the top and bottom have to agree.
 */
export interface DsiMenuProps {
  /** Where the console starts. The home page starts on the menu. */
  initial?: ConsoleState
  /** Draws the shell around the two screens. The home page draws <Device>. */
  shell?: (props: DeviceProps) => ReactNode
}

const deviceShell = (props: DeviceProps) => <Device {...props} />

export default function DsiMenu({ initial, shell = deviceShell }: DsiMenuProps = {}) {
  const [state, send] = useConsole(initial)

  // Someone who chose plain view last time gets it again without hunting
  // for the setting. Plain view links back here and clears the choice.
  useEffect(() => {
    if (shell === deviceShell && rememberedView() === 'plain') window.location.replace('/?view=plain')
  }, [shell])

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
  if (state.phase === 'off') return shell({ top: null, bottom: null, power: false, phase: state.phase, onPower: togglePower })

  // Launching still shows the menu, and returning still shows the app: each
  // swaps at the white, not when it starts.
  const open = state.phase === 'app' || state.phase === 'returning' ? state.app : null
  if (open) {
    const screen = SCREENS[open]
    const ctx: ScreenCtx = { sel: state.sel, setSel, back }
    return shell({ top: screen.top(ctx), bottom: screen.bottom(ctx), power: true, phase: state.phase, onPower: togglePower })
  }

  return shell({
    power: true,
    phase: state.phase,
    onPower: togglePower,
    top: (
      <>
        <StatusBar user="Issac" />
        <PhotoFrame photos={galleryPhotos} />
      </>
    ),
    bottom: (
      <div className="dsi-lower">
        <AppRail apps={APPS} initial={state.rail} autoFocus={state.refocus} onChange={railMoved} onLaunch={launch} live={state.phase === 'menu'} />
      </div>
    ),
  })
}
