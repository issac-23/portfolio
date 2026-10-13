import type { Metadata } from 'next'
import { M_PLUS_Rounded_1c } from 'next/font/google'
import PrefsSync from '@/components/dsi/PrefsSync'
import './dsi.css'

// Self-hosted the same way the site's other faces are. The DSi's system font
// was a rounded gothic, and this is the closest Google Fonts carries.
const rounded = M_PLUS_Rounded_1c({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-rounded',
  display: 'swap',
  // next/font has no metric overrides for this face, so it cannot build a
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

// Applies the stored motion choice before the device paints, the way the
// root layout does for the theme, so a visitor who turned motion off never
// sees one frame of it.
const motionScript = `(function(){try{if(localStorage.getItem('dsi-motion')==='reduce')document.documentElement.dataset.motion='reduce'}catch(e){}})()`

export default function DsiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`dsi-root ${rounded.variable}`}
      style={{ fontFamily: 'var(--font-rounded)' }}
    >
      <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      <PrefsSync />
      {children}
    </div>
  )
}
