'use client'

import { useLayoutEffect, useRef } from 'react'
import type { DsiApp } from './apps'

interface AppRailProps {
  apps: DsiApp[]
  selected: number
  onSelect: (index: number) => void
}

/**
 * The DSi's software list: one horizontal row, never a grid. The selected
 * tile grows and its caption becomes the blue START pill, and the rail slides
 * so that tile sits dead centre.
 */
export default function AppRail({ apps, selected, onSelect }: AppRailProps) {
  const rail = useRef<HTMLDivElement>(null)
  const placed = useRef(false)

  useLayoutEffect(() => {
    const el = rail.current
    if (!el) return

    const centre = (animate: boolean) => {
      const slot = el.children[selected] as HTMLElement | undefined
      if (!slot) return
      // offsetLeft is measured against the rail, which is position: relative.
      // Against any other ancestor the selected tile lands clipped at the
      // left edge instead of in the middle.
      const view = el.parentElement?.clientWidth ?? 0
      const x = view / 2 - (slot.offsetLeft + slot.offsetWidth / 2)
      if (!animate) el.style.transition = 'none'
      el.style.transform = `translateX(${x}px)`
      if (!animate) {
        void el.offsetWidth
        el.style.transition = ''
      }
    }

    // First placement snaps rather than slides, so the rail does not swoop
    // in from the left edge on page load.
    centre(placed.current)
    placed.current = true

    const onResize = () => centre(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [selected])

  return (
    <div className="dsi-viewport">
      <div className="dsi-rail" ref={rail} role="group" aria-label="Applications">
        {apps.map((app, i) => {
          const on = i === selected
          return (
            <button
              key={app.id}
              type="button"
              className="dsi-slot"
              aria-label={app.name}
              aria-current={on}
              onClick={() => onSelect(i)}
            >
              <span
                className="dsi-ico"
                style={{ background: `linear-gradient(180deg, ${app.face[0]}, ${app.face[1]})` }}
              >
                <app.Glyph />
              </span>
              <span className="dsi-cap">{on ? 'START' : app.short}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
