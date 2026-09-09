import type { Metadata } from 'next'

/**
 * page.tsx is a client component and so can't export metadata itself.
 *
 * This route is the Spotify OAuth redirect target — a dev-time helper for
 * minting a refresh token. It's publicly routable, so keep it out of search
 * results.
 */
export const metadata: Metadata = {
  title: 'Spotify auth callback',
  robots: { index: false, follow: false },
}

export default function CallbackLayout({ children }: { children: React.ReactNode }) {
  return children
}
