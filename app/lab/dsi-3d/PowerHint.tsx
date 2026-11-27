'use client'

import { useEffect, useRef, useState } from 'react'
import { getMotion } from '@/components/dsi/prefs'

type Lab = { powerPoint?: () => { x: number; y: number } | null }

// How far the label sits from the button, and how wide it is (for keeping it on screen).
const GAP = 22
const HALF_LABEL = 66
// The label goes left of the button when there is room there, else under it.
const ROOM_LEFT = 215

/**
 * "Press POWER", with an arrow, pointing at the model's power button while the
 * console is off. The 3D scene says where the button is on screen (powerPoint),
 * and this follows it each frame so it stays put through the opening, a window
 * resize or a drag. It is only a pointer: the screen-reader power button
 * already says it, so none of this is read out and none of it takes clicks.
 */
export default function PowerHint() {
  const anchor = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const [still, setStill] = useState(true)

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches || getMotion() === 'reduce')
  }, [])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = anchor.current
      const at = (window as unknown as { __dsiLab?: Lab }).__dsiLab?.powerPoint?.()
      if (el) {
        if (at) {
          el.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`
          el.dataset.side = at.x >= ROOM_LEFT ? 'left' : 'below'
          el.style.visibility = 'visible'
          // Under the button the label is centred on it; nudge it back on screen.
          const shift = Math.max(0, HALF_LABEL + 6 - at.x, at.x + HALF_LABEL + 6 - window.innerWidth) * (at.x < window.innerWidth / 2 ? 1 : -1)
          if (label.current) label.current.style.setProperty('--shift', `${shift}px`)
        } else {
          el.style.visibility = 'hidden'
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div ref={anchor} aria-hidden="true" data-testid="power-hint" data-side="left" data-still={still ? '' : undefined} className="power-hint pointer-events-none fixed left-0 top-0 z-40 invisible">
      <style>{`
        .power-hint .ph-inner { position: absolute; display: flex; align-items: center; gap: 2px; }
        .power-hint[data-side='left'] .ph-inner { right: ${GAP}px; top: 0; transform: translateY(-50%); }
        .power-hint[data-side='below'] .ph-inner { left: 0; top: ${GAP}px; transform: translateX(-50%); flex-direction: column-reverse; gap: 0; }
        .power-hint[data-side='below'] .ph-arrow { transform: rotate(-90deg); }
        .power-hint .ph-label { display: block; border-radius: 9999px; background: #0e4155; color: #fff; font: 600 13px/1 var(--font-sans, system-ui, sans-serif); letter-spacing: 0.02em; padding: 8px 14px; white-space: nowrap; box-shadow: 0 0 0 2px #fff, 0 3px 10px rgba(14, 65, 85, 0.35); }
        .power-hint[data-side='below'] .ph-label { transform: translateX(var(--shift, 0px)); }
        .power-hint .ph-bob { display: flex; }
        .power-hint[data-side='below'] .ph-bob { margin: 4px 0; }
        .power-hint .ph-arrow { display: block; width: 30px; height: 22px; flex: none; }
        @keyframes ph-nudge-left { from { translate: 0 0; } to { translate: 7px 0; } }
        @keyframes ph-nudge-below { from { translate: 0 0; } to { translate: 0 -7px; } }
        .power-hint:not([data-still]) .ph-bob { animation: ph-nudge-left 0.7s ease-in-out infinite alternate; }
        .power-hint[data-side='below']:not([data-still]) .ph-bob { animation-name: ph-nudge-below; }
      `}</style>
      <div className="ph-inner">
        <span ref={label} className="ph-label">
          Press POWER
        </span>
        <span className="ph-bob">
          <svg className="ph-arrow" viewBox="0 0 30 22" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11h22M17 3l8 8-8 8" stroke="#fff" strokeWidth="7" />
            <path d="M3 11h22M17 3l8 8-8 8" stroke="#0e4155" strokeWidth="3.5" />
          </svg>
        </span>
      </div>
    </div>
  )
}
