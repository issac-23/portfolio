import type { ReactElement } from 'react'
import { projects } from '@/data/projects'
import { galleryPhotos } from '@/data/gallery'

// Two-tone glyphs rather than outlines, so they read as tile artwork.
export const Person = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8.3" r="3.7" fill="#38525f" />
    <path d="M5.2 20.4c.7-3.9 3.4-6.1 6.8-6.1s6.1 2.2 6.8 6.1z" fill="#38525f" />
  </svg>
)
export const Card = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6" y="3" width="12" height="18" rx="1.6" fill="#4a3c6b" />
    <path d="M9.6 3h4.8v4.4H9.6z" fill="#cdbff0" />
    <rect x="8.6" y="12.4" width="6.8" height="1.6" rx=".8" fill="#cdbff0" />
    <rect x="8.6" y="15.6" width="4.2" height="1.6" rx=".8" fill="#9f8dc8" />
  </svg>
)
export const Camera = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.6 7.6h4.6l1.6-2.3h6.4l1.6 2.3h4.6v11.2H2.6z" fill="#8a3f5c" />
    <circle cx="12" cy="13.2" r="4" fill="#f6d7e3" />
    <circle cx="12" cy="13.2" r="2.1" fill="#8a3f5c" />
    <rect x="18" y="9" width="2.4" height="1.5" rx=".7" fill="#f6d7e3" />
  </svg>
)
export const Note = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9.4 17.6V5.2l10-1.9v12.4z" fill="#2f6b3c" />
    <circle cx="6.9" cy="17.6" r="2.8" fill="#2f6b3c" />
    <circle cx="16.9" cy="15.7" r="2.8" fill="#2f6b3c" />
    <path d="M9.4 7.6l10-1.9v2.1l-10 1.9z" fill="#bce8bf" />
  </svg>
)
export const Book = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.6" y="4.2" width="5.4" height="15.6" rx="1" fill="#8a5f1c" />
    <rect x="10" y="4.2" width="4.2" height="15.6" rx="1" fill="#c08a2e" />
    <path d="m16.4 5.6 3.4 1-3.4 13.1-3.4-1z" fill="#8a5f1c" />
    <rect x="4.9" y="7" width="2.8" height="1.4" rx=".7" fill="#f3dca8" />
  </svg>
)
export const Chat = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.4 4.6h17.2v11.2H9.4L3.9 19.6z" fill="#a85c18" />
    <rect x="6.6" y="8" width="10.4" height="1.7" rx=".85" fill="#ffe2bd" />
    <rect x="6.6" y="11.3" width="6.2" height="1.7" rx=".85" fill="#ffd0a0" />
  </svg>
)
export const Doc = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5.8 2.8h8.4L18.6 7v14.2H5.8z" fill="#36567a" />
    <path d="M14.2 2.8 18.6 7h-4.4z" fill="#bcd6ef" />
    <rect x="8.3" y="11.6" width="8" height="1.5" rx=".75" fill="#bcd6ef" />
    <rect x="8.3" y="14.8" width="8" height="1.5" rx=".75" fill="#bcd6ef" />
    <rect x="8.3" y="18" width="4.4" height="1.5" rx=".75" fill="#8db0d4" />
  </svg>
)
export const Wrench = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15.3 3.6a5.3 5.3 0 0 0-6.2 7L3.3 16.4a2.1 2.1 0 1 0 2.9 2.9l5.8-5.8a5.3 5.3 0 0 0 7-6.2l-3.1 3.1-2.7-2.7z" fill="#5a6166" />
    <circle cx="5" cy="17.7" r="1.1" fill="#dfe4e7" />
  </svg>
)

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * What each app is, in rail order, declared once: the id type, the rail, the
 * addresses and the names are all read from `REGISTRY`. Adding or renaming an
 * app is one entry here plus its screen in screens.tsx, which is typed to
 * need one for every id, so forgetting it does not compile.
 *
 * This file imports no app's screen, so a screen can take its own glyph or
 * `plural` from here without a cycle (screens.tsx imports the screens and
 * this file, never the other way). It also has no browser-only imports, so
 * the e2e helper can read the names from it.
 *
 * Counts come from the data files, so adding a project or photo updates the
 * menu without anyone remembering to touch this list.
 */
