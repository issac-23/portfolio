/**
 * Checks the DSi home menu rail against the invariants that have broken it.
 *
 * Each section is a bug that actually happened, so a failure here names the
 * regression rather than just a symptom. Run against a production build: the
 * font-swap case only shows up there.
 *
 *   SITE=http://localhost:3009 node scripts/dsi-rail.mjs
 */
import { chromium } from 'playwright'

const SITE = process.env.SITE ?? 'http://localhost:3000'
const URL = `${SITE}/dsi`
const APPS = ['Profile', 'Projects', 'Nintendo DSi Camera', 'Nintendo DSi Sound',
  'Shelf', 'PictoChat', 'Resume', 'System Settings']
const N = APPS.length
const mod = (n, m) => ((n % m) + m) % m

// Whole-pixel positioning cannot hit a half-pixel centre exactly.
const CENTRE_TOLERANCE = 1

const browser = await chromium.launch()
let failures = 0
const check = (ok, label, detail = '') => {
  if (!ok) failures++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`)
}

const state = page => page.evaluate(() => {
  const view = document.querySelector('.dsi-viewport').getBoundingClientRect()
  const rail = document.querySelector('.dsi-rail').getBoundingClientRect()
  const sel = [...document.querySelectorAll('.dsi-slot[data-sel]')]
  const ico = sel[0]?.querySelector('.dsi-ico').getBoundingClientRect()
  const ae = document.activeElement
  return {
    selCount: sel.length,
    current: document.querySelector('.dsi-slot[aria-current="true"]')?.getAttribute('aria-label'),
    exposed: document.querySelectorAll('.dsi-slot:not([aria-hidden])').length,
    offBy: ico ? Math.round(ico.left + ico.width / 2 - (view.left + view.width / 2)) : NaN,
    clipsBoth: rail.left < view.left - 1 && rail.right > view.right + 1,
    focus: ae?.getAttribute('aria-label') ?? null,
    focusHidden: ae?.getAttribute('aria-hidden') === 'true',
    scrollLeft: document.querySelector('.dsi-viewport').scrollLeft,
    name: document.querySelector('.dsi-namebox b')?.textContent,
    lit: [...document.querySelectorAll('.dsi-track i')].findIndex(i => i.hasAttribute('data-on')),
    pageScrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
  }
})

const consistent = (s, want) =>
  s.selCount === 1 && s.exposed === N && s.current === want && s.name === want &&
  Math.abs(s.offBy) <= CENTRE_TOLERANCE && s.clipsBoth && !s.pageScrolls

for (const [w, h, tag] of [[1280, 900, 'desktop'], [390, 844, 'mobile']]) {
  console.log(`\n${tag} ${w}x${h}`)
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errors = []
  page.on('console', m => {
    if (m.type() === 'error' && !/_vercel\/insights/.test(m.location()?.url ?? '')) errors.push(m.text())
  })

  // Slot widths must not depend on the font. The rounded face swaps in after
  // the fallback, and text-sized slots shifted the rail off centre when it did.
  await page.addInitScript(() => {
    window.__firstWidths = null
    new MutationObserver(() => {
      const slots = document.querySelectorAll('.dsi-slot')
      if (slots.length && !window.__firstWidths) {
        window.__firstWidths = [...slots].map(e => Math.round(e.getBoundingClientRect().width))
      }
    }).observe(document, { childList: true, subtree: true })
  })
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)
  const widths = await page.evaluate(() => ({
    first: window.__firstWidths,
    after: [...document.querySelectorAll('.dsi-slot')].map(e => Math.round(e.getBoundingClientRect().width)),
  }))
  check(JSON.stringify(widths.first) === JSON.stringify(widths.after), 'slot widths survive the font swap')

  let L = 0
  let s = await state(page)
  check(consistent(s, APPS[L]), 'centred and clipping both edges on load', `offBy ${s.offBy}`)

  // Arrows are bound to the document, so they work before anything has focus.
  await page.keyboard.press('ArrowRight'); L = 1
  await page.waitForTimeout(450)
  s = await state(page)
  check(consistent(s, APPS[L]), 'arrow key works from a cold load')

  // Roving tabindex: past the skip link, Tab lands on the selected app.
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(150)
  s = await state(page)
  check(s.focus === APPS[L], 'Tab lands on the selected app', `focus ${s.focus}`)

  // Crossing the copy seams with focus held. Focus must stay on the copy that
  // assistive tech can see, and the viewport must never scroll: overflow
  // hidden let focus shove the rail 279px off centre.
  for (const [d, n] of [[1, 10], [-1, 10]]) {
    for (let k = 0; k < n; k++) {
      await page.keyboard.press(d > 0 ? 'ArrowRight' : 'ArrowLeft')
      L = mod(L + d, N)
      await page.waitForTimeout(380)
    }
    s = await state(page)
    check(consistent(s, APPS[L]) && s.focus === APPS[L] && !s.focusHidden && s.scrollLeft === 0,
      `focused, ${n} ${d > 0 ? 'right' : 'left'} across the seam`)
  }

  // A held key repeats faster than the settle timer, which once let the
  // selection walk off the end of the rail.
  for (let k = 0; k < 40; k++) {
    await page.keyboard.press('ArrowRight')
    L = mod(L + 1, N)
    await page.waitForTimeout(33)
  }
  await page.waitForTimeout(700)
  s = await state(page)
  check(consistent(s, APPS[L]), 'held key, 40 presses at 33ms')

  // The arrow buttons step the selection and announce it.
  await page.click('button[aria-label="Next app"]')
  L = mod(L + 1, N)
  await page.waitForTimeout(450)
  s = await state(page)
  const live = await page.evaluate(() => document.querySelector('[aria-live="polite"]')?.textContent ?? '')
  check(consistent(s, APPS[L]) && s.lit === L && live.startsWith(APPS[L]), 'Next button steps and announces')

  check(errors.length === 0, 'no console errors', errors.slice(0, 2).join(' | '))
  await page.close()
}

await browser.close()
console.log(failures ? `\n${failures} check(s) failed` : '\nAll rail checks pass.')
process.exit(failures ? 1 : 0)
