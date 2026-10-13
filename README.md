# issac-ip.com

Personal portfolio site built with Next.js and Tailwind CSS. The home page is
a Nintendo DSi home menu: each section is an app on the rail.

| Address | What it is |
|---|---|
| `/` | The DSi menu |
| `/#projects`, `/#profile`, … | Opens that app directly. The old `#about`, `#music`, `#media`, `#gallery` and `#contact` anchors still work |
| `/?view=plain` | The same content as an ordinary page, no DSi (also in System Settings) |
| `/classic` | The site before the DSi, kept for old bookmarks, not indexed |

## Stack

- **Next.js 14** — framework
- **Tailwind CSS** — styling
- **TypeScript** — language
- **Spotify Web API** — live now playing + recently played
- **Vercel** — hosting

## Features

- DSi home menu with a launch transition, eight apps, a plain view and System Settings (theme, reduce motion)
- Live Spotify integration (currently playing + recently played, updates every 30s)
- Manually curated media shelf (articles, videos, podcasts)
- Photography gallery with lightbox
- Projects showcase
- Fully responsive

## Project Structure

```
├── app/
│   ├── (dsi)/             # The home page: the DSi menu and plain view
│   ├── classic/           # The previous site, at /classic
│   └── api/spotify/       # Spotify API routes
├── components/            # Classic UI components (Nav, Hero, About, etc.)
│   └── dsi/               # The DSi: shell, rail, apps, launch transition
├── data/
│   ├── profile.ts         # Bio, stats and contact channels
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

The checks live in `e2e/` as Playwright tests and run in CI on every PR. They
build the site and serve it themselves, so nothing needs to be running first:

```bash
npm run test:e2e                 # journeys, contrast, axe and the DSi, both widths
```

The screenshot scripts below still want a server on port 3000 (`npm run dev`):

```bash
node scripts/shots.mjs <label>   # desktop + mobile screenshots, both themes
```

```bash
node scripts/og.mjs              # regenerate public/og.png
```

Output lands in `shots/<label>/` (gitignored).

If port 3000 is already taken by another project, start this one elsewhere and
point the scripts at it — otherwise they will happily shoot the wrong app:

```bash
SITE=http://localhost:3009 node scripts/shots.mjs <label>
```

> **Don't run `npm run build` while `npm run dev` is running** — they share
> `.next` and the dev server starts returning 500s. Stop dev first, or
> `rm -rf .next` to recover.
