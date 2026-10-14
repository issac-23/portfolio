'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { GalleryPhoto } from '@/data/gallery'
import { lessMotion, useMotion } from './prefs'

const INTERVAL = 5000
// Each photo fades in over 0.6s (.dsi-photo-shot). Clicks closer together
// than that would cut the fade off half way, so they are ignored.
const MIN_GAP = 600

/**
 * The home screen's hero photo. On the real DSi this was the last picture
 * you took, so here it runs as a slideshow over the gallery.
 *
 * Rotation stops on mouse hover and while the tab is hidden, and never starts
 * under reduced motion: content that changes on its own needs a way to hold
 * still. Clicking steps to the next photo, which stays available under reduced
 * motion because the visitor asked for it. All of the state lives here so a
 * new photo never re-renders the menu or the rail.
 */
export default function PhotoFrame({ photos }: { photos: GalleryPhoto[] }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastChange = useRef(0)
  // Re-checked when System Settings changes the motion choice mid-visit.
  const motion = useMotion()

  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === 'hidden')
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  // A timeout per photo, so a click also restarts the 5s.
  useEffect(() => {
    if (paused || hidden || photos.length < 2) return
    if (lessMotion()) return
    const id = setTimeout(() => {
      lastChange.current = performance.now()
      setI(n => (n + 1) % photos.length)
    }, INTERVAL)
    return () => clearTimeout(id)
  }, [i, paused, hidden, photos.length, motion])

  const photo = photos[i]
  if (!photo) return <div className="dsi-photo" />

  const next = () => {
    const now = performance.now()
    if (now - lastChange.current < MIN_GAP) return
    lastChange.current = now
    setI(n => (n + 1) % photos.length)
  }

  // Same sizes on both layers, so they resolve to one variant and one download.
  const sizes = '(max-width: 620px) 76vw, 640px'

  return (
    <div
      className="dsi-photo"
      data-held={paused || hidden ? 'true' : undefined}
      onPointerEnter={e => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={e => e.pointerType === 'mouse' && setPaused(false)}
    >
      <div className="dsi-photo-shot" key={photo.src}>
        <Image src={photo.src} alt="" fill sizes={sizes} className="dsi-photo-back" priority={i === 0} />
        <Image
          src={photo.src}
          alt={photo.alt ?? 'Gallery photo'}
          fill
          sizes={sizes}
          className="dsi-photo-front"
          priority={i === 0}
        />
      </div>
      {/* Pointer only: keyboard users have Camera, and a Tab stop up here
          would come before the rail. */}
      <button type="button" className="dsi-photo-next" aria-label="Next photo" tabIndex={-1} onClick={next} />
      <div className="dsi-photo-tag">
        <div className="dsi-photo-dots" aria-hidden="true">
          {photos.map((p, n) => (
            <i key={p.src} data-on={n === i ? 'true' : undefined} />
          ))}
        </div>
        <div className="dsi-photo-line">
          <span className="dsi-photo-alt" aria-hidden="true">{photo.alt}</span>
          <span>{photo.caption}</span>
        </div>
      </div>
    </div>
  )
}
