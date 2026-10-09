'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import type { GalleryPhoto } from '@/data/gallery'

const INTERVAL = 6000

/**
 * The home screen's hero photo. On the real DSi this was the last picture
 * you took, so here it walks the gallery.
 *
 * Rotation stops on hover and never starts under reduced motion: content
 * that changes on its own needs a way to hold still.
 */
export default function PhotoFrame({ photos }: { photos: GalleryPhoto[] }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || photos.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setI(n => (n + 1) % photos.length), INTERVAL)
    return () => clearInterval(id)
  }, [paused, photos.length])

  const photo = photos[i]
  if (!photo) return <div className="dsi-photo" />

  // Same sizes on both layers, so they resolve to one variant and one download.
  const sizes = '(max-width: 620px) 76vw, 450px'

  return (
    <div
      className="dsi-photo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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
      <div className="dsi-photo-tag">
        <span>Camera</span>
        <span>{photo.caption}</span>
      </div>
    </div>
  )
}
