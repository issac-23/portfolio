'use client'

import { useState, useEffect } from 'react'
import ThemeToggle from './ThemeToggle'

const links = [
  { label: 'About', href: '#about' },
  { label: 'Music', href: '#music' },
  { label: 'Media', href: '#media' },
  { label: 'Projects', href: '#projects' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Contact', href: '#contact' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        scrolled ? 'bg-bg/90 backdrop-blur-md border-border' : 'border-transparent'
      }`}
    >
      <nav className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
        <a
          href="#top"
          className="font-serif text-lg text-fg hover:text-accent transition-colors"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
        >
          Issac Ip
        </a>

        {/* Desktop */}
        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm text-muted hover:text-fg transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-block text-xs text-fg border border-border rounded-full px-3.5 py-1.5 hover:border-accent hover:text-accent transition-all"
          >
            Resume
          </a>
          <ThemeToggle />
          {/* Mobile toggle */}
          <button
          className="md:hidden text-muted hover:text-fg transition-colors p-1"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-bg/95 backdrop-blur-md border-b border-border">
          <ul className="max-w-4xl mx-auto px-6 py-4 flex flex-col gap-4">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-sm text-muted hover:text-fg transition-colors block py-1"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
