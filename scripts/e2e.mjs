// Runs `next build` then `playwright test`, one local run at a time.
//
// Several checkouts or worktrees run the e2e suite on one machine at once
// (parallel agents). Each has its own port, but the builds and browsers all
// compete for the same CPU, and that load made 10-41 tests time out per run.
// So local runs queue behind a machine-wide lock file in the temp directory.
//
// The lock lives here, not in a Playwright globalSetup, because Playwright
// starts the webServer before globalSetup runs, and the build before that is
// the heaviest step. Taking the lock before `next build` serializes all of it.
// Other programs loading the machine cause the same timeouts. After the build,
// a local run that finds the CPU already busy uses 2 workers instead of the
// default 50% of cores (never more than that default). Setting E2E_WORKERS or
// passing --workers / -j skips the check.
// A bare `npx playwright test` skips the lock; use `npm run test:e2e`.
//
// CI is a single checkout and skips the lock. E2E_LOCK_TIMEOUT_MIN changes how
// long to wait (default 30). A lock only counts as stale when its pid is no
// longer running, so a slow but healthy run keeps it however long it takes.
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const LOCK = path.join(os.tmpdir(), 'portfolio-e2e.lock')
const TIMEOUT_MS = Number(process.env.E2E_LOCK_TIMEOUT_MIN ?? 30) * 60_000
const POLL_MS = 2_000
// An unreadable lock is probably being written right now; give it this long.
const GRACE_MS = 10_000
// Overall CPU use at or above this before the tests start counts as busy.
const BUSY_CPU = 0.5
const BUSY_WORKERS = 2
const SAMPLE_MS = 1_500
// Let the end of the build (its child processes winding down) settle first.
const SETTLE_MS = 1_000
// What playwright.config.ts's default '50%' resolves to: Playwright takes
// floor(os.cpus().length * 0.5), at least 1.
const DEFAULT_WORKERS = Math.max(1, Math.floor(os.cpus().length * 0.5))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    // EPERM means the process exists but belongs to someone else.
    return err.code === 'EPERM'
  }
}

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(LOCK, 'utf8'))
  } catch {
    return null
  }
}

function lockAgeMs() {
  try {
    return Date.now() - fs.statSync(LOCK).mtimeMs
  } catch {
    return 0
  }
}

function isStale(info) {
  // Without a readable pid the lock is junk, but only once it is old enough
  // that it cannot be a fresh lock mid-write.
  if (!info || !Number.isInteger(info.pid)) return lockAgeMs() > GRACE_MS
  return !isRunning(info.pid)
}

// Rename rather than delete: if two waiters both see the stale lock, only one
// rename succeeds, so they cannot both then believe they own it.
function removeStale() {
  const gone = `${LOCK}.${process.pid}.stale`
  try {
    fs.renameSync(LOCK, gone)
    fs.rmSync(gone, { force: true })
  } catch {}
}

// Write the full JSON to a private temp file, then hard-link it to LOCK. The
// link fails with EEXIST if LOCK exists, so it is still exclusive, and LOCK
// never appears half written.
function tryTake() {
  const tmp = `${LOCK}.${process.pid}.tmp`
  fs.writeFileSync(
    tmp,
    JSON.stringify({ pid: process.pid, cwd: process.cwd(), time: Date.now() }),
  )
  try {
    fs.linkSync(tmp, LOCK)
    return true
  } catch (err) {
    if (err.code === 'EEXIST') return false
    throw err
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

async function acquire() {
  const start = Date.now()
  let announced = false
  while (!tryTake()) {
    const info = readLock()
    if (isStale(info)) {
      console.log(`[e2e-lock] Taking over a stale lock (pid ${info?.pid ?? '?'}).`)
      removeStale()
      continue
    }
    const holder = info ? `pid ${info.pid}, checkout ${info.cwd}` : 'unreadable lock'
    if (!announced) {
      console.log(`[e2e-lock] Another e2e run holds the lock (${holder}); waiting...`)
      announced = true
    }
    if (Date.now() - start > TIMEOUT_MS) {
      console.error(
        `[e2e-lock] Gave up after ${TIMEOUT_MS / 60_000} min waiting on ${holder}. ` +
          `Delete ${LOCK} if that run is dead, or raise E2E_LOCK_TIMEOUT_MIN.`,
      )
      process.exit(1)
    }
    await sleep(POLL_MS)
  }
}

function release() {
  if (readLock()?.pid === process.pid) fs.rmSync(LOCK, { force: true })
}

let child = null
function killChild() {
  if (!child?.pid) return
  // shell: true on Windows leaves grandchildren behind unless the tree is killed.
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'])
  } else {
    child.kill('SIGTERM')
  }
}

function cpuTimes() {
  let idle = 0
  let total = 0
  for (const { times } of os.cpus()) {
    idle += times.idle
    total += times.user + times.nice + times.sys + times.idle + times.irq
  }
  return { idle, total }
}

// Fraction of all cores in use over a short window, 0 to 1.
async function sampleCpuBusy() {
  const before = cpuTimes()
  await sleep(SAMPLE_MS)
  const after = cpuTimes()
  const total = after.total - before.total
  return total > 0 ? 1 - (after.idle - before.idle) / total : 0
}

function run(command, env) {
  return new Promise((resolve) => {
    child = spawn(command, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...env },
    })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

const useLock = !process.env.CI
if (useLock) {
  await acquire()
  process.on('exit', release)
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      killChild()
      release()
      process.exit(130)
    })
  }
}

const rawArgs = process.argv.slice(2)
const args = rawArgs.map((a) => JSON.stringify(a)).join(' ')
// --workers, --workers=N, -j, -jN and -j=N all choose the count themselves.
const argsChooseWorkers = rawArgs.some((a) => /^(--workers(=|$)|-j)/.test(a))
let code = await run('npx next build')
if (code === 0) {
  const env = {}
  // Sampled after the build, which would otherwise count as load.
  // Nothing to lower when the default is already at or under the busy count.
  if (
    useLock &&
    !process.env.E2E_WORKERS &&
    !argsChooseWorkers &&
    DEFAULT_WORKERS > BUSY_WORKERS
  ) {
    await sleep(SETTLE_MS)
    const busy = await sampleCpuBusy()
    if (busy >= BUSY_CPU) {
      env.E2E_WORKERS = String(BUSY_WORKERS)
      console.log(
        `[e2e] Machine is busy (${Math.round(busy * 100)}% CPU in use before the tests); ` +
          `running with ${BUSY_WORKERS} workers instead of ${DEFAULT_WORKERS}. ` +
          `Set E2E_WORKERS to choose.`,
      )
    }
  }
  code = await run(`npx playwright test ${args}`.trim(), env)
}
process.exit(code)
