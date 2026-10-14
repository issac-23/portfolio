'use client'

import { useEffect } from 'react'

/**
 * Arms the listeners that end the boot screen: when its fade finishes, or
 * straight away on any key or tap, so nobody has to sit through it. A key that
 * skips it is swallowed, rather than also moving the rail behind it, except
 * browser shortcuts (Ctrl/Cmd/Alt chords, F-keys), which still work. A tap
 * only ends the boot: its click still fires, so a tap on Resume or POWER
 * during the boot follows it. Returns a function that ends it early.
 *
 * Marks the visit as booted as soon as it starts, so a reload or a trip back
 * from plain view goes straight to the menu.
 */
function arm() {
  const root = document.documentElement
  try {
    sessionStorage.setItem('dsi-booted', '1')
  } catch {
    // Storage blocked: it just boots again next time.
  }

  const end = () => {
    delete root.dataset.boot
    window.removeEventListener('keydown', skipKey, true)
    window.removeEventListener('pointerdown', skip, true)
    document.removeEventListener('animationend', onAnim)
    clearTimeout(safety)
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
  return end
}

/** Plays the boot screen again, as when the console is switched back on. */
export function startBoot() {
  // Going from display: none back to grid is what restarts its animations.
  document.documentElement.dataset.boot = ''
  return arm()
}

/** Ends the boot screen that the layout's script started before first paint. */
export function useBoot() {
  useEffect(() => {
    if (!('boot' in document.documentElement.dataset)) return
    const end = arm()
    // The fade is pure CSS and runs from first paint, so on a slow device it can
    // finish before hydration. Its animationend has gone by, so end it here
    // rather than leave an invisible boot swallowing input until the timer.
    const fade = document
      .getAnimations()
      .find(a => (a as CSSAnimation).animationName === 'dsi-boot-out')
    if (fade?.playState === 'finished') end()
    return end
  }, [])
}
