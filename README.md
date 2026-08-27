# issac-ip.com

Personal portfolio site built with Next.js and Tailwind CSS.

## Stack

- **Next.js 14** — framework
- **Tailwind CSS** — styling
- **TypeScript** — language
- **Spotify Web API** — live now playing + recently played
- **Vercel** — hosting

## Features

- Live Spotify integration (currently playing + recently played, updates every 30s)
- Manually curated media shelf (articles, videos, podcasts)
- Photography gallery with lightbox
- Projects showcase
- Fully responsive

## Project Structure

```
├── app/
│   ├── api/spotify/       # Spotify API routes
│   └── page.tsx           # Main page
├── components/            # UI components (Nav, Hero, About, etc.)
├── data/
│   ├── media.ts           # Curated media items — edit this to update the shelf
│   ├── gallery.ts         # Gallery photos — edit this to add photos
│   └── projects.ts        # Projects — edit this to add projects
└── public/
    └── photos/gallery/    # Gallery image files go here
```

## Running locally

```bash
npm install
npm run dev
```

Requires a `.env.local` file with Spotify credentials:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
```

See `SPOTIFY_SETUP.md` for instructions on getting these values.

## Updating content

**Media shelf** — open `data/media.ts` and add an entry to the top of the array.

**Gallery** — drop an image into `public/photos/gallery/`, then run:

```bash
node scripts/optimize-photos.mjs
```

That caps the long edge at 2400px, bakes in EXIF rotation, and prints the
`width`/`height` for each file. Add an entry to `data/gallery.ts` using the
printed dimensions — the grid needs them to lay out without cropping or
shifting. Full-resolution originals are moved to
`public/photos/gallery/_originals/` (gitignored, kept locally).

**Projects** — open `data/projects.ts` and add an entry to the top of the array.

After any change: `git add . && git commit -m "your message" && git push` — Vercel deploys automatically.

## UX / accessibility checks

Playwright-driven audit scripts. Start the dev server first, then:

```bash
node scripts/journeys.mjs        # 29 interaction + a11y checks across the core flows
```

```bash
node scripts/contrast.mjs        # WCAG AA contrast in both light and dark themes
```

```bash
node scripts/shots.mjs <label>   # desktop + mobile screenshots, both themes
```

```bash
node scripts/og.mjs              # regenerate public/og.png
```

Output lands in `shots/<label>/` (gitignored).

> **Don't run `npm run build` while `npm run dev` is running** — they share
> `.next` and the dev server starts returning 500s. Stop dev first, or
> `rm -rf .next` to recover.
