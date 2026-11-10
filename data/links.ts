/**
 * Whether a link leaves the site. Channels mix web links with mailto:, and
 * only the web ones should open in a new tab. One rule here, so the classic
 * page, the DSi screens and the plain view cannot disagree about it.
 */
/** The resume, as served from /public. Every screen links this one path. */
export const RESUME_PDF = '/resume.pdf'

/** What a link needs to open in a new tab, safely. */
export const newTabProps = { target: '_blank', rel: 'noopener noreferrer' } as const

export const isExternal = (href: string) => /^https?:/.test(href)

/** The attributes an anchor needs for `href`: a new tab for external links, nothing otherwise. */
export const externalProps = (href: string) =>
  isExternal(href) ? newTabProps : {}
