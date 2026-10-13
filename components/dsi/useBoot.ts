'use client'

import { useEffect } from 'react'

/**
 * Ends the boot screen: when its fade finishes, or straight away on any key
 * or tap, so nobody has to sit through it. The key or tap that skips it is
 * swallowed, rather than also moving the rail behind it.
 *
 * Marks the visit as booted as soon as it starts, so a reload or a trip back
 * from plain view goes straight to the menu.
 */
export function useBoot() {
  useEffect(() => {
    const root = document.documentElement
    if (!('boot' in root.dataset)) return
    try {
      sessionStorage.setItem('dsi-booted', '1')
    } catch {
      // Storage blocked: it just boots again next time.
    }

    const end = () => {
      delete root.dataset.boot
      window.removeEventListener('keydown', skip, true)
      window.removeEventListener('pointerdown', skip, true)
      document.removeEventListener('animationend', onAnim)
      clearTimeout(safety)
    }
    const skip = (e: Event) => {
      e.preventDefault()
      e.stopImmediatePropagation()
      end()
    }
    const onAnim = (e: AnimationEvent) => {
      if (e.animationName === 'dsi-boot-out') end()
    }
    // If the animation never reports, for whatever reason, it still ends.
    const safety = setTimeout(end, 3000)

    window.addEventListener('keydown', skip, true)
    window.addEventListener('pointerdown', skip, true)
    document.addEventListener('animationend', onAnim)
    return end
  }, [])
}
