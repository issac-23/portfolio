import { galleryPhotos, type GalleryPhoto } from '@/data/gallery'

/**
 * Which photo is on the top screen, kept outside React so the rotation can
 * reach the backdrop without re-rendering DsiMenu and the rail every few
 * seconds. It lives here rather than in PhotoFrame because PhotoFrame
 * unmounts while an app is open or the power is off, and the backdrop keeps
 * the last photo meanwhile.
 */
let current: GalleryPhoto = galleryPhotos[0]
const listeners = new Set<() => void>()

export function setAmbientPhoto(photo: GalleryPhoto) {
  if (photo === current) return
  current = photo
  listeners.forEach(l => l())
}

export function subscribeAmbientPhoto(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getAmbientPhoto = () => current
export const getServerAmbientPhoto = () => galleryPhotos[0]
