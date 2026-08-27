export interface GalleryPhoto {
  src: string
  /** Intrinsic size of the optimized file — lets the grid lay out with no crop and no shift. */
  width: number
  height: number
  alt?: string
  caption?: string
}

// ─────────────────────────────────────────────────────────────────
// HOW TO ADD PHOTOS:
// 1. Drop image files into /public/photos/gallery/
// 2. Run `node scripts/optimize-photos.mjs` — it caps the long edge,
//    bakes in EXIF rotation, and prints the width/height for each file.
// 3. Add an entry below using the printed dimensions.
// Optional: alt (accessibility label), caption (shown in lightbox)
// ─────────────────────────────────────────────────────────────────
export const galleryPhotos: GalleryPhoto[] = [
  {
    src: '/photos/gallery/Screenshot_20260501_195320_Gallery.jpg',
    width: 1346,
    height: 2400,
    alt: 'A guitarist in a Northeastern crewneck singing into a mic under a stage spotlight',
    caption: 'May 2026',
  },
  {
    src: '/photos/gallery/20251030_165258.jpg',
    width: 1800,
    height: 2400,
    alt: 'Late afternoon sun lighting up a tall building above Shinsaibashi, Osaka',
    caption: 'October 2025',
  },
  {
    src: '/photos/gallery/20251026_165229.jpg',
    width: 1800,
    height: 2400,
    alt: 'A crowded Osaka shopping street at dusk, lined with glowing neon signage',
    caption: 'October 2025',
  },
  {
    src: '/photos/gallery/20250426_194330.jpg',
    width: 1800,
    height: 2400,
    alt: 'Towering sunlit storm clouds at sunset above a row of brick houses',
    caption: 'April 2025',
  },
]
