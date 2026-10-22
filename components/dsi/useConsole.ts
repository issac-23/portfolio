'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import {
  BOOTED_KEY,
  BOOT_DATASET,
  INITIAL,
  move,
  type ConsoleEnv,
  type ConsoleState,
  type Trigger,
} from './console'
import { writeHash } from './deepLink'
import { playLaunch, playReturn } from './launch'
import { chosenLessMotion, lessMotion } from './prefs'
import { SCREENS } from './screens'

// Rules b and c from console.ts. They read different settings on purpose.
const replaysBoot = () => !chosenLessMotion()
const animates = () => !lessMotion()

const ENV: ConsoleEnv = { replaysBoot, opens: app => !!SCREENS[app] }

/**
 * Arms the listeners that end the boot screen: when its fade finishes, or
 * straight away on any key or tap, so nobody has to sit through it. A key that
 * skips it is swallowed, rather than also moving the rail behind it, except
 * browser shortcuts (Ctrl/Cmd/Alt chords, F-keys), which still work. A tap
 * only ends the boot: its click still fires, so a tap on Resume or POWER
 * during the boot follows it.
 *
 * `end` takes the boot off screen and tells the console it is over. `stop`
 * does the same without telling it, for when the console already knows.
 */
function armBoot(onEnd: () => void) {
  const root = document.documentElement

  const stop = () => {
    delete root.dataset[BOOT_DATASET]
    window.removeEventListener('keydown', skipKey, true)
    window.removeEventListener('pointerdown', skip, true)
    document.removeEventListener('animationend', onAnim)
    clearTimeout(safety)
  }
  const end = () => {
    stop()
    onEnd()
  }
  const skip = (e: Event) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    end()
  }
  const skipKey = (e: KeyboardEvent) => {
    // Reload and the address bar have to keep working, so shortcuts pass
    // through untouched. They still end the boot.
    if (e.ctrlKey || e.metaKey || e.altKey || /^F\d{1,2}$/.test(e.key)) end()
    else skip(e)
  }
  const onAnim = (e: AnimationEvent) => {
    if (e.animationName === 'dsi-boot-out') end()
  }
  // If the animation never reports, for whatever reason, it still ends.
  const safety = setTimeout(end, 3000)

  window.addEventListener('keydown', skipKey, true)
  window.addEventListener('pointerdown', skip, true)
  document.addEventListener('animationend', onAnim)
  return { stop, end }
}

/**
 * The console as a small store: the state lives here, outside React, so a
 * trigger always sees the current state rather than the one from the last
 * render. That is what makes a second press during a transition ignorable.
 *
 * Each accepted move commits the new state first and only then runs its
 * effects, and nothing here touches the state after the effects. Under less
 * motion the launch and return swap synchronously, which sends the next
 * trigger from inside the first one's effects.
 */
function createConsole(env: ConsoleEnv) {
  let state = INITIAL
  let boot: ReturnType<typeof armBoot> | null = null
  const listeners = new Set<() => void>()

  const endBoot = () => {
    boot?.stop()
    boot = null
  }

  // Marks the visit as booted as soon as the boot starts, so a reload or a
  // trip back from plain view goes straight to the menu.
  const beginBoot = (arrived: boolean) => {
    // Going from display: none back to grid is what restarts its animations.
    // On arrival the layout's script has set it already.
    document.documentElement.dataset[BOOT_DATASET] = ''
    try {
      sessionStorage.setItem(BOOTED_KEY, '1')
    } catch {
      // Storage blocked: it just boots again next time.
    }
    boot = armBoot(() => send({ type: 'bootDone' }))
    if (!arrived) return
    // The fade is pure CSS and runs from first paint, so on a slow device it can
    // finish before hydration. Its animationend has gone by, so end it here
    // rather than leave an invisible boot swallowing input until the timer.
    const fade = document
      .getAnimations()
      .find(a => (a as CSSAnimation).animationName === 'dsi-boot-out')
    if (fade?.playState === 'finished') boot.end()
  }

  const run = (prev: ConsoleState, next: ConsoleState, t: Trigger) => {
    if (prev.phase === 'booting' && next.phase !== 'booting') endBoot()

    switch (t.type) {
      case 'arrive':
        if (next.phase === 'booting') beginBoot(true)
        break
      case 'power':
        writeHash(null)
        if (next.phase === 'booting') beginBoot(false)
        break
      case 'launch': {
        // Busy only until the swap. The white fading off afterwards is just
        // paint, and holding input through it dropped a quick Escape or Enter.
        playLaunch(t.icon, () => flushSync(() => send({ type: 'launched' })), animates()).catch(() => {
          // Failed before reaching the swap: let the next press through.
          send({ type: 'launchFailed' })
        })
        break
      }
      case 'launched':
        writeHash(next.app)
        break
      case 'back': {
        const from = document.querySelector('.dsi-device') ?? document.body
        playReturn(from, () => flushSync(() => send({ type: 'returned' })), animates()).catch(() => {
          send({ type: 'returnFailed' })
        })
        break
      }
      case 'returned':
        writeHash(null)
        break
    }
  }

  function send(t: Trigger) {
    const next = move(state, t, env)
    if (!next || next === state) return
    const prev = state
    state = next
    listeners.forEach(l => l())
    run(prev, next, t)
  }

  return {
    get: () => state,
    subscribe: (l: () => void) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    send,
    // Ends a boot still running when the page goes away.
    stop: () => boot?.end(),
  }
}

/**
 * The console for the page: its state, and the one function every trigger goes
 * through. Also tells it when the page arrives.
 */
export function useConsole() {
  const ref = useRef<ReturnType<typeof createConsole>>()
  if (!ref.current) ref.current = createConsole(ENV)
  const c = ref.current
  const state = useSyncExternalStore(c.subscribe, c.get, () => INITIAL)

  useEffect(() => {
    c.send({ type: 'arrive', booting: BOOT_DATASET in document.documentElement.dataset })
    return () => c.stop()
  }, [c])

  return [state, c.send] as const
}
