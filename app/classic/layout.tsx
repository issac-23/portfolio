import type { Metadata } from 'next'

// The site as it was before the DSi took over /. Kept reachable for anyone
// who had it bookmarked, but not indexed: / is the canonical home now, and
// plain view at /?view=plain is the no-theme version of the same content.
export const metadata: Metadata = {
  title: 'Classic — Issac Ip',
  robots: { index: false, follow: true },
}

export default function ClassicLayout({ children }: { children: React.ReactNode }) {
  return children
}
