import type { MetadataRoute } from 'next'
import { SITE_URL } from './site'

/**
 * Served at /sitemap.xml.
 *
 * One entry: / is the DSi, and its apps are #addresses on it, not pages.
 * /classic is left out on purpose, it is not indexed.
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
