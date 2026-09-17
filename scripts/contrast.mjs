/** Checks text contrast against WCAG AA (4.5:1 body, 3:1 large) in both themes. */
import { chromium } from 'playwright'

// Override when 3000 is taken by another project: SITE=http://localhost:3009
const SITE = process.env.SITE ?? 'http://localhost:3000'

const browser = await chromium.launch()
let failures = 0
let broken = 0

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(`localStorage.setItem('theme', '${theme}')`)
  const page = await ctx.newPage()
  await page.goto(SITE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => document.querySelectorAll('.section-fade').forEach((n) => n.classList.add('visible')))
  await page.waitForTimeout(1500)

  const rows = await page.evaluate(() => {
    // Read colours by painting them and sampling the result, rather than
    // parsing the string getComputedStyle hands back. Theme colours go through
    // color-mix so they report as `color(srgb 0.93 0.91 0.89)`, and the status
    // badge tint resolves to `oklab(... / 0.12)`. The previous version pulled
    // integers out with /\d+/g, which reads 0.93 as the digits 0 and 93 and
    // quietly produced ratios in the millions. Canvas does not care about the
    // notation, and layering handles alpha for free.
    const cv = document.createElement('canvas')
    cv.width = cv.height = 4
    const ctx2d = cv.getContext('2d', { willReadFrequently: true })
    const rgbOf = (...layers) => {
      ctx2d.clearRect(0, 0, 4, 4)
      for (const c of layers) {
        if (!c || c === 'transparent') continue
        ctx2d.fillStyle = c
        ctx2d.fillRect(0, 0, 4, 4)
      }
      const d = ctx2d.getImageData(1, 1, 1, 1).data
      return [d[0], d[1], d[2]]
    }
    const lum = ([r, g, b]) =>
      [r, g, b]
        .map((v) => {
          v /= 255
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
        })
        .reduce((acc, v, i) => acc + [0.2126, 0.7152, 0.0722][i] * v, 0)
    const ratio = (fg, bg) => {
      const [x, y] = [lum(fg), lum(bg)].sort((m, n) => n - m)
      return +((x + 0.05) / (y + 0.05)).toFixed(2)
    }

    const bodyBg = getComputedStyle(document.body).backgroundColor
    const card = document.querySelector('#projects .bg-surface')
    const cardBg = card ? getComputedStyle(card).backgroundColor : bodyBg
    const out = []

    // An element's own background is composited over its container's, so a
    // translucent chip is measured against what it actually sits on.
    const add = (label, el, under, large = false) => {
      if (!el) {
        out.push({ label, missing: true })
        return
      }
      const cs = getComputedStyle(el)
      out.push({
        label,
        large,
        r: ratio(rgbOf(cs.color), rgbOf(under, cs.backgroundColor)),
      })
    }

    add('body copy (About)', document.querySelector('#about p'), bodyBg)
    add('nav link', document.querySelector('header nav ul a'), bodyBg)
    add('hero kicker (accent)', document.querySelector('#top p'), bodyBg)
    add('section label (accent)', document.querySelector('#about span'), bodyBg)
    add('project desc on surface', document.querySelector('#projects p.text-muted'), cardBg)
    add('status badge on surface', document.querySelector('#projects span.rounded-full'), cardBg)
    // Lives in the <footer> landmark, which is a sibling of <main> -- not
    // inside #contact, where this used to look for it.
    add('footer copyright', [...document.querySelectorAll('footer p')].find((n) => n.textContent.includes('©')), bodyBg)
    add('media note', document.querySelector('#media p.italic'), cardBg)
    return out
  })

  console.log(`=== ${theme} ===`)
  for (const row of rows) {
    // A selector that stops matching is a broken check, not a passing one.
    // Silently skipping is how the footer copyright check disappeared when
    // that markup moved out of #contact.
    if (row.missing) {
      broken++
      console.log(`BROKEN  ${row.label.padEnd(26)} no element matched`)
      continue
    }
    // 21:1 is the theoretical maximum (black on white). Anything above it
    // means the measurement itself is wrong, which must not read as a pass.
    if (!Number.isFinite(row.r) || row.r > 21) {
      broken++
      console.log(`BROKEN  ${row.label.padEnd(26)} implausible ratio ${row.r}:1`)
      continue
    }
    const min = row.large ? 3 : 4.5
    const ok = row.r >= min
    if (!ok) failures++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${row.label.padEnd(26)} ${row.r}:1 (need ${min})`)
  }
  await ctx.close()
}

await browser.close()
const parts = []
if (failures) parts.push(`${failures} contrast failure(s)`)
if (broken) parts.push(`${broken} broken check(s)`)
console.log(`\n${parts.length ? parts.join(', ') : 'All contrast checks pass.'}`)
process.exit(parts.length ? 1 : 0)
