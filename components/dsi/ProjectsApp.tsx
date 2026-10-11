'use client'

import { useEffect, useRef } from 'react'
import type { Project } from '@/data/projects'

const STATUS: Record<Project['status'], string> = {
  live: 'Live',
  wip: 'In progress',
  concept: 'Concept',
}

// Cartridge label colours, cycled. A project has no artwork of its own, so
// its card gets a colour and its initial, the way an unlabelled card would.
const LABELS: [string, string][] = [
  ['#ffe3c2', '#f2a65a'],
  ['#d9f0e3', '#7fc79c'],
  ['#e2e4fb', '#9aa3e6'],
  ['#fbe0ea', '#e98fb0'],
]

function CardArt({ project, index }: { project: Project; index: number }) {
  const [a, b] = LABELS[index % LABELS.length]
  return (
    <span className="dsi-card-art" style={{ background: `linear-gradient(180deg, ${a}, ${b})` }} aria-hidden="true">
      {project.title.charAt(0).toUpperCase()}
    </span>
  )
}

/** Upper screen: everything about the card under the cursor. */
export function ProjectDetail({ project, index }: { project: Project; index: number }) {
  return (
    <div className="dsi-detail">
      <div className="dsi-detail-head">
        <CardArt project={project} index={index} />
        <div>
          <h2>{project.title}</h2>
          <span className="dsi-badge" data-status={project.status}>{STATUS[project.status]}</span>
        </div>
      </div>
      <p>{project.description}</p>
      <ul className="dsi-tags" aria-label="Built with">
        {project.tags.map(t => <li key={t}>{t}</li>)}
      </ul>
    </div>
  )
}

interface ProjectListProps {
  projects: Project[]
  selected: number
  onSelect: (index: number) => void
  onBack: () => void
}

/**
 * Lower screen: the game card select. A list you move through, with the
 * actions for the selected card along the bottom where the DSi put its
 * buttons. It scrolls inside the screen, never the page.
 */
export function ProjectList({ projects, selected, onSelect, onBack }: ProjectListProps) {
  const list = useRef<HTMLUListElement>(null)
  const project = projects[selected]

  // Arrive with focus on the selected card, so the keyboard carries on from
  // the menu without a trip through the tab order.
  useEffect(() => {
    const row = list.current?.children[selected]?.querySelector('button')
    row?.focus({ preventScroll: true })
    // Only on arrival. Afterwards focus moves with the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onBack()
        return
      }
      const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
      if (!d) return
      e.preventDefault()
      const next = Math.min(projects.length - 1, Math.max(0, selected + d))
      onSelect(next)
      const row = list.current?.children[next]
      row?.querySelector('button')?.focus({ preventScroll: true })
      row?.scrollIntoView({ block: 'nearest' })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [projects.length, selected, onSelect, onBack])

  return (
    <div className="dsi-lower dsi-cards-screen">
      <ul className="dsi-cards" ref={list} aria-label="Game cards">
        {projects.map((p, i) => (
          <li key={p.title}>
            <button
              type="button"
              className="dsi-card"
              aria-pressed={i === selected}
              tabIndex={i === selected ? 0 : -1}
              onClick={() => onSelect(i)}
            >
              <CardArt project={p} index={i} />
              <span className="dsi-card-text">
                <b>{p.title}</b>
                <span>{p.tags.slice(0, 3).join(' · ')}</span>
              </span>
              <span className="dsi-card-status">{STATUS[p.status]}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="dsi-actions">
        {project.url ? (
          <a className="dsi-action dsi-action-go" href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${project.title} (new tab)`}>
            Open
          </a>
        ) : (
          // Greyed and saying why, rather than a dead link or a missing button.
          <span className="dsi-action" aria-disabled="true">No live link</span>
        )}
        {project.github ? (
          <a className="dsi-action" href={project.github} target="_blank" rel="noopener noreferrer" aria-label={`${project.title} on GitHub (new tab)`}>
            GitHub
          </a>
        ) : (
          <span className="dsi-action" aria-disabled="true">No repo</span>
        )}
        <button type="button" className="dsi-action" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}
