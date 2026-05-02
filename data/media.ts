export type MediaType = 'article' | 'video' | 'podcast' | 'book' | 'film' | 'other'

export interface MediaItem {
  type: MediaType
  title: string
  creator: string
  url: string
  note?: string
  date?: string
}

// ─────────────────────────────────────────────────────────────────
// HOW TO UPDATE:
// Add new items to the TOP of this array (newest first).
// Required: type, title, creator, url
// Optional: note (your one-liner on it), date (e.g. "Apr 2025")
// ─────────────────────────────────────────────────────────────────
export const mediaItems: MediaItem[] = [
  {
    type: 'article',
    title: 'the cost of the unlived life',
    creator: 'Sydney Rheeder',
    url: 'https://open.substack.com/pub/fortherecordink/p/the-cost-of-the-unlived-life?utm_source=share&utm_medium=android&r=62kue9',
    note: 'The heaviest tax you will ever pay is the crushing bitterness of a life left unlived.',
    date: 'Apr 2026',
  },
  {
    type: 'podcast',
    title: 'are you allowed to feel hopeless?',
    creator: 'the zurkie show',
    url: 'https://open.spotify.com/episode/0Y7wikY3csTW6jvhNKcbRN?si=6c7a0f3150cd49cd',
    note: 'We are our biggest critics, life is not linear, and we have to keep trying over and over again',
    date: 'Feb 2026',
  },
  {
    type: 'video',
    title: 'the fear of being average',
    creator: 'Verse Creates',
    url: 'https://youtu.be/BLl3xREFEsY?si=BIstcEWh1ZIqUvpj',
    note: 'Real risk isn\'t failing, it’s never trying.',
    date: 'Jan 2026',
  },
]
