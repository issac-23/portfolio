import { defineConfig } from '@playwright/test'

// Each checkout gets its own port, derived from where it lives on disk. With a
// shared default, a second checkout's next start (a git worktree, say) was
// silently reused by reuseExistingServer and the tests ran against the wrong
// branch. CI is a single checkout, so it keeps 3100. The derived range
// (3100-3999) is small enough that two checkouts can, rarely, land on the same
// port; that fails loudly at startup instead of testing the wrong branch.
function portForCheckout(dir: string) {
  let hash = 0
  for (const char of dir) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return 3100 + (hash % 900)
}

const DEFAULT_WORKERS = '50%'

// An empty or malformed E2E_WORKERS (Number('') is 0, Number('abc') is NaN)
// falls back to the default instead of reaching Playwright as 0 or NaN.
function workerCount(value = DEFAULT_WORKERS) {
  const text = value.trim()
  if (/^[1-9]\d*%$/.test(text)) return text
  if (/^[1-9]\d*$/.test(text)) return Number(text)
  return DEFAULT_WORKERS
}

const PORT = Number(
  process.env.E2E_PORT ?? (process.env.CI ? 3100 : portForCheckout(__dirname)),
)

/**
 * End-to-end tests against a production build.
 *
 * Production rather than next dev on purpose: dev compiles on demand, which
 * makes the first navigation slow enough to time out, and some bugs only exist
 * in the built output. The DSi rail drifting when the font swapped in only
 * showed up there.
 *
 * Run `npm run build` first, or use `npm run test:e2e`, which does both.
 */
// The /lab specs render the 3D scene in software WebGL, which starves the page
// on CI runners and loads a laptop more than the rest of the suite together.
// They run only on demand: E2E_LAB=1 (or `npm run test:e2e:lab`) runs just them.
const LAB_SPECS = /lab-[^/\\]*\.spec\.ts$/
const lab = !!process.env.E2E_LAB
// Under software WebGL every frame of the lab is hundreds of ms of browser work
// and grows with the window (#74), so the lab runs once, in a small window, on
// one worker. Layout at phone size is not what these specs check.
const LAB_PROJECTS = [{ name: 'lab', use: { viewport: { width: 800, height: 600 } } }]

export default defineConfig({
  testDir: './e2e',
  ...(lab ? { testMatch: LAB_SPECS } : { testIgnore: LAB_SPECS }),
  // One limit for the whole lab instead of a 90 s guess in each spec.
  ...(lab ? { timeout: 240_000 } : {}),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // retries: 1 is intentional locally too: a load timeout then shows up as
  // flaky in the summary rather than failing the whole run.
  retries: 1,
  // Every worker drives a browser against the one next start process. Locally
  // that plus other work pinned the CPU and a different few tests timed out each
  // run, so default to half the cores. E2E_WORKERS overrides it with a plain
  // count ("2") or a percentage ("25%"); Playwright only accepts a string that
  // ends in "%", so a bare number has to be passed through as a Number.
  // The lab specs run one at a time (see LAB_PROJECTS).
  workers: lab ? 1 : process.env.CI ? undefined : workerCount(process.env.E2E_WORKERS),
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },

  // Plain viewports rather than device presets. The presets turn on touch and
  // mobile emulation, which changes how clicks and hover behave, and these
  // tests are about layout at a size, not about a particular phone.
  projects: lab ? LAB_PROJECTS : [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],

  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
