import type { MetadataRoute } from 'next'
import { SITE_URL } from './site'

/**
 * Served at /sitemap.xml.
 *
 * The site is a single page of anchored sections, so there is one entry. The
 * Spotify /callback route is deliberately absent — it's a dev-time OAuth
 * helper, not content (see app/callback/layout.tsx and robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
