'use client'

import { useRef } from 'react'
import { AppLower, useListNav } from './screen'
import { rememberView } from './view'
import { setMotion, setTheme, useMotion, useTheme, type ThemeChoice } from './prefs'

const THEME_LABEL: Record<ThemeChoice, string> = { auto: 'Auto', light: 'Light Blue', dark: 'Matte Black' }
const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { auto: 'light', light: 'dark', dark: 'auto' }

const ROWS = [
  {
    title: 'Theme',
    about: 'The Light Blue shell or the matte black one. Auto follows your device.',
  },
  {
    title: 'Reduce motion',
    about: 'Turns off the launch zoom, the sliding rail and the photo slideshow, on top of whatever your device already asks for.',
  },
  {
    title: 'Plain view',
    about: 'Everything here as an ordinary page you can scroll, read and print. No DSi.',
  },
]

/** Upper screen: what the highlighted setting does. */
export function SettingInfo({ index }: { index: number }) {
  const row = ROWS[index]
  return (
    <div className="dsi-detail">
      <span className="dsi-sub">System Settings</span>
      <h2>{row.title}</h2>
      <p>{row.about}</p>
    </div>
  )
}

interface SettingsListProps {
  selected: number
  onSelect: (index: number) => void
  onBack: () => void
}

/**
 * Lower screen: the three settings. Each row is a single control, so the
 * arrows move between rows and Enter changes the one you are on.
 */
export function SettingsList({ selected, onSelect, onBack }: SettingsListProps) {
  const list = useRef<HTMLUListElement>(null)
  useListNav({ container: list, count: ROWS.length, selected, onSelect })
  const theme = useTheme()
  const motion = useMotion()
  const row = (i: number) => ({ 'data-idx': i, tabIndex: i === selected ? 0 : -1, onFocus: () => onSelect(i) })

  return (
    <AppLower onBack={onBack}>
      <ul className="dsi-cards dsi-settings" ref={list} aria-label="Settings">
        <li>
          <button
            type="button"
            className="dsi-card"
            data-sel={selected === 0 || undefined}
            onClick={() => setTheme(NEXT_THEME[theme])}
            {...row(0)}
          >
            <span className="dsi-card-text"><b>Theme</b></span>
            <span className="dsi-setting-value">{THEME_LABEL[theme]}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            role="switch"
            className="dsi-card"
            data-sel={selected === 1 || undefined}
            aria-checked={motion === 'reduce'}
            onClick={() => setMotion(motion === 'reduce' ? 'auto' : 'reduce')}
            {...row(1)}
          >
            <span className="dsi-card-text"><b>Reduce motion</b></span>
            <span className="dsi-switch" aria-hidden="true" />
          </button>
        </li>
        <li>
          <a className="dsi-card" href="/?view=plain" data-sel={selected === 2 || undefined} onClick={() => rememberView('plain')} {...row(2)}>
            <span className="dsi-card-text"><b>Plain view</b></span>
            <span className="dsi-setting-value" aria-hidden="true">Open ▸</span>
          </a>
        </li>
      </ul>
    </AppLower>
  )
}
