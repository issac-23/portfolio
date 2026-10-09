'use client'

import type { DsiApp } from './apps'

interface AppRailProps {
  apps: DsiApp[]
  selected: number
}

/**
 * The DSi's software list: one horizontal row, never a grid. The selected
 * tile grows and its caption becomes the blue START pill.
 */
export default function AppRail({ apps, selected }: AppRailProps) {
  return (
    <div className="dsi-viewport">
      <div className="dsi-rail" role="group" aria-label="Applications">
        {apps.map((app, i) => {
          const on = i === selected
          return (
            <button
              key={app.id}
              type="button"
              className="dsi-slot"
              aria-label={app.name}
              aria-current={on}
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
