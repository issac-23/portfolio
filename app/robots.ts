import type { MetadataRoute } from 'next'
import { SITE_URL } from './site'

/** Served at /robots.txt. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Neither is content: /callback is the Spotify OAuth helper and /api
        // only returns JSON.
        disallow: ['/callback', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
