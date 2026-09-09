import { chromium, devices } from 'playwright'
import { mkdir } from 'node:fs/promises'

const LABEL = process.argv[2] ?? 'before'
// Override when 3000 is taken by another project: SITE=http://localhost:3009
const URL = process.env.SITE ?? 'http://localhost:3000'
const OUT = `shots/${LABEL}-journeys`
const findings = []

const log = (j, step, ok, detail) => {
  findings.push({ journey: j, step, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${j}] ${step}${detail ? ' — ' + detail : ''}`)
}

async function journeyMobileMenu(browser) {
  const J = 'mobile-menu'
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
  })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(600)

  const toggle = page.locator('button[aria-label="Open menu"], button[aria-label="Close menu"], button[aria-label="Toggle menu"]')
  const menu = page.locator('#mobile-menu')

  await page.screenshot({ path: `${OUT}/${J}-01-closed.png` })

  // closed menu must not be reachable by keyboard
  const hiddenLinkFocusable = await page.evaluate(() => {
    const panel = document.querySelector('#mobile-menu')
    if (!panel) return null
    const a = panel.querySelector('a')
    if (!a) return null
    a.focus()
    return document.activeElement === a
  })
  log(J, 'closed menu links removed from tab order', hiddenLinkFocusable === false,
    hiddenLinkFocusable ? 'links inside collapsed menu are still focusable (max-h-0 does not remove them)' : '')

  await toggle.click()
  await page.waitForTimeout(450)
  await page.screenshot({ path: `${OUT}/${J}-02-open.png` })

  const openH = await menu.evaluate((n) => n.getBoundingClientRect().height)
  log(J, 'menu opens', openH > 50, `panel height ${Math.round(openH)}px`)

  // does opening the menu lock page scroll?
  await page.mouse.wheel(0, 500)
  await page.waitForTimeout(300)
  const scrolledWithMenuOpen = await page.evaluate(() => window.scrollY)
  log(J, 'body scroll locked while menu open', scrolledWithMenuOpen === 0,
    scrolledWithMenuOpen > 0 ? `page scrolled ${scrolledWithMenuOpen}px behind open menu` : '')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)

  // tap a nav link
  const projectsLink = page.locator('#mobile-menu a[href="#projects"]')
  await projectsLink.click()
  await page.waitForTimeout(900)
  const afterNav = await page.evaluate(() => ({ y: window.scrollY, h: document.querySelector('#mobile-menu').getBoundingClientRect().height }))
  log(J, 'nav link scrolls to section', afterNav.y > 100, `scrollY ${Math.round(afterNav.y)}`)
  log(J, 'menu closes after selecting link', afterNav.h < 50, `panel height ${Math.round(afterNav.h)}px`)
  await page.screenshot({ path: `${OUT}/${J}-03-after-nav.png` })

  // is the active section reflected in nav?
  const activeCount = await page.evaluate(() => {
    return [...document.querySelectorAll('header a[href^="#"]')].filter(a => getComputedStyle(a).color === getComputedStyle(document.body).color).length
  })
  log(J, 'active section indicated in nav', activeCount > 0, `${activeCount} link(s) in active color`)

  await ctx.close()
}

async function journeyTheme(browser) {
  const J = 'theme-toggle'
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const consoleErrors = []
  // /_vercel/insights/script.js only exists on Vercel once Web Analytics is
  // enabled in the dashboard, so it 404s on localhost. Not a real error.
  // The URL is on location(), not in the message text, for network errors.
  const expected = (m) =>
    `${m.location()?.url ?? ''} ${m.text()}`.includes('/_vercel/insights/')
  page.on('console', (m) => {
    if (m.type() === 'error' && !expected(m)) consoleErrors.push(m.text().slice(0, 120))
  })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(700)

  log(J, 'no hydration/console errors on load', consoleErrors.length === 0,
    consoleErrors.length ? consoleErrors[0] : '')

  const btn = page.locator('button[aria-label*="mode"]')
  const before = await page.evaluate(() => document.documentElement.className)
  await btn.click()
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => document.documentElement.className)
  log(J, 'toggle switches theme', before !== after, `${before.trim()} -> ${after.trim()}`)
  await page.screenshot({ path: `${OUT}/${J}-01-toggled.png` })

  // light-mode regressions
  const lightBugs = await page.evaluate(() => {
    const sel = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules] } catch { return [] } })
    const find = (t) => sel.filter(r => r.selectorText && r.selectorText.includes(t)).map(r => r.cssText)
    return {
      selection: find('::selection'),
      scrollbarTrack: find('-webkit-scrollbar-track'),
      scrollbarThumb: find('-webkit-scrollbar-thumb'),
    }
  })
  const selHard = lightBugs.selection.some(t => /#EDE8E3/i.test(t))
  const sbHard = lightBugs.scrollbarTrack.some(t => /#0C0A09/i.test(t))
  log(J, '::selection adapts to theme', !selHard, selHard ? 'selection color hardcoded to dark-mode ink #EDE8E3' : '')
  log(J, 'scrollbar adapts to theme', !sbHard, sbHard ? 'scrollbar track hardcoded to #0C0A09 (dark) in light mode' : '')

  // persistence
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(600)
  const afterReload = await page.evaluate(() => document.documentElement.className)
  log(J, 'theme persists across reload', afterReload.trim() === after.trim(), `${afterReload.trim()}`)

  await ctx.close()
}

async function journeyMediaFilter(browser) {
  const J = 'media-filter'
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => document.querySelectorAll('.section-fade').forEach(n => n.classList.add('visible')))
  await page.locator('#media').scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)

  const tabs = page.locator('#media button')
  const n = await tabs.count()
  log(J, 'filter tabs render', n > 1, `${n} tabs`)

  const roleInfo = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#media button')]
    const wrap = btns[0]?.parentElement
    return {
      hasTablist: wrap?.getAttribute('role') === 'tablist',
      anyAriaSelected: btns.some(b => b.hasAttribute('aria-selected')),
      anyAriaPressed: btns.some(b => b.hasAttribute('aria-pressed')),
    }
  })
  log(J, 'filter tabs expose selected state to AT', roleInfo.anyAriaSelected || roleInfo.anyAriaPressed,
    'no aria-selected/aria-pressed — active filter is colour-only')

  const countFor = async () => page.evaluate(() => document.querySelectorAll('#media a[target="_blank"]').length)
  const allCount = await countFor()
  await page.screenshot({ path: `${OUT}/${J}-01-all.png` })

  await tabs.nth(1).click()
  await page.waitForTimeout(500)
  const filtered = await countFor()
  log(J, 'filter changes result set', filtered !== allCount, `all=${allCount} -> filtered=${filtered}`)
  await page.screenshot({ path: `${OUT}/${J}-02-filtered.png` })

  // does the list transition on filter change?
  const motion = await page.evaluate(async () => {
    const list = document.querySelector('#media .t-filter-list')
    if (!list) return { hasHook: false }
    const hasTransition = getComputedStyle(list).transitionDuration !== '0s'
    const tabs = [...document.querySelectorAll('#media button')]
    const other = tabs.find((b) => b.getAttribute('aria-pressed') === 'false')
    other?.click()
    await new Promise((r) => setTimeout(r, 60))
    return {
      hasHook: true,
      hasTransition,
      swappingApplied: document.querySelector('#media .t-filter-list')?.classList.contains('is-swapping') ?? false,
    }
  })
  log(J, 'filtered list transitions on change', !!(motion.hasHook && motion.hasTransition && motion.swappingApplied),
    JSON.stringify(motion))

  await ctx.close()
}

async function journeyLightbox(browser) {
  const J = 'gallery-lightbox'
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => document.querySelectorAll('.section-fade').forEach(n => n.classList.add('visible')))
  await page.locator('#gallery').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)

  const imgLoad = await page.evaluate(() =>
    [...document.querySelectorAll('#gallery img')].map((i) => ({
      w: i.naturalWidth,
      rendered: Math.round(i.getBoundingClientRect().width),
      // currentSrc is what the browser actually picked from srcset
      picked: parseInt(i.currentSrc?.match(/w=(\d+)/)?.[1] ?? '0', 10),
      hasSizes: !!i.getAttribute('sizes'),
    }))
  )
  const unloaded = imgLoad.filter((i) => i.w === 0).length
  log(J, 'all gallery thumbnails load', unloaded === 0, `${unloaded}/${imgLoad.length} still at naturalWidth 0`)
  // a thumbnail rendered at ~280px should not be fetching a 4x+ oversized variant
  const oversized = imgLoad.filter((i) => i.picked > Math.max(i.rendered, 1) * 4)
  log(J, 'thumbnails request an appropriate size', oversized.length === 0,
    oversized.length
      ? `${oversized.length} oversized: ${oversized.map((o) => `picked w=${o.picked} for ${o.rendered}px`).join(', ')}`
      : `picked ${imgLoad.map((i) => i.picked).join('/')} for ~${imgLoad[0]?.rendered}px`)

  const scrollBefore = await page.evaluate(() => window.scrollY)
  await page.locator('#gallery button').first().click()
  await page.waitForTimeout(500)

  const lb = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]')
    const backdrop = [...document.querySelectorAll('div')].find(
      (n) => getComputedStyle(n).position === 'fixed' && (n.style.background ?? '').includes('rgba(0,0,0')
    )
    return {
      present: !!(dlg || backdrop),
      role: dlg?.getAttribute('role') ?? null,
      ariaModal: dlg?.getAttribute('aria-modal') ?? null,
      bodyOverflow: getComputedStyle(document.body).overflow,
      activeEl: document.activeElement?.tagName + '.' + (document.activeElement?.getAttribute('aria-label') ?? ''),
    }
  })
  log(J, 'lightbox opens', lb.present)
  await page.screenshot({ path: `${OUT}/${J}-01-open.png` })

  log(J, 'lightbox exposes dialog semantics', lb.role === 'dialog' && lb.ariaModal === 'true',
    `role=${lb.role} aria-modal=${lb.ariaModal}`)

  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(300)
  const scrollDuring = await page.evaluate(() => window.scrollY)
  log(J, 'background scroll locked while lightbox open', Math.abs(scrollDuring - scrollBefore) < 5,
    Math.abs(scrollDuring - scrollBefore) >= 5 ? `page scrolled ${Math.round(scrollDuring - scrollBefore)}px behind the modal` : '')

  log(J, 'focus moves into the lightbox', /Previous|Next|Close/.test(lb.activeEl ?? ''),
    `activeElement is ${lb.activeEl}`)

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${J}-02-next.png` })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  const closed = await page.evaluate(() => !document.querySelector('[role="dialog"]'))
  log(J, 'Escape closes lightbox', closed)

  const focusAfter = await page.evaluate(() => document.activeElement?.tagName)
  log(J, 'focus returns to trigger after close', focusAfter === 'BUTTON', `activeElement ${focusAfter}`)
  await page.screenshot({ path: `${OUT}/${J}-03-closed.png` })

  await ctx.close()
}

