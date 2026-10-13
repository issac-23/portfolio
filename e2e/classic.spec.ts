import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/**
 * The classic site at /, ported from scripts/journeys.mjs. Each check there
 * was a bug once, so each one is still here, now failing the build instead
 * of printing FAIL into a log nobody reads.
 */

const reveal = (page: Page) =>
  page.evaluate(() => document.querySelectorAll('.section-fade').forEach(n => n.classList.add('visible')))

test.describe('mobile menu', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'mobile', 'the menu only exists at phone width'))

  test('stays out of the tab order while closed', async ({ page }) => {
    await page.goto('/')
    // Nav sets inert from an effect, so this holds from hydration on. The old
    // script waited 600ms for the same reason; this waits for the attribute.
    await page.locator('#mobile-menu[inert]').waitFor({ state: 'attached' })
    const focusable = await page.evaluate(() => {
      const a = document.querySelector<HTMLAnchorElement>('#mobile-menu a')
      a?.focus()
      return document.activeElement === a
    })
    expect(focusable, 'links in the collapsed menu must not take focus').toBe(false)
  })

  test('opens, locks the page, navigates, closes and marks the section', async ({ page }) => {
    await page.goto('/')
    const menu = page.locator('#mobile-menu')
    await page.getByRole('button', { name: /menu/i }).click()
    await expect.poll(() => menu.evaluate(n => n.getBoundingClientRect().height)).toBeGreaterThan(50)

    await page.mouse.wheel(0, 500)
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => window.scrollY), 'page scrolled behind the open menu').toBe(0)

    await page.locator('#mobile-menu a[href="#projects"]').click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
    await expect.poll(() => menu.evaluate(n => n.getBoundingClientRect().height)).toBeLessThan(50)
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll('header a[aria-current="true"]')].map(a => a.getAttribute('href'))))
      .toEqual(expect.arrayContaining(['#projects']))
    const active = await page.evaluate(() => [...document.querySelectorAll('header a[aria-current="true"]')].map(a => a.getAttribute('href')))
    expect(active.every(h => h === '#projects'), `aria-current on ${active.join(', ')}`).toBe(true)
  })
})

test.describe('desktop', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'checked once, at desktop width'))

  test('theme toggle switches, adapts the chrome and persists', async ({ page }) => {
    await page.goto('/')
    const before = await page.evaluate(() => document.documentElement.className)
    await page.locator('button[aria-label*="mode"]').click()
    const after = await page.evaluate(() => document.documentElement.className)
    expect(after).not.toBe(before)

    // Both of these were hardcoded to dark-mode colours once.
    const rules = await page.evaluate(() =>
      [...document.styleSheets]
        .flatMap(s => {
          try {
            return [...s.cssRules]
          } catch {
            return []
          }
        })
        .map(r => r.cssText),
    )
    expect(rules.filter(t => t.includes('::selection') && /#EDE8E3/i.test(t)), '::selection hardcoded').toEqual([])
    expect(rules.filter(t => t.includes('-webkit-scrollbar-track') && /#0C0A09/i.test(t)), 'scrollbar hardcoded').toEqual([])

    await page.reload()
    expect((await page.evaluate(() => document.documentElement.className)).trim()).toBe(after.trim())
  })

  test('the media filter exposes its state, filters and animates', async ({ page }) => {
    await page.goto('/')
    await reveal(page)
    const tabs = page.locator('#media button')
    expect(await tabs.count()).toBeGreaterThan(1)
    const exposes = await page.evaluate(() =>
      [...document.querySelectorAll('#media button')].some(b => b.hasAttribute('aria-selected') || b.hasAttribute('aria-pressed')),
    )
    expect(exposes, 'the active filter must not be colour-only').toBe(true)

    const count = () => page.evaluate(() => document.querySelectorAll('#media a[target="_blank"]').length)
    const all = await count()
    await tabs.nth(1).click()
    await expect.poll(count).not.toBe(all)

    const motion = await page.evaluate(async () => {
      const list = document.querySelector('#media .t-filter-list')
      if (!list) return 'no .t-filter-list'
      if (getComputedStyle(list).transitionDuration === '0s') return 'no transition'
      ;[...document.querySelectorAll<HTMLElement>('#media button')].find(b => b.getAttribute('aria-pressed') === 'false')?.click()
      await new Promise(r => setTimeout(r, 60))
      return list.classList.contains('is-swapping') ? 'ok' : 'is-swapping never applied'
    })
    expect(motion).toBe('ok')
  })

  test('the gallery lightbox loads right-sized images and behaves as a dialog', async ({ page }) => {
    await page.goto('/')
    await reveal(page)
    // Thumbnails are lazy, so one below the fold never loads until it is
    // scrolled to. Linux renders taller text than Windows, which is enough to
    // push the last one under the fold in CI. Scroll through them the way a
    // visitor would, and give a cold image optimizer time to answer.
    const thumbs = page.locator('#gallery img')
    for (let i = 0; i < (await thumbs.count()); i++) await thumbs.nth(i).scrollIntoViewIfNeeded()
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            [...document.querySelectorAll<HTMLImageElement>('#gallery img')]
              .filter(i => i.naturalWidth === 0)
              .map(i => {
                // Enough to tell "never asked for" from "asked and failed"
                // from "not where we think it is", from a CI log alone.
                const r = i.getBoundingClientRect()
                const cs = getComputedStyle(i)
                return {
                  src: i.getAttribute('src'),
                  current: i.currentSrc,
                  complete: i.complete,
                  loading: i.loading,
                  rect: [r.left, r.top, r.width, r.height].map(Math.round),
                  viewport: [innerWidth, innerHeight, Math.round(scrollY)],
                  shown: cs.display !== 'none' && cs.visibility !== 'hidden',
                }
              }),
          ),
        { message: 'every gallery thumbnail loads', timeout: 15_000 },
      )
      .toEqual([])
    await page.locator('#gallery').scrollIntoViewIfNeeded()

    // A ~280px thumbnail must not fetch a variant 4x its size.
    const oversized = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLImageElement>('#gallery img')]
        .map(i => ({ picked: parseInt(i.currentSrc.match(/w=(\d+)/)?.[1] ?? '0', 10), shown: Math.round(i.getBoundingClientRect().width) }))
        .filter(i => i.picked > Math.max(i.shown, 1) * 4),
    )
    expect(oversized).toEqual([])

    const before = await page.evaluate(() => window.scrollY)
    await page.locator('#gallery button').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? ''))
      .toMatch(/Previous|Next|Close/)

    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(300)
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before), 'page scrolled behind the modal').toBeLessThan(5)

    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    expect(await page.evaluate(() => document.activeElement?.tagName), 'focus goes back to the thumbnail').toBe('BUTTON')
  })

  test('skip link, link previews, favicon, one h1 and a legible footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeAttached()
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /.+/)
    await expect(page.locator('link[rel*="icon"]').first()).toBeAttached()
    await expect(page.locator('h1')).toHaveCount(1)

    const opacity = await page.evaluate(() => {
      const p = [...document.querySelectorAll('footer p')].find(n => n.textContent?.includes('©'))
      return p ? parseFloat(getComputedStyle(p).opacity) : null
    })
    expect(opacity, 'footer copyright found and not faded out').toBeGreaterThanOrEqual(0.7)
  })
})
