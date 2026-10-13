import type { AppId } from './apps'

/**
 * Every app has an address, so a recruiter can be sent straight to the
 * projects (issac-ip.com/#projects) the way the reference site gives each
 * section its own URL.
 *
 * The classic site's section anchors are aliases, so links to /#about or
 * /#contact that are already out there on a resume or a profile still land
 * on the right thing.
 */

const HASH: Record<AppId, string> = {
  profile: 'profile',
  projects: 'projects',
  camera: 'camera',
  sound: 'sound',
  shelf: 'shelf',
  chat: 'chat',
  resume: 'resume',
  settings: 'settings',
}

const CLASSIC: Record<string, AppId> = {
  about: 'profile',
  music: 'sound',
  media: 'shelf',
  gallery: 'camera',
  contact: 'chat',
}

export function appFromHash(hash: string): AppId | null {
  const key = hash.replace(/^#/, '')
  if (!key) return null
  const own = (Object.keys(HASH) as AppId[]).find(id => HASH[id] === key)
  return own ?? CLASSIC[key] ?? null
}

/** Puts the open app in the address bar without adding a history entry. */
export function writeHash(id: AppId | null) {
  const url = id ? `#${HASH[id]}` : `${location.pathname}${location.search}`
  history.replaceState(history.state, '', url)
}
