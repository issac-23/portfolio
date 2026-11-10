import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { expectSettledOn, openApp, openMenu } from './helpers/dsi'

/**
 * Every move the console makes, read off data-console on the device.
 *
 * Launching, returning and booting last well under a second, so nothing here
 * polls for them. A recorder installed before the page loads notes each value
 * the attribute takes, in order, and the tests assert on that sequence.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/api/spotify/now-playing', r =>
    r.fulfill({ contentType: 'application/json', body: '{"isPlaying":false,"recentTracks":[]}' }),
  )
  await page.addInitScript(() => {
    const seen: string[] = []
    ;(window as unknown as { __console: string[] }).__console = seen
    const read = () => {
      const v = document.querySelector('.dsi-device')?.getAttribute('data-console')
      if (v && seen[seen.length - 1] !== v) seen.push(v)
    }
    // The server renders the first value, which never fires an attribute
    // mutation, so watch the tree filling in as well.
    new MutationObserver(read).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-console'],
    })
  })
})

const seen = (page: Page) => page.evaluate(() => (window as unknown as { __console: string[] }).__console)
const sequence = (page: Page) => expect.poll(() => seen(page), { timeout: 10_000 })
const phase = (page: Page) => page.locator('.dsi-device')
const power = (page: Page, name: 'Power off' | 'Power on') => page.getByRole('button', { name })
const hash = (page: Page) => new URL(page.url()).hash

test('the console starts on the menu', async ({ page }) => {
  await openMenu(page)
  await expect(phase(page)).toHaveAttribute('data-console', 'menu')
  await sequence(page).toEqual(['menu'])
})

test('menu to launching to app, and back through returning to the menu', async ({ page }) => {
  await openApp(page, 'Projects')
  await expect(phase(page)).toHaveAttribute('data-console', 'app')
  await sequence(page).toEqual(['menu', 'launching', 'app'])
  expect(hash(page)).toBe('#projects')

  await page.keyboard.press('Escape')
  await expect(page.locator('.dsi-rail[data-ready]')).toBeAttached()
  await expectSettledOn(page, 'Projects')
  await sequence(page).toEqual(['menu', 'launching', 'app', 'returning', 'menu'])
  expect(hash(page)).toBe('')
})

test('the Back button returns the same way as Escape', async ({ page }) => {
  await openApp(page, 'Profile')
  await page.getByRole('button', { name: 'Back' }).click()
  await expectSettledOn(page, 'Profile')
  await sequence(page).toEqual(['menu', 'launching', 'app', 'returning', 'menu'])
})

test('power off from the menu, then back on, plays the boot', async ({ page }) => {
  await openMenu(page)
  await power(page, 'Power off').click()
  await expect(phase(page)).toHaveAttribute('data-console', 'off')
  await power(page, 'Power on').click()
  await expectSettledOn(page, 'Profile')
  await sequence(page).toEqual(['menu', 'off', 'booting', 'menu'])
})

test('power off from an app goes straight to off and clears the address', async ({ page }) => {
  await openApp(page, 'Projects')
  await power(page, 'Power off').click()
  await expect(phase(page)).toHaveAttribute('data-console', 'off')
  await expect.poll(() => hash(page)).toBe('')
  await sequence(page).toEqual(['menu', 'launching', 'app', 'off'])
})

test('switching on after an app lands on the menu with the rail on Profile', async ({ page }) => {
  await openApp(page, 'Projects')
  await power(page, 'Power off').click()
  await power(page, 'Power on').click()
  await expectSettledOn(page, 'Profile')
})

test('an address that names an app opens it with no launch', async ({ page }) => {
  await page.goto('/#projects')
  await page.locator('.dsi-app-lower').waitFor({ timeout: 20_000 })
  await expect(phase(page)).toHaveAttribute('data-console', 'app')
  await sequence(page).toEqual(['menu', 'app'])
})

test('a hash change opens an app from the menu and switches apps from an app', async ({ page }) => {
  await openMenu(page)
  await page.evaluate(() => {
    location.hash = '#projects'
  })
  await expect(phase(page)).toHaveAttribute('data-console', 'app')
  await page.evaluate(() => {
    location.hash = '#sound'
  })
  await expect(page.locator('.dsi-app-lower')).toBeVisible()
  await expect(phase(page)).toHaveAttribute('data-console', 'app')
  await sequence(page).toEqual(['menu', 'app'])
  // The way out lands on the app it opened on.
  await page.getByRole('button', { name: 'Back' }).click()
  await expectSettledOn(page, 'Nintendo DSi Sound')
})

test('a hash that names no app, or a dark console, changes nothing', async ({ page }) => {
  await openMenu(page)
  await page.evaluate(() => {
    location.hash = '#nothing'
  })
  await expect(phase(page)).toHaveAttribute('data-console', 'menu')
  await power(page, 'Power off').click()
  await page.evaluate(() => {
    location.hash = '#projects'
  })
  await page.waitForTimeout(500)
  await expect(phase(page)).toHaveAttribute('data-console', 'off')
  await sequence(page).toEqual(['menu', 'off'])
})

test('a second launch, and power, are ignored while a launch is running', async ({ page }) => {
  await openMenu(page)
  // All in one task, so nothing can finish in between.
  await page.evaluate(() => {
    const slot = document.querySelector<HTMLElement>('.dsi-slot[data-sel]')!
    slot.click()
    slot.click()
    document.querySelector<HTMLElement>('.dsi-power')!.click()
  })
  await page.locator('.dsi-app-lower').waitFor()
  await sequence(page).toEqual(['menu', 'launching', 'app'])
})

test('a second Escape, and power, are ignored while returning', async ({ page }) => {
  await openApp(page, 'Profile')
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    document.querySelector<HTMLElement>('.dsi-power')!.click()
  })
  await expectSettledOn(page, 'Profile')
  await sequence(page).toEqual(['menu', 'launching', 'app', 'returning', 'menu'])
})

test.describe('with the DSi less-motion setting on', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dsi-motion', 'reduce'))
  })

  test('launch and return still end in the app and the menu, and power on skips the boot', async ({ page }) => {
    await openApp(page, 'Projects')
    await expect(phase(page)).toHaveAttribute('data-console', 'app')
    await page.keyboard.press('Escape')
    await expectSettledOn(page, 'Projects')
    await expect(phase(page)).toHaveAttribute('data-console', 'menu')

    await power(page, 'Power off').click()
    await power(page, 'Power on').click()
    await expect(phase(page)).toHaveAttribute('data-console', 'menu')
    expect(await seen(page)).not.toContain('booting')
  })
})

test.describe('with the boot screen on', () => {
  test.use({ boot: true })

  test('booting hands over to the menu, and any key skips it', async ({ page }) => {
    // Hold the fade and the timer, so only the key can end it.
    await page.addInitScript(() => {
      const set = window.setTimeout.bind(window)
      window.setTimeout = ((fn: TimerHandler, ms?: number, ...a: unknown[]) =>
        set(fn, ms === 3000 ? 60_000 : ms, ...a)) as typeof window.setTimeout
      document.addEventListener('DOMContentLoaded', () => {
        const st = document.createElement('style')
        st.textContent = '.dsi-boot, .dsi-boot-mark { animation-delay: 60s !important }'
        document.head.append(st)
      })
    })
    await page.goto('/')
    await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 20_000 })
    await expect(phase(page)).toHaveAttribute('data-console', 'booting')
    await page.keyboard.press('ArrowRight')
    await expect(phase(page)).toHaveAttribute('data-console', 'menu')
    // The server's own menu comes first, then the boot the script started.
    await sequence(page).toEqual(['menu', 'booting', 'menu'])
    await expectSettledOn(page, 'Profile')
  })
})

test.describe('the pre-paint boot rule', () => {
  // The fixture would mark every visit as booted, which would make each skip
  // below pass without proving anything.
  test.use({ boot: true })

  // Notes whether data-boot was ever set, not just whether it is set when the
  // test looks: the boot ends by itself within seconds.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __bootSeen: boolean }
      w.__bootSeen = false
      new MutationObserver(() => {
        if ('boot' in document.documentElement.dataset) w.__bootSeen = true
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-boot'] })
    })
  })

  const bootSeen = (page: Page) => page.evaluate(() => (window as unknown as { __bootSeen: boolean }).__bootSeen)

  test('a first visit boots', async ({ page }) => {
    await page.goto('/')
    expect(await bootSeen(page)).toBe(true)
  })

  test('a visit that already booted does not boot again', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('dsi-booted', '1'))
    await page.goto('/')
    await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 20_000 })
    expect(await bootSeen(page)).toBe(false)
    await expect(phase(page)).toHaveAttribute('data-console', 'menu')
  })

  test("the DSi's own less-motion setting does not boot", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dsi-motion', 'reduce'))
    await page.goto('/')
    await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 20_000 })
    expect(await bootSeen(page)).toBe(false)
    await expect(phase(page)).toHaveAttribute('data-console', 'menu')
  })

  test('plain view does not boot', async ({ page }) => {
    await page.goto('/?view=plain')
    expect(await bootSeen(page)).toBe(false)
    await expect(page.locator('html')).not.toHaveAttribute('data-boot', '')
  })

  test('any hash does not boot, even one that names no app', async ({ page }) => {
    await page.goto('/#nothing')
    await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 20_000 })
    expect(await bootSeen(page)).toBe(false)
    await expect(phase(page)).toHaveAttribute('data-console', 'menu')
  })
})
