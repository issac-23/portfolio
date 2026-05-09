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

              <a
                href="https://github.com/issac-23"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-surface border border-border rounded-xl px-6 py-4 hover:border-accent group transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-muted group-hover:text-accent transition-colors flex-shrink-0">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <div>
                  <p className="text-xs text-muted mb-0.5">GitHub</p>
                  <p className="text-sm text-fg group-hover:text-accent transition-colors">
                    issac-23
                  </p>
                </div>
              </a>

              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-surface border border-border rounded-xl px-6 py-4 hover:border-accent group transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-accent transition-colors flex-shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                  <line x1="9" y1="17" x2="15" y2="17" />
                </svg>
                <div>
                  <p className="text-xs text-muted mb-0.5">Resume</p>
                  <p className="text-sm text-fg group-hover:text-accent transition-colors">
                    Download PDF
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
