import { APPS, APP_BY_ID, type AppId } from './apps'

/**
 * Every app has an address, so a recruiter can be sent straight to the
 * projects (issac-ip.com/#projects) the way the reference site gives each
 * section its own URL. Addresses and the old site's aliases are declared
 * on each app in apps.tsx.
 */

/**
 * Every anchor that opens an app: each app's address and its aliases. The
 * layout's pre-paint script is built from this list, so it skips the boot for
 * exactly the hashes appFromHash resolves.
 */
export const APP_HASHES: readonly string[] = APPS.flatMap(a => [a.hash, ...(a.aliases ?? [])])

/**
 * Plain view's section id for each hash that has one, aliases included. The
 * layout's redirect script is built from this, so a deep link survives the
 * switch to plain view. Resume and Settings have no plain section.
 */
export const PLAIN_SECTIONS: Readonly<Record<string, string>> = Object.fromEntries(
  APPS.flatMap(({ hash, aliases = [], plain }) =>
    plain === undefined ? [] : [hash, ...aliases].map((h): [string, string] => [h, plain]),
  ),
)

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