async function journeyKeyboardAndMeta(browser) {
  const J = 'keyboard-and-meta'
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)

  const skip = await page.evaluate(() => !!document.querySelector('a[href="#main"], a[href^="#"].skip, a[class*="skip"]'))
  log(J, 'skip-to-content link present', skip, skip ? '' : 'no skip link; keyboard users tab through the whole nav')

  const meta = await page.evaluate(() => ({
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.content ?? null,
    ogImage: document.querySelector('meta[property="og:image"]')?.content ?? null,
    favicon: !!document.querySelector('link[rel*="icon"]'),
    lang: document.documentElement.lang,
    h1Count: document.querySelectorAll('h1').length,
    viewportMeta: !!document.querySelector('meta[name="viewport"]'),
  }))
  log(J, 'has og:image for link previews', !!meta.ogImage, meta.ogImage ? '' : 'no og:image — shared links render as a bare text card')
  log(J, 'has favicon', meta.favicon, meta.favicon ? '' : 'no favicon link')
  log(J, 'exactly one h1', meta.h1Count === 1, `${meta.h1Count} h1`)

  const contrast = await page.evaluate(() => {
    const lum = (c) => { const [r,g,b] = c.match(/\d+/g).map(Number).map(v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4) }); return 0.2126*r+0.7152*g+0.0722*b }
    const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05) }
    const bg = getComputedStyle(document.body).backgroundColor
    const out = []
    for (const sel of ['#about p', '#projects p.text-muted', 'header nav ul a', '#contact p.text-xs']) {
      const el = document.querySelector(sel)
      if (el) out.push({ sel, color: getComputedStyle(el).color, ratio: +ratio(getComputedStyle(el).color, bg).toFixed(2) })
    }
    return out
  })
  const lowContrast = contrast.filter(c => c.ratio < 4.5)
  log(J, 'body text meets WCAG AA 4.5:1', lowContrast.length === 0,
    lowContrast.map(c => `${c.sel} = ${c.ratio}:1`).join('; '))

  const footerOpacity = await page.evaluate(() => {
    const p = [...document.querySelectorAll('#contact p')].find(n => n.textContent.includes('©'))
    return p ? { opacity: getComputedStyle(p).opacity, color: getComputedStyle(p).color } : null
  })
  log(J, 'footer copyright is legible', footerOpacity && parseFloat(footerOpacity.opacity) >= 0.7,
    footerOpacity ? `opacity ${footerOpacity.opacity} on already-muted colour` : '')

  await ctx.close()
}

async function run() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  await journeyMobileMenu(browser)
  await journeyTheme(browser)
  await journeyMediaFilter(browser)
  await journeyLightbox(browser)
  await journeyKeyboardAndMeta(browser)
  await browser.close()

  const fails = findings.filter(f => !f.ok)
  console.log(`\n===== ${findings.length} checks, ${fails.length} FAIL =====`)
  for (const f of fails) console.log(`  FAIL [${f.journey}] ${f.step}${f.detail ? ' — ' + f.detail : ''}`)
}

run()