interface AppDef {
  id: string
  /** Shown in the name box, the way the DSi printed a title. */
  name: string
  /** Second line of the name box, where the DSi put the publisher. */
  publisher: string
  /** Caption under the icon when it is not selected. */
  short: string
  /** Top and bottom stops of the tile gradient. */
  face: readonly [string, string]
  Glyph: () => ReactElement
  /**
   * The app's address (issac-ip.com/#projects), so a recruiter can be sent
   * straight to it the way the reference site gives each section its own URL.
   */
  hash: string
  /**
   * Other anchors that land here: the classic site's section names, so links
   * to /#about or /#contact already out on a resume or a profile still work.
   */
  aliases?: readonly string[]
}

const REGISTRY = [
  {
    id: 'profile',
    name: 'Profile',
    publisher: 'Issac Ip',
    short: 'Profile',
    face: ['#fdfdfd', '#c9d3da'],
    Glyph: Person,
    hash: 'profile',
    aliases: ['about'],
  },
  {
    id: 'projects',
    name: 'Projects',
    publisher: plural(projects.length, 'Game Card', 'Game Cards'),
    short: 'Projects',
    face: ['#e9e2f6', '#b7a7d8'],
    Glyph: Card,
    hash: 'projects',
  },
  {
    id: 'camera',
    name: 'Nintendo DSi Camera',
    publisher: plural(galleryPhotos.length, 'photo', 'photos'),
    short: 'Camera',
    face: ['#ffe9f1', '#f2aec8'],
    Glyph: Camera,
    hash: 'camera',
    aliases: ['gallery'],
  },
  {
    id: 'sound',
    name: 'Nintendo DSi Sound',
    publisher: 'Live from Spotify',
    short: 'Sound',
    face: ['#e4f6e2', '#9ed59a'],
    Glyph: Note,
    hash: 'sound',
    aliases: ['music'],
  },
  {
    id: 'shelf',
    name: 'Shelf',
    publisher: 'Articles, podcasts, video',
    short: 'Shelf',
    face: ['#fff2d9', '#f0ca85'],
    Glyph: Book,
    hash: 'shelf',
    aliases: ['media'],
  },
  {
    id: 'chat',
    name: 'Contact',
    publisher: 'Say hi',
    short: 'Contact',
    face: ['#ffeede', '#f5b878'],
    Glyph: Chat,
    hash: 'chat',
    aliases: ['contact'],
  },
  {
    id: 'resume',
    name: 'Resume',
    publisher: 'Instruction booklet',
    short: 'Resume',
    face: ['#e7f1fb', '#a9c6e4'],
    Glyph: Doc,
    hash: 'resume',
  },
  {
    id: 'settings',
    name: 'System Settings',
    publisher: 'Theme, motion, sound',
    short: 'Settings',
    face: ['#f1f3f4', '#bcc4ca'],
    Glyph: Wrench,
    hash: 'settings',
  },
] as const satisfies readonly AppDef[]

export type AppId = (typeof REGISTRY)[number]['id']

/** An app's accessible name, as the rail and the name box show it. */
export type AppName = (typeof REGISTRY)[number]['name']

/** One app's entry, with `id` narrowed to the ids that exist. */
export type DsiApp = AppDef & { id: AppId }

/** Every app, in rail order. */
export const APPS: readonly DsiApp[] = REGISTRY

/** Looks an app up by id; total, because `AppId` is read from the entries. */
export const APP_BY_ID = Object.fromEntries(APPS.map(a => [a.id, a])) as Record<AppId, DsiApp>

/** An app's position on the rail. */
export const railIndex = (id: AppId) => APPS.findIndex(a => a.id === id)
