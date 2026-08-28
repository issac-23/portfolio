import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.issac-ip.com'),
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

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F2ED' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0A09' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Sets the theme before first paint: stored choice wins, else the OS preference. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':!window.matchMedia||window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){document.documentElement.classList.add('dark')}})()` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <a href="#about" className="skip-link">
          Skip to content
        </a>
        {children}
        {/* No-ops locally — only reports from the deployed site. */}
        <Analytics />
      </body>
    </html>
  )
}
