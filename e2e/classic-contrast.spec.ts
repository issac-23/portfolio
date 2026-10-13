import { expect, test } from './fixtures'

/**
 * Text contrast on the classic site against WCAG AA (4.5:1 body, 3:1 large),
 * in both themes. Ported from scripts/contrast.mjs.
 *
 * Colours are read by painting them and sampling the pixel, not by parsing
 * getComputedStyle. Theme colours go through color-mix and serialise as
 * color(srgb ...), and the badge tint as oklab(... / 0.12); a regex over
 * those once read 0.93 as the digits 0 and 93 and reported ratios in the
 * millions. Canvas does not care about notation, and layering handles alpha.
 */

const CHECKS = [
  { label: 'body copy (About)', sel: '#about p', on: 'body' },
  { label: 'nav link', sel: 'header nav ul a', on: 'body' },
  { label: 'hero kicker (accent)', sel: '#top p', on: 'body' },
  { label: 'section label (accent)', sel: '#about span', on: 'body' },
  { label: 'project desc on surface', sel: '#projects p.text-muted', on: 'card' },
  { label: 'status badge on surface', sel: '#projects span.rounded-full', on: 'card' },
  { label: 'footer copyright', sel: 'footer p', text: '©', on: 'body' },
  { label: 'media note', sel: '#media p.italic', on: 'card' },
] as const

for (const theme of ['light', 'dark'] as const) {
  test(`text meets AA in the ${theme} theme`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'contrast does not change with width')
    await page.addInitScript(t => localStorage.setItem('theme', t), theme)
    await page.goto('/classic')
    await page.evaluate(() => document.querySelectorAll('.section-fade').forEach(n => n.classList.add('visible')))

    const rows = await page.evaluate(checks => {
      const cv = document.createElement('canvas')
      cv.width = cv.height = 4
      const g = cv.getContext('2d', { willReadFrequently: true })!
      const rgbOf = (...layers: string[]) => {
        g.clearRect(0, 0, 4, 4)
        for (const c of layers) {
          if (!c || c === 'transparent') continue
          g.fillStyle = c
          g.fillRect(0, 0, 4, 4)
        }
        const d = g.getImageData(1, 1, 1, 1).data
        return [d[0], d[1], d[2]]
      }
      const lum = (rgb: number[]) =>
        rgb
          .map(v => {
            v /= 255
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
          })
          .reduce((acc, v, i) => acc + [0.2126, 0.7152, 0.0722][i] * v, 0)
      const ratio = (a: number[], b: number[]) => {
        const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
        return +((x + 0.05) / (y + 0.05)).toFixed(2)
      }

      const body = getComputedStyle(document.body).backgroundColor
      const cardEl = document.querySelector('#projects .bg-surface')
      const card = cardEl ? getComputedStyle(cardEl).backgroundColor : body

      return checks.map(c => {
        const el = [...document.querySelectorAll(c.sel)].find(n => !('text' in c) || n.textContent?.includes(c.text!))
        if (!el) return { label: c.label, r: null }
        const cs = getComputedStyle(el)
        // An element's own background sits over its container's, so a
        // translucent chip is measured against what it actually sits on.
        return { label: c.label, r: ratio(rgbOf(cs.color), rgbOf(c.on === 'card' ? card : body, cs.backgroundColor)) }
      })
    }, CHECKS as unknown as { label: string; sel: string; text?: string; on: string }[])

    for (const row of rows) {
      // A selector that stops matching is a broken check, not a pass. That is
      // how the footer check vanished once when its markup moved.
      expect(row.r, `${row.label}: no element matched`).not.toBeNull()
      // 21:1 is black on white. Anything above it is a bad measurement.
      expect(row.r!, `${row.label}: implausible ratio`).toBeLessThanOrEqual(21)
      expect(row.r!, `${row.label} contrast`).toBeGreaterThanOrEqual(4.5)
    }
  })
}
