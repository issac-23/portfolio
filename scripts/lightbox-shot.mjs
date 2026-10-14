/** Opens the first photo in the classic site's gallery lightbox and captures it. */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { openClassicGallery } from './classic.mjs'

const LABEL = process.argv[2] ?? 'after'
const OUT = `shots/${LABEL}`
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await openClassicGallery(page)
await page.waitForTimeout(2500)
await page.locator('#gallery button').first().click()
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/lightbox.png` })
console.log(`wrote ${OUT}/lightbox.png`)
await browser.close()
