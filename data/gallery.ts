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
    src: '/photos/gallery/20260814_000220.jpg',
    width: 2400,
    height: 1800,
    alt: 'Beautiful aurora borealis over a silhouetted mountain ridge taken in Alaska',
    caption: 'August 2026',
  },
  {
    src: '/photos/gallery/20260812_082818.jpg',
    width: 1800,
    height: 2400,
    alt: 'House by the mountain with the sun glistening on the window',
    caption: 'August 2026',
  },
  {
    src: '/photos/gallery/20260724_152551.jpg',
    width: 1800,
    height: 2400,
    alt: 'A perfect girl looking up from the boulders in Rockport, MA, to complement a perfect sunny day',
    caption: 'July 2026',
  },
  {
    src: '/photos/gallery/Screenshot_20260501_195320_Gallery.jpg',
    width: 1346,
    height: 2400,
    alt: 'Malcolm Todd performing at spring fest for Northeastern Students',
    caption: 'May 2026',
  },
  {
    src: '/photos/gallery/20251030_165258.jpg',
    width: 1800,
    height: 2400,
    alt: 'Golden hour sunlight on a row of brick houses in Japan',
    caption: 'October 2025',
  },
  {
    src: '/photos/gallery/20251026_165229.jpg',
    width: 1800,
    height: 2400,
    alt: 'A crowded shopping street in Japan, lined with glowing neon signage',
    caption: 'October 2025',
  },
  {
    src: '/photos/gallery/20250426_194330.jpg',
    width: 1800,
    height: 2400,
    alt: 'Powerlines over a sunrise of storm clouds in the distance',
    caption: 'April 2025',
  },
]
