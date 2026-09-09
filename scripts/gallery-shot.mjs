/** Captures just the gallery section at desktop and mobile widths. */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

// Override when 3000 is taken by another project: SITE=http://localhost:3009
const SITE = process.env.SITE ?? 'http://localhost:3000'
const label = process.argv[2] ?? 'gallery'
await mkdir(`shots/${label}`, { recursive: true })

const browser = await chromium.launch()
for (const [w, h, name] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(SITE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => document.querySelectorAll('.section-fade').forEach((n) => n.classList.add('visible')))
  await page.locator('#gallery').scrollIntoViewIfNeeded()
  await page.waitForTimeout(2500)
  await page.locator('#gallery').screenshot({ path: `shots/${label}/gallery-${name}.png` })

  const info = await page.evaluate(() => {
    const col = document.querySelector('#gallery button')?.parentElement
    const imgs = [...document.querySelectorAll('#gallery img')]
    return {
      columns: getComputedStyle(col).columnCount,
      loaded: `${imgs.filter((i) => i.naturalWidth > 0).length}/${imgs.length}`,
      sectionHeight: Math.round(document.querySelector('#gallery').getBoundingClientRect().height),
    }
  })
  console.log(name, JSON.stringify(info))
  await page.close()
}
await browser.close()
