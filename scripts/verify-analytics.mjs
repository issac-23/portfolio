/**
 * Confirms Vercel Web Analytics is actually reporting from the live site.
 *
 * The <Analytics /> component injects its script client-side, so this cannot be
 * checked by grepping the server-rendered HTML — it needs a real browser.
 */
import { chromium } from 'playwright'

const SITE = process.env.SITE ?? 'https://www.issac-ip.com'

const browser = await chromium.launch()
const page = await browser.newPage()

// Once Web Analytics is enabled, Vercel serves the script from a per-project
// obfuscated path (e.g. /9fcec1ec.../script.js) rather than /_vercel/insights,
// so that ad blockers can't pattern-match it. Match the shape, not a literal.
const isAnalytics = (u) => /\/[0-9a-f]{8,}\/(script\.js|view|event)/.test(u) || u.includes('/_vercel/insights')

const hits = []
page.on('request', (r) => {
  if (isAnalytics(r.url())) hits.push({ url: r.url(), method: r.method(), status: null })
})
page.on('response', (r) => {
  if (isAnalytics(r.url())) {
    const hit = hits.find((h) => h.url === r.url() && h.status === null)
    if (hit) hit.status = r.status()
  }
})

await page.goto(SITE, { waitUntil: 'load' })
await page.waitForTimeout(6000)

const scriptTag = await page.evaluate(
  () => [...document.scripts].map((s) => s.src).find((s) => /\/[0-9a-f]{8,}\/script\.js/.test(s)) ?? null
)
// The script defines these globals once it has loaded and initialized.
const globals = await page.evaluate(() => `window.va=${typeof window.va}, window.vaq=${typeof window.vaq}`)

console.log(`site: ${SITE}`)
console.log(`script:  ${scriptTag ?? 'NOT INJECTED'}`)
console.log(`globals: ${globals}`)
console.log('requests:')
console.log(hits.length ? hits.map((h) => `  ${h.method} ${h.url} -> ${h.status}`).join('\n') : '  (none)')

const scriptOk = !!scriptTag && hits.some((h) => h.url.endsWith('script.js') && h.status === 200)
const globalsOk = globals.includes('window.va=function')

console.log(
  `\n${scriptOk && globalsOk ? 'Analytics is enabled and loading.' : 'Analytics is NOT active.'}`
)
if (scriptOk && globalsOk) {
  console.log('The obfuscated script path only exists once Web Analytics is enabled in the dashboard.')
}

await browser.close()
