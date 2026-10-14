'use client'

import Image from 'next/image'
import { useRef } from 'react'
import type { GalleryPhoto } from '@/data/gallery'
import { AppLower, useListNav } from './screen'

/**
 * DSi Camera's album: thumbnails on the lower screen, and the one you tap
 * fills the top screen, which is how the real album viewer worked.
 */

const COLS = 4

/** Upper screen: the selected photo, letterboxed over a blur of itself. */
export function PhotoView({ photo, index, total }: { photo: GalleryPhoto; index: number; total: number }) {
  const sizes = '(max-width: 620px) 76vw, 640px'
  return (
    <div className="dsi-photo">
      <div className="dsi-photo-shot" key={photo.src}>
        <Image src={photo.src} alt="" fill sizes={sizes} className="dsi-photo-back" />
        <Image src={photo.src} alt={photo.alt ?? 'Gallery photo'} fill sizes={sizes} className="dsi-photo-front" />
      </div>
      <div className="dsi-photo-tag">
        <span>{index + 1} / {total}</span>
        <span>{photo.caption}</span>
      </div>
    </div>
  )
}

interface AlbumProps {
  photos: GalleryPhoto[]
  selected: number
  onSelect: (index: number) => void
  onBack: () => void
}

/** Lower screen: the album grid. Arrows move in two dimensions. */
export function Album({ photos, selected, onSelect, onBack }: AlbumProps) {
  const grid = useRef<HTMLUListElement>(null)
  useListNav({ container: grid, count: photos.length, selected, onSelect, cols: COLS })
  const photo = photos[selected]

  return (
    <AppLower
      onBack={onBack}
      actions={[{ label: 'Full size', name: 'Full size photo (new tab)', href: photo.src, external: true }]}
    >
      <ul className="dsi-album" ref={grid} aria-label="Album">
        {photos.map((p, i) => (
          <li key={p.src}>
            <button
              type="button"
              className="dsi-thumb"
              data-idx={i}
              aria-pressed={i === selected}
              aria-label={p.alt ?? `Photo ${i + 1}`}
              tabIndex={i === selected ? 0 : -1}
              onClick={() => onSelect(i)}
            >
              <Image src={p.src} alt="" fill sizes="96px" />
            </button>
          </li>
        ))}
      </ul>
    </AppLower>
  )
}
