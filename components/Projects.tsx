'use client'

import { useEffect, useRef } from 'react'
import { projects } from '@/data/projects'

// Colours resolve per theme so the badges stay legible in light mode too.
const statusLabel: Record<string, { text: string; color: string }> = {
  live:    { text: 'Live',        color: 'var(--status-ok)' },
  deployed:{ text: 'Deployed',    color: 'var(--status-ok)' },
  wip:     { text: 'In Progress', color: 'var(--accent)' },
  concept: { text: 'Concept',     color: 'var(--muted)' },
}

export default function Projects() {
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
    <section id="projects" ref={ref} className="section-fade py-24 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-[1fr_2fr] gap-12 items-start">

          <div>
            <span className="text-xs text-accent tracking-widest uppercase font-medium">Work</span>
            <h2
              className="text-3xl text-fg mt-3"
              style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
            >
              Projects
            </h2>
            <p className="text-muted text-sm mt-3 leading-relaxed">
              Things I&apos;ve built or am building.
            </p>
          </div>

          <div>
            {projects.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed p-12 text-center"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <p className="text-muted text-sm">Projects coming soon.</p>
                <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                  Add entries to <code className="text-accent">data/projects.ts</code> to populate this section.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project, i) => {
                  const s = statusLabel[project.status]
                  return (
                    <div
                      key={i}
                      className="bg-surface rounded-xl p-6 border border-border hover:bg-surface-2 lift-card group"
                      style={{ transitionDelay: `${i * 60}ms` }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="text-fg font-medium">{project.title}</h3>
                        <span
                          className="text-xs rounded-full px-2.5 py-0.5 flex-shrink-0"
                          style={{
                            color: s.color,
                            background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${s.color} 30%, transparent)`,
                          }}
                        >
                          {s.text}
                        </span>
                      </div>
                      <p className="text-muted text-sm leading-relaxed mb-4">{project.description}</p>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex flex-wrap gap-1.5">
                          {project.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs text-muted border border-border rounded-full px-2.5 py-0.5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-4">
                          {project.github && (
                            <a
                              href={project.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted hover:text-fg transition-colors"
                            >
                              GitHub →
                            </a>
                          )}
                          {project.url && (
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:text-fg transition-colors"
                            >
                              View live →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
