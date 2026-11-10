# Working in this repo

Issac's personal portfolio site, built with Next.js App Router, TypeScript and
Tailwind. The DSi redesign lives at `/` and the previous site is kept at
`/classic`.

`npm run check` runs lint, the e2e type-check, then `test:e2e`, and local e2e
runs queue behind each other through a lock in the temp dir. Tests are E2E
only; there are no unit tests.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `issac-23/portfolio`, driven through the `gh`
CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and one `docs/adr/` at the repo root, both
created lazily when there is something real to record. See
`docs/agents/domain.md`.
