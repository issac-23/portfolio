import { APPS, APP_BY_ID, type AppId } from './apps'

/**
 * Every app has an address, so a recruiter can be sent straight to the
 * projects (issac-ip.com/#projects) the way the reference site gives each
 * section its own URL. Addresses and the classic site's aliases are declared
 * on each app in apps.tsx.
 */

export function appFromHash(hash: string): AppId | null {
  const key = hash.replace(/^#/, '')
  if (!key) return null
  const app = APPS.find(a => a.hash === key) ?? APPS.find(a => a.aliases?.includes(key))
  return app?.id ?? null
}

/** Puts the open app in the address bar without adding a history entry. */
export function writeHash(id: AppId | null) {
  const url = id ? `#${APP_BY_ID[id].hash}` : `${location.pathname}${location.search}`
  history.replaceState(history.state, '', url)
}
