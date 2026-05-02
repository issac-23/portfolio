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
  { src: '/photos/gallery/Screenshot_20260501_195320_Gallery.jpg', caption: 'March  2025' },
  { src: '/photos/gallery/20251030_165258.jpg', caption: 'October  2025' },
  { src: '/photos/gallery/20251026_165229.jpg', caption: 'October  2025' },
  { src: '/photos/gallery/20250426_194330.jpg', caption: 'April  2025' }
  
]
