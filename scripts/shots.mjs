import { chromium, devices } from 'playwright'
import { mkdir } from 'node:fs/promises'

const LABEL = process.argv[2] ?? 'before'
// Override when 3000 is taken by another project: SITE=http://localhost:3009
const URL = process.env.SITE ?? 'http://localhost:3000'
const OUT = `shots/${LABEL}`

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, dsf: 1 },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, dsf: 3 },
]

const THEMES = ['dark', 'light']

async function run() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: vp.viewport,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
        deviceScaleFactor: vp.dsf,
        userAgent: vp.isMobile ? devices['iPhone 13'].userAgent : undefined,
      })
      await context.addInitScript(`localStorage.setItem('theme', '${theme}')`)
      const page = await context.newPage()
      await page.goto(URL, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('load')
      // reveal all scroll-triggered sections so the full page is captured
      await page.evaluate(() => {
        document.querySelectorAll('.section-fade').forEach((n) => n.classList.add('visible'))
      })
      await page.waitForTimeout(900)
      const tag = `${vp.name}-${theme}`
      await page.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: true })
      await page.screenshot({ path: `${OUT}/${tag}-fold.png` })
      console.log(`captured ${tag}`)
      await context.close()
    }
  }

  await browser.close()
}

run()
