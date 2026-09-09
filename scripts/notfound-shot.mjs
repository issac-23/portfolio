/** Screenshots the 404 page in both themes. */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

// Override when 3000 is taken by another project: SITE=http://localhost:3009
const SITE = process.env.SITE ?? 'http://localhost:3000'
const label = process.argv[2] ?? '404'
await mkdir(`shots/${label}`, { recursive: true })

const browser = await chromium.launch()
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 700 } })
  await ctx.addInitScript(`localStorage.setItem('theme', '${theme}')`)
  const page = await ctx.newPage()
  await page.goto(`${SITE}/does-not-exist`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `shots/${label}/404-${theme}.png` })
  console.log(`captured 404-${theme}`)
  await ctx.close()
}
await browser.close()
