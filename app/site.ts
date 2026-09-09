/**
 * Canonical site origin, in one place.
 *
 * metadataBase, the sitemap, and robots.txt all need this as an absolute URL.
 * Keeping it here means the domain can't drift between them — it was already
 * wrong in metadataBase once.
 *
 * Note the www: that's the host the site actually serves from.
 */
export const SITE_URL = 'https://www.issac-ip.com'

export const SOCIAL = {
  github: 'https://github.com/issac-23',
  linkedin: 'https://www.linkedin.com/in/issacip1/',
} as const
