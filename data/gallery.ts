export interface GalleryPhoto {
  src: string
  alt?: string
  caption?: string
}

// ─────────────────────────────────────────────────────────────────
// HOW TO ADD PHOTOS:
// 1. Drop image files into /public/photos/gallery/
// 2. Add an entry below: { src: '/photos/gallery/filename.jpg' }
// Optional: alt (accessibility label), caption (shown in lightbox)
// ─────────────────────────────────────────────────────────────────
export const galleryPhotos: GalleryPhoto[] = [
  {
    src: '/photos/gallery/Screenshot_20260501_195320_Gallery.jpg',
    alt: 'A guitarist in a Northeastern crewneck singing into a mic under a stage spotlight',
    caption: 'May 2026',
  },
  {
    src: '/photos/gallery/20251030_165258.jpg',
    alt: 'Late afternoon sun lighting up a tall building above Shinsaibashi, Osaka',
    caption: 'October 2025',
  },
  {
    src: '/photos/gallery/20251026_165229.jpg',
    alt: 'A crowded Osaka shopping street at dusk, lined with glowing neon signage',
    caption: 'October 2025',
  },
  {
    src: '/photos/gallery/20250426_194330.jpg',
    alt: 'Towering sunlit storm clouds at sunset above a row of brick houses',
    caption: 'April 2025',
  },
]
