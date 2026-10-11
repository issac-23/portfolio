'use client'

import { useFollowSystemTheme } from './prefs'

/** Keeps /dsi in step with the OS theme while no choice has been made. */
export default function PrefsSync() {
  useFollowSystemTheme()
  return null
}
