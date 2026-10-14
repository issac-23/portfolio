'use client'

import { useRef } from 'react'
import { mediaTypeLabels, type MediaItem } from '@/data/media'
import { AppLower, useListNav } from './screen'

/** Upper screen: the selected item, with my note on it as the centrepiece. */
export function ShelfItem({ item }: { item: MediaItem }) {
  return (
    <div className="dsi-detail">
      <span className="dsi-sub">
        {mediaTypeLabels[item.type].one}
        {item.date ? ` · ${item.date}` : ''}
      </span>
      <h2>{item.title}</h2>
      <span className="dsi-sub">by {item.creator}</span>
      {item.note && <blockquote className="dsi-note">{item.note}</blockquote>}
    </div>
  )
}

interface ShelfListProps {
  items: MediaItem[]
  selected: number
  onSelect: (index: number) => void
  onBack: () => void
}

/** Lower screen: everything on the shelf, newest first. */
export function ShelfList({ items, selected, onSelect, onBack }: ShelfListProps) {
  const list = useRef<HTMLUListElement>(null)
  useListNav({ container: list, count: items.length, selected, onSelect })
  const item = items[selected]

  return (
    <AppLower
      onBack={onBack}
      actions={[{ label: 'Open', name: `Open ${item.title} (new tab)`, href: item.url, primary: true }]}
    >
      <ul className="dsi-cards" ref={list} aria-label="Shelf">
        {items.map((m, i) => (
          <li key={m.url}>
            <button
              type="button"
              className="dsi-card"
              data-idx={i}
              aria-pressed={i === selected}
              tabIndex={i === selected ? 0 : -1}
              onClick={() => onSelect(i)}
            >
              <span className="dsi-card-text">
                <b>{m.title}</b>
                <span>{m.creator}</span>
              </span>
              <span className="dsi-card-status">{mediaTypeLabels[m.type].one}</span>
            </button>
          </li>
        ))}
      </ul>
    </AppLower>
  )
}
