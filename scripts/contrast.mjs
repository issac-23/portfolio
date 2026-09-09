/** Checks text contrast against WCAG AA (4.5:1 body, 3:1 large) in both themes. */
import { chromium } from 'playwright'

// Override when 3000 is taken by another project: SITE=http://localhost:3009
const SITE = process.env.SITE ?? 'http://localhost:3000'

const browser = await chromium.launch()
let failures = 0

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(`localStorage.setItem('theme', '${theme}')`)
  const page = await ctx.newPage()
  await page.goto(SITE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => document.querySelectorAll('.section-fade').forEach((n) => n.classList.add('visible')))
  await page.waitForTimeout(1500)

  const rows = await page.evaluate(() => {
    const lum = (s) => {
      const [r, g, b] = s.match(/\d+/g).map(Number).map((v) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const ratio = (fg, bg) => {
      const [x, y] = [lum(fg), lum(bg)].sort((m, n) => n - m)
      return +((x + 0.05) / (y + 0.05)).toFixed(2)
    }
    const bodyBg = getComputedStyle(document.body).backgroundColor
    const card = document.querySelector('#projects .bg-surface')
    const cardBg = card ? getComputedStyle(card).backgroundColor : bodyBg
    const out = []
    const add = (label, el, bg, large = false) => {
      if (el) out.push({ label, r: ratio(getComputedStyle(el).color, bg), large })
    }
    add('body copy (About)', document.querySelector('#about p'), bodyBg)
    add('nav link', document.querySelector('header nav ul a'), bodyBg)
    add('hero kicker (accent)', document.querySelector('#top p'), bodyBg)
    add('section label (accent)', document.querySelector('#about span'), bodyBg)
    add('project desc on surface', document.querySelector('#projects p.text-muted'), cardBg)
    add('status badge on surface', document.querySelector('#projects span.rounded-full'), cardBg)
    add('footer copyright', [...document.querySelectorAll('#contact p')].find((n) => n.textContent.includes('©')), bodyBg)
    add('media note', document.querySelector('#media p.italic'), cardBg)
    return out
  })

  console.log(`=== ${theme} ===`)
  for (const row of rows) {
    const min = row.large ? 3 : 4.5
    const ok = row.r >= min
    if (!ok) failures++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${row.label.padEnd(26)} ${row.r}:1 (need ${min})`)
  }
  await ctx.close()
}

await browser.close()
console.log(`\n${failures === 0 ? 'All contrast checks pass.' : failures + ' contrast failure(s).'}`)
process.exit(failures === 0 ? 0 : 1)
