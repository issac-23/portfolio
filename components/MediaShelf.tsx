'use client'

import { useEffect, useRef, useState } from 'react'
import { mediaItems, type MediaType } from '@/data/media'

const typeConfig: Record<string, { label: string; symbol: string }> = {
  all:     { label: 'All',       symbol: '◈' },
  article: { label: 'Articles',  symbol: '✦' },
  video:   { label: 'Videos',    symbol: '▶' },
  podcast: { label: 'Podcasts',  symbol: '◎' },
  book:    { label: 'Books',     symbol: '◻' },
  film:    { label: 'Film & TV', symbol: '◇' },
  other:   { label: 'Other',     symbol: '○' },
}

function Badge({ type }: { type: MediaType }) {
  const c = typeConfig[type] ?? typeConfig.other
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted border border-border rounded-full px-2.5 py-0.5">
      <span>{c.symbol}</span>
      {c.label}
    </span>
  )
}

export default function MediaShelf() {
  const [filter, setFilter] = useState('all')
  const ref = useRef<HTMLElement>(null)

  const availableTypes = ['all', ...Array.from(new Set(mediaItems.map((m) => m.type)))]
  const filtered = filter === 'all' ? mediaItems : mediaItems.filter((m) => m.type === filter)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) entry.target.classList.add('visible') },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="media" ref={ref} className="section-fade py-24 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-[1fr_2fr] gap-12 items-start">

          <div>
            <span className="text-xs text-accent tracking-widest uppercase font-medium">Media</span>
            <h2
              className="text-3xl text-fg mt-3"
              style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
            >
              What I&apos;ve Been Into
            </h2>
            <p className="text-muted text-sm mt-3 leading-relaxed">
              Things I&apos;ve been reading, watching, and listening to lately.
            </p>
          </div>

          <div>
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {availableTypes.map((type) => {
                const c = typeConfig[type] ?? typeConfig.other
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`text-xs rounded-full px-3 py-1.5 border transition-all ${
                      filter === type
                        ? 'border-accent text-accent'
                        : 'border-border text-muted hover:border-fg/30 hover:text-fg'
                    }`}
                    style={filter === type ? { background: 'rgba(200,149,108,0.1)' } : {}}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>

            {filtered.length === 0 ? (
              <p className="text-muted text-sm">Nothing here yet.</p>
            ) : (
              <div className="space-y-3 stagger-children visible">
                {filtered.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-surface rounded-xl p-5 border border-border hover:bg-surface-2 hover:border-border/60 transition-all group"
                    style={{ transitionDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge type={item.type} />
                          {item.date && (
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>{item.date}</span>
                          )}
                        </div>
                        <p className="text-fg font-medium group-hover:text-accent transition-colors">
                          {item.title}
                        </p>
                        <p className="text-sm text-muted mt-0.5">{item.creator}</p>
                        {item.note && (
                          <p className="text-xs text-muted mt-2 italic" style={{ opacity: 0.7 }}>
                            &ldquo;{item.note}&rdquo;
                          </p>
                        )}
                      </div>
                      <svg
                        className="text-border group-hover:text-accent transition-colors flex-shrink-0 mt-1"
                        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <path d="M7 17L17 7M17 7H7M17 7v10" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
