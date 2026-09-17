import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Not found — Issac Ip',
  robots: { index: false, follow: false },
}

/**
 * Replaces Next's unstyled default 404, which rendered as a bare white page
 * with no navigation and no way back into the site.
 *
 * Renders inside the root layout, so it inherits the fonts and the pre-paint
 * theme script and shows up correctly in light or dark.
 */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center px-6 py-24"
    >
      <div className="max-w-md w-full">
        <span className="text-xs text-accent tracking-widest uppercase font-medium">
          404
        </span>
        <h1
          className="text-4xl text-fg mt-3"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
        >
          This page doesn&apos;t exist
        </h1>
        <p className="text-muted leading-relaxed mt-4">
          The link may be broken, or the page may have moved. Everything on this
          site lives on the one page, so heading home is a safe bet.
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-8">
          <Link
            href="/"
            className="text-sm text-fg border border-border rounded-full px-4 py-2 hover:bg-surface transition-colors"
          >
            Back home
          </Link>
          <Link
            href="/#projects"
            className="text-sm text-accent hover:text-fg transition-colors"
          >
            See projects →
          </Link>
        </div>
      </div>
    </main>
  )
}
