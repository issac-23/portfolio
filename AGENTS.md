# Working in this repo

Issac's personal portfolio site, built with Next.js App Router, TypeScript and
Tailwind. The DSi lives at `/`. The first portfolio that used to be at
`/classic` is retired, and `/classic` redirects to `/`.

`npm run check` runs lint, the e2e type-check, then `test:e2e`, and local e2e
runs queue behind each other through a lock in the temp dir, and drop to 2 workers
when the CPU is already busy (set E2E_WORKERS to override). Tests are mostly E2E. A few unit tests in `unit/` (node:test, no
extra dependency) cover the Spotify route and the weekly counts: run them with
`npm run test:unit` (Node 22.18+, no browser or build), type-check with
`npm run typecheck:unit`. The 3D lab's `e2e/lab-*.spec.ts` are skipped there and
in CI; run them with `npm run test:e2e:lab`.

Spotify section broken: `node scripts/spotify-auth.mjs --check`; details in
`SPOTIFY_SETUP.md`.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `issac-23/portfolio`, driven through the `gh`
CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and one `docs/adr/` at the repo root, both
created lazily when there is something real to record. See
`docs/agents/domain.md`.
