import type { Metadata, Viewport } from 'next'
import { DM_Serif_Display, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SITE_URL, SOCIAL } from './site'
import './globals.css'

// Self-hosted at build time rather than fetched from Google on every visit:
// no third-party request, no render-blocking stylesheet, and no flash of
// fallback text. Exposed as CSS variables so Tailwind's font-serif and
// font-sans resolve to them.
const serif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
})

const sans = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Issac Ip — CS + Economics @ Northeastern',
  description:
    'Issac Ip — CS + Economics at Northeastern University. Projects, photography, and what I’m listening to and reading.',
  openGraph: {
    type: 'website',
    title: 'Issac Ip — CS + Economics @ Northeastern',
    description:
      'Projects, photography, and what I’m listening to and reading.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Issac Ip — CS + Economics @ Northeastern',
    description:
      'Projects, photography, and what I’m listening to and reading.',
    images: ['/og.png'],
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

/**
 * Person schema, so search engines treat "Issac Ip" as an entity with a school
 * and known profiles rather than inferring it from page copy.
 *
 * Email is deliberately left out — it's already on the page as a mailto, and
 * putting it here just makes it easier to harvest.
 */
const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Issac Ip',
  url: SITE_URL,
  image: `${SITE_URL}/og.png`,
  description: 'CS + Economics student at Northeastern University.',
  affiliation: {
    '@type': 'CollegeOrUniversity',
    name: 'Northeastern University',
  },
  knowsAbout: ['Computer Science', 'Economics', 'Software Engineering'],
  sameAs: [SOCIAL.github, SOCIAL.linkedin],
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F2ED' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0A09' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${serif.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets the theme before first paint: stored choice wins, else the OS preference. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':!window.matchMedia||window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){document.documentElement.classList.add('dark')}})()` }} />
      </head>
      <body className="font-sans">
        {/* Targets #main-content, which every route renders, rather than
            #about, which only the home page has. This link lives in the root
            layout, so pointing it at a home-page section made it the first
            thing a keyboard user reached on the 404 page and also a no-op. */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        {/* No-ops locally — only reports from the deployed site. */}
        <Analytics />
      </body>
    </html>
  )
}
