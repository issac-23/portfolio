'use client'

import { galleryPhotos } from '@/data/gallery'
import Device from './Device'
import PhotoFrame from './PhotoFrame'
import StatusBar from './StatusBar'

/**
 * Owns both screens. Selection state has to drive the top and bottom screen
 * together, so it lives here rather than in either one.
 */
export default function DsiMenu() {
  return (
    <Device
      top={
        <>
          <StatusBar user="Issac" />
          <PhotoFrame photos={galleryPhotos} />
        </>
      }
    />
  )
}
