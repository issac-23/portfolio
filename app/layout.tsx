import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { SITE_URL, SOCIAL } from './site'
import './globals.css'

// Self-hosted from the @fontsource packages rather than fetched from Google:
// the build never needs the network, and visitors make no third-party
// request, wait on no render-blocking stylesheet and see no flash of fallback
// text. Exposed as CSS variables so Tailwind's font-serif and font-sans
// resolve to them. next/font/local reads its options statically, so they have
// to stay literals. adjustFontFallback picks the system face whose metrics the
// generated fallback is matched to.
const serif = localFont({
  src: [
    {
      path: '../node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-italic.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-serif',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
  fallback: ['Georgia', 'serif'],
})

const sans = localFont({
  src: [
    {
      path: '../node_modules/@fontsource/inter/files/inter-latin-300-normal.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
  adjustFontFallback: 'Arial',
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
