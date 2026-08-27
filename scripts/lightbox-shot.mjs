import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const LABEL = process.argv[2] ?? 'after'
const OUT = `shots/${LABEL}`
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => document.querySelectorAll('.section-fade').forEach((n) => n.classList.add('visible')))
await page.locator('#gallery').scrollIntoViewIfNeeded()
await page.waitForTimeout(2500)
await page.locator('#gallery button').first().click()
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/lightbox.png` })
console.log(`wrote ${OUT}/lightbox.png`)
await browser.close()
