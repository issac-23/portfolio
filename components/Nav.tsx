'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [active, setActive] = useState('#top')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ids = ['top', ...links.map((l) => l.href.slice(1))]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(`#${visible.target.id}`)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] }
    )

    ids.forEach((id) => {
      const node = document.getElementById(id)
      if (node) observer.observe(node)
    })

    return () => observer.disconnect()
  }, [])

  // React 18 drops the `inert` prop, so set it on the node directly
  useEffect(() => {
    const node = menuRef.current
    if (!node) return
    if (open) node.removeAttribute('inert')
    else node.setAttribute('inert', '')
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        scrolled ? 'bg-bg/90 backdrop-blur-md border-border' : 'border-transparent'
      }`}
    >
      <div className="px-6">
        <nav className="max-w-4xl mx-auto py-5 flex items-center justify-between">
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
                  aria-current={active === l.href ? 'true' : undefined}
                  className={`text-sm transition-colors ${
                    active === l.href ? 'text-fg' : 'text-muted hover:text-fg'
                  }`}
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
              className="md:hidden text-muted hover:text-fg transition-colors p-2 -mr-2"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <span className="t-icon-swap w-[18px] h-[18px]">
                <svg data-state={open ? 'in' : 'out'} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                <svg data-state={open ? 'out' : 'in'} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`md:hidden bg-bg/95 backdrop-blur-md border-b border-border overflow-hidden ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{
          transition:
            'max-height var(--duration-medium) var(--ease-smooth-out), opacity var(--duration-quick) var(--ease-in-out)',
        }}
      >
        <div className="px-6">
          <ul className="max-w-4xl mx-auto py-4 flex flex-col gap-4">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={active === l.href ? 'true' : undefined}
                  className={`text-sm transition-colors block py-1 ${
                    active === l.href ? 'text-fg' : 'text-muted hover:text-fg'
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted hover:text-fg transition-colors block py-1"
                onClick={() => setOpen(false)}
              >
                Resume
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}
