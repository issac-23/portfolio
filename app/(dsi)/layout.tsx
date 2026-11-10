import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { bootScript, motionScript } from '@/components/dsi/console'
import PrefsSync from '@/components/dsi/PrefsSync'
import './dsi.css'

// Self-hosted the same way the site's other faces are. The DSi's system font
// was a rounded gothic, and this is the closest the @fontsource packages
// carry. Latin only, as before.
const rounded = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/m-plus-rounded-1c/files/m-plus-rounded-1c-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/m-plus-rounded-1c/files/m-plus-rounded-1c-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/m-plus-rounded-1c/files/m-plus-rounded-1c-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/m-plus-rounded-1c/files/m-plus-rounded-1c-latin-800-normal.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-rounded',
  display: 'swap',
  // None of next/font's presets match this face, so it cannot build a
  // matched fallback itself. dsi.css declares one instead.
  adjustFontFallback: false,
  fallback: ['M PLUS Rounded Fallback', 'Trebuchet MS', 'system-ui', 'sans-serif'],
})

// The home page now, so it takes the root layout's title and description
// and is indexed. Plain view (?view=plain) is the same content, so both point
// search engines at / as the one canonical address.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function DsiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`dsi-root ${rounded.variable}`}
      style={{ fontFamily: 'var(--font-rounded)' }}
    >
      <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      <PrefsSync />
      {children}
    </div>
  )
}
