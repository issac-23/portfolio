/**
 * Whether a link leaves the site. Channels mix web links with mailto:, and
 * only the web ones should open in a new tab. One rule here, so the classic
 * page, the DSi screens and the plain view cannot disagree about it.
 */
export const isExternal = (href: string) => /^https?:/.test(href)

/** The attributes an anchor needs for `href`: a new tab for external links, nothing otherwise. */
export const externalProps = (href: string) =>
  isExternal(href) ? ({ target: '_blank', rel: 'noopener noreferrer' } as const) : {}
