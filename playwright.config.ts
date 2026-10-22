import { defineConfig } from '@playwright/test'

// Each checkout gets its own port, derived from where it lives on disk. With a
// shared default, a second checkout's next start (a git worktree, say) was
// silently reused by reuseExistingServer and the tests ran against the wrong
// branch. CI is a single checkout, so it keeps 3100.
function portForCheckout(dir: string) {
  let hash = 0
  for (const char of dir) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return 3100 + (hash % 900)
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
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Every worker drives a browser against the one next start process. Past
  // about four locally they starve each other and timings stop meaning much.
  workers: process.env.CI ? undefined : 4,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },

  // Plain viewports rather than device presets. The presets turn on touch and
  // mobile emulation, which changes how clicks and hover behave, and these
  // tests are about layout at a size, not about a particular phone.
  projects: [
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
