import type { Metadata } from 'next'
import { M_PLUS_Rounded_1c } from 'next/font/google'
import './dsi.css'

// Self-hosted the same way the site's other faces are. The DSi's system font
// was a rounded gothic, and this is the closest Google Fonts carries.
const rounded = M_PLUS_Rounded_1c({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-rounded',
  display: 'swap',
  fallback: ['Trebuchet MS', 'system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'DSi Menu — Issac Ip',
  // Work in progress behind the real site. Index it at cutover, not before.
  robots: { index: false, follow: false },
}

export default function DsiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`dsi-root ${rounded.variable}`}
      style={{ fontFamily: 'var(--font-rounded)' }}
    >
      {children}
    </div>
  )
}
