'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { DsiApp } from './apps'

const COPIES = 3
const SETTLE_MS = 320

const mod = (n: number, m: number) => ((n % m) + m) % m

interface AppRailProps {
  apps: DsiApp[]
  /** Reports the selected app's index into `apps`, not the slot index. */
  onChange?: (index: number) => void
}

/**
 * The DSi's software list: one horizontal row that runs off both edges.
 *
 * It holds three copies of the apps so there is always something either side
 * of the selection. `pos` is a slot in that tripled row, and it gets pulled
 * back into the middle copy whenever it wanders out. The copies are
 * identical, so the jump is invisible.
 *
 * Only the middle copy is real to assistive tech and the tab order. The other
 * two are scenery, so a screen reader hears eight apps rather than
 * twenty-four.
 */
export default function AppRail({ apps, onChange }: AppRailProps) {
  const N = apps.length
  const [pos, setPos] = useState(N)
  const posRef = useRef(N)
  const animate = useRef(false)
  const settle = useRef<ReturnType<typeof setTimeout>>()
  const rail = useRef<HTMLDivElement>(null)

  const logical = mod(pos, N)

  useEffect(() => {
    onChange?.(logical)
  }, [logical, onChange])

  const centre = (anim: boolean) => {
    const el = rail.current
    const slot = el?.children[posRef.current] as HTMLElement | undefined
    if (!el || !slot) return
    // offsetLeft is measured against the rail, which is position: relative.
    const view = el.parentElement?.clientWidth ?? 0
    // Whole pixels, so the icons and their captions render crisp rather
    // than blurring across a half-pixel boundary.
    const x = Math.round(view / 2 - (slot.offsetLeft + slot.offsetWidth / 2))
    if (!anim) el.style.transition = 'none'
    el.style.transform = `translateX(${x}px)`
    if (!anim) {
      void el.offsetWidth
      el.style.transition = ''
    }
  }

  // First placement snaps; after that, place() says whether to slide.
  useLayoutEffect(() => {
    centre(animate.current)
  }, [pos])

  useEffect(() => {
    const onResize = () => centre(false)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(settle.current)
    }
  }, [])

  const place = (p: number, anim: boolean) => {
    posRef.current = p
    animate.current = anim
    setPos(p)
  }

  const rebase = () => {
    const p = posRef.current
    const mid = N + mod(p, N)
    if (mid !== p) flushSync(() => place(mid, false))
  }

  const select = (target: number) => {
    const delta = target - posRef.current
    // Pull back into the middle copy before moving, not only after. Waiting
    // for the settle timer alone lets a held arrow key, which repeats faster
    // than the timer, walk straight off the end of the rail.
    rebase()
    place(posRef.current + delta, true)
    clearTimeout(settle.current)
    settle.current = setTimeout(rebase, SETTLE_MS)
  }

  const slots = []
  for (let c = 0; c < COPIES; c++) {
    const real = c === 1
    for (let i = 0; i < N; i++) {
      const app = apps[i]
      const n = c * N + i
      const sel = n === pos
      slots.push(
        <button
          key={n}
          type="button"
          className="dsi-slot"
          data-sel={sel || undefined}
          aria-hidden={real ? undefined : true}
          tabIndex={real ? undefined : -1}
          aria-label={real ? app.name : undefined}
          aria-current={real ? i === logical : undefined}
          // Scenery slots must not take focus on click: they are hidden from
          // assistive tech, and a focused hidden element is a dead end.
          onMouseDown={real ? undefined : e => e.preventDefault()}
          onClick={() => select(n)}
        >
          <span
            className="dsi-ico"
            style={{ background: `linear-gradient(180deg, ${app.face[0]}, ${app.face[1]})` }}
          >
            <app.Glyph />
          </span>
          <span className="dsi-cap" aria-hidden="true">{sel ? 'START' : app.short}</span>
        </button>,
      )
    }
  }

  return (
    <div className="dsi-viewport">
      <div className="dsi-rail" ref={rail} role="group" aria-label="Applications">
        {slots}
      </div>
    </div>
  )
}
