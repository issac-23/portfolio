'use client'

import { useEffect, useSyncExternalStore } from 'react'

/**
 * The settings System Settings can change, kept where the rest of the site
 * already keeps them so a choice made in one place holds everywhere.
 *
 * Theme is the site's own: `theme` in localStorage and the .dark class on
 * <html>, exactly as ThemeToggle on / writes them. Motion is new, and lives
 * as data-motion on <html> so CSS can see it before React is running.
 */

export type ThemeChoice = 'auto' | 'light' | 'dark'
export type MotionChoice = 'auto' | 'reduce'

const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Private mode or blocked storage: the choice still applies to this visit.
  }
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function getTheme(): ThemeChoice {
  const t = read('theme')
  return t === 'light' || t === 'dark' ? t : 'auto'
}

export function setTheme(choice: ThemeChoice) {
  write('theme', choice === 'auto' ? null : choice)
  document.documentElement.classList.toggle('dark', choice === 'auto' ? systemDark() : choice === 'dark')
  emit()
}

export function getMotion(): MotionChoice {
  return read('dsi-motion') === 'reduce' ? 'reduce' : 'auto'
}

export function setMotion(choice: MotionChoice) {
  write('dsi-motion', choice === 'reduce' ? 'reduce' : null)
  if (choice === 'reduce') document.documentElement.dataset.motion = 'reduce'
  else delete document.documentElement.dataset.motion
  emit()
}

/** True when either the device or the setting asks for less motion. */
export function lessMotion() {
  return document.documentElement.dataset.motion === 'reduce' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => 'auto' as ThemeChoice)
}

export function useMotion() {
  return useSyncExternalStore(subscribe, getMotion, () => 'auto' as MotionChoice)
}

/**
 * Follows the OS between light and dark until the visitor picks one, the
 * same as ThemeToggle does on /. The first paint is already right, from the
 * root layout's inline script; this only covers a change mid-visit.
 */
export function useFollowSystemTheme() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => {
      if (getTheme() !== 'auto') return
      document.documentElement.classList.toggle('dark', e.matches)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
}
