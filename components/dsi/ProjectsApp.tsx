'use client'

import { useRef } from 'react'
import type { Project } from '@/data/projects'
import { AppLower, useListNav } from './screen'

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
  useListNav({ container: list, count: projects.length, selected, onSelect })

  return (
    <AppLower
      onBack={onBack}
      actions={[
        project.url
          ? { label: 'Open', name: `Open ${project.title} (new tab)`, href: project.url, primary: true }
          : { label: 'Open', unavailable: 'No live link' },
        project.github
          ? { label: 'GitHub', name: `${project.title} on GitHub (new tab)`, href: project.github }
          : { label: 'GitHub', unavailable: 'No repo' },
      ]}
    >
      <ul className="dsi-cards" ref={list} aria-label="Game cards">
        {projects.map((p, i) => (
          <li key={p.title}>
            <button
              type="button"
              className="dsi-card"
              data-idx={i}
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
    </AppLower>
  )
}
