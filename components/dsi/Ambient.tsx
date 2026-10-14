'use client'

import Image from 'next/image'
import { useState, useSyncExternalStore } from 'react'
import type { GalleryPhoto } from '@/data/gallery'
import { getAmbientPhoto, getServerAmbientPhoto, subscribeAmbientPhoto } from './ambientPhoto'
import { lessMotion } from './prefs'

/**
 * The photo on the top screen, stretched soft into a glow that fills the page
 * around the device. The device is portrait, so on a wide screen the sides
 * would otherwise be empty.
 *
 * Purely decorative: hidden from assistive tech and never catches a click.
 * The previous photo stays underneath while the new one fades in, so a change
 * cross-fades rather than dipping to the page colour, and is dropped once the
 * fade ends so only one blurred layer stays composited.
 */
export default function Ambient() {
  const photo = useSyncExternalStore(subscribeAmbientPhoto, getAmbientPhoto, getServerAmbientPhoto)
  const [prev, setPrev] = useState<GalleryPhoto | null>(null)
  const [shown, setShown] = useState(photo)

  // Adjusting state while rendering is the supported way to derive "the one
  // before this" without an effect and a second paint. With less motion there
  // is no fade to wait for, so nothing is kept underneath.
  if (shown.src !== photo.src) {
    setPrev(lessMotion() ? null : shown)
    setShown(photo)
  }

  // Stable keys, so the outgoing shot is not remounted and does not replay
  // its entry fade from nothing.
  return (
    <div className="dsi-ambient" aria-hidden="true">
      {prev && prev.src !== photo.src && <Shot key={prev.src} photo={prev} />}
      <Shot key={photo.src} photo={photo} onFaded={() => setPrev(null)} />
    </div>
  )
}

// A 64px source is plenty for something stretched this soft.
function Shot({ photo, onFaded }: { photo: GalleryPhoto; onFaded?: () => void }) {
  return (
    <div
      className="dsi-ambient-shot"
      onAnimationEnd={e => {
        if (e.target === e.currentTarget) onFaded?.()
      }}
    >
      <Image src={photo.src} alt="" fill sizes="64px" quality={40} />
    </div>
  )
}
