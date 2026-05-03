'use client'

import { useEffect, useRef } from 'react'

export default function Contact() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) entry.target.classList.add('visible') },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="contact" ref={ref} className="section-fade py-24 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-[1fr_2fr] gap-12 items-start">

          <div>
            <span className="text-xs text-accent tracking-widest uppercase font-medium">Contact</span>
            <h2
              className="text-3xl text-fg mt-3"
              style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
            >
              Let&apos;s Talk
            </h2>
          </div>

          <div className="space-y-8">
            <p className="text-muted leading-relaxed">
              Whether you want to chat, collaborate, or just say hi — I&apos;m always down to connect.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:issacip23@gmail.com"
                className="inline-flex items-center gap-3 bg-surface border border-border rounded-xl px-6 py-4 hover:border-accent group transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-accent transition-colors flex-shrink-0">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <div>
                  <p className="text-xs text-muted mb-0.5">Email</p>
                  <p className="text-sm text-fg group-hover:text-accent transition-colors">
                    issacip23@gmail.com
                  </p>
                </div>
              </a>

              <a
                href="https://www.linkedin.com/in/issacip1/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-surface border border-border rounded-xl px-6 py-4 hover:border-accent group transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-accent transition-colors flex-shrink-0">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                <div>
                  <p className="text-xs text-muted mb-0.5">LinkedIn</p>
                  <p className="text-sm text-fg group-hover:text-accent transition-colors">
                    issacip1
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-24 pt-8 border-t border-border flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--muted)', opacity: 0.6 }}>© 2025 Issac Ip</p>
          <a href="#top" className="text-xs text-muted hover:text-fg transition-colors">
            Back to top ↑
          </a>
        </div>
      </div>
    </section>
  )
}
