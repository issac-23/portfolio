import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { APPS, effectsEmpty, expectSettledOn, openApp, openMenu } from './helpers/dsi'

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
const html = (page: Page) => page.locator('html')
const power = (page: Page, name: 'Power off' | 'Power on') => page.getByRole('button', { name })
const hash = (page: Page) => new URL(page.url()).hash

test('menu to launching to app, and back through returning to the menu @desktop-only', async ({ page }) => {
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

test('the Back button returns the same way as Escape @desktop-only', async ({ page }) => {
  await openApp(page, 'Profile')
  await page.getByRole('button', { name: 'Back' }).click()
  await expectSettledOn(page, 'Profile')
  await sequence(page).toEqual(['menu', 'launching', 'app', 'returning', 'menu'])
})

test('power off from the menu, then back on, plays the boot @desktop-only', async ({ page }) => {
  await openMenu(page)
  await power(page, 'Power off').click()
  await expect(phase(page)).toHaveAttribute('data-console', 'off')
  await power(page, 'Power on').click()
  await expect(html(page)).toHaveAttribute('data-boot', '')
  await expectSettledOn(page, 'Profile')
  await sequence(page).toEqual(['menu', 'off', 'booting', 'menu'])
})

test('power off from an app goes straight to off and clears the address @desktop-only', async ({ page }) => {
  await openApp(page, 'Projects')
  await expect.poll(() => hash(page)).toBe('#projects')
  await power(page, 'Power off').click()
  await expect(phase(page)).toHaveAttribute('data-console', 'off')
  await expect(phase(page)).toHaveAttribute('data-power', 'off')
  await expect(page.locator('.dsi-app-lower')).toHaveCount(0)
  await expect.poll(() => hash(page)).toBe('')
  expect(await effectsEmpty(page)).toEqual([0, 0])
  await sequence(page).toEqual(['menu', 'launching', 'app', 'off'])
})

test('switching on after an app lands on the menu with the rail on Profile @desktop-only', async ({ page }) => {
  await openApp(page, 'Projects')
  await power(page, 'Power off').click()
  await power(page, 'Power on').click()
  await expectSettledOn(page, 'Profile')
})

test('an address that names an app opens it with no launch @desktop-only', async ({ page }) => {
  await page.goto('/#projects')
  await page.locator('.dsi-app-lower').waitFor({ timeout: 20_000 })
  await expect(phase(page)).toHaveAttribute('data-console', 'app')
  await sequence(page).toEqual(['menu', 'app'])
})

test('a hash change opens an app from the menu and switches apps from an app @desktop-only', async ({ page }) => {
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

test('a hash that names no app, or a dark console, changes nothing @desktop-only', async ({ page }) => {
  await openMenu(page)
  await page.evaluate(() => {
    location.hash = '#nothing'
  })
  await expect(phase(page)).toHaveAttribute('data-console', 'menu')
  await power(page, 'Power off').click()
  await expect(phase(page)).toHaveAttribute('data-power', 'off')
  await page.evaluate(() => {
    location.hash = '#projects'
  })
  // Nothing to wait for, so give an app a fair chance to (wrongly) appear.
  await expect(page.locator('.dsi-app-lower')).toHaveCount(0)
  await page.waitForTimeout(500)
  await expect(page.locator('.dsi-app-lower')).toHaveCount(0)
  await expect(phase(page)).toHaveAttribute('data-console', 'off')
  await expect(phase(page)).toHaveAttribute('data-power', 'off')
  await sequence(page).toEqual(['menu', 'off'])
})

test('a second launch, and power, are ignored while a launch is running @desktop-only', async ({ page }) => {
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

test('the arrow keys do not move the rail while an app is launching @desktop-only', async ({ page }) => {
  await openMenu(page)
  // The keys go out in the same task that paints `launching`, from the
  // observer that sees it, so they land mid-launch every time. The launch
  // needs frames and timers to finish, so it cannot get there first.
  const during = await page.evaluate(
    () =>
      new Promise<string | null>(resolve => {
        const device = document.querySelector('.dsi-device')!
        const watch = new MutationObserver(() => {
          if (device.getAttribute('data-console') !== 'launching') return
          watch.disconnect()
          for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowRight']) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
          }
          resolve(device.getAttribute('data-console'))
        })
        watch.observe(device, { attributes: true, attributeFilter: ['data-console'] })
        document.querySelector<HTMLElement>('.dsi-slot[data-sel]')!.click()
      }),
  )
  expect(during, 'the keys were sent mid-launch').toBe('launching')
  await page.locator('.dsi-app-lower').waitFor()

  await page.keyboard.press('Escape')
  await expectSettledOn(page, APPS[0])
  await sequence(page).toEqual(['menu', 'launching', 'app', 'returning', 'menu'])
})

test('a second Escape, and power, are ignored while returning @desktop-only', async ({ page }) => {
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

  test('booting hands over to the menu, and any key skips it @desktop-only', async ({ page }) => {
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
    await expect(html(page)).toHaveAttribute('data-boot', '')
    await page.keyboard.press('ArrowRight')
    await expect(html(page)).not.toHaveAttribute('data-boot', '', { timeout: 1000 })
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

  test('a visit that already booted does not boot again @desktop-only', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('dsi-booted', '1'))
    await page.goto('/')
    await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 20_000 })
    expect(await bootSeen(page)).toBe(false)
    await expect(phase(page)).toHaveAttribute('data-console', 'menu')
  })

  test("the DSi's own less-motion setting does not boot @desktop-only", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dsi-motion', 'reduce'))
    await page.goto('/')
    await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 20_000 })
    expect(await bootSeen(page)).toBe(false)
    await expect(phase(page)).toHaveAttribute('data-console', 'menu')
  })

  test('plain view does not boot @desktop-only', async ({ page }) => {
    await page.goto('/?view=plain')
    expect(await bootSeen(page)).toBe(false)
    await expect(page.locator('html')).not.toHaveAttribute('data-boot', '')
  })

  test('a hash that names no app still boots @desktop-only', async ({ page }) => {
    await page.goto('/#nothing')
    expect(await bootSeen(page)).toBe(true)
    await expect(phase(page)).toHaveAttribute('data-console', 'menu', { timeout: 20_000 })
  })

  for (const hash of ['#projects', '#about']) {
    test(`${hash}, an app's address or an alias, does not boot @desktop-only`, async ({ page }) => {
      await page.goto(`/${hash}`)
      // A deep link opens the app straight away, so there is no rail to wait on.
      await expect(phase(page)).toHaveAttribute('data-console', 'app', { timeout: 20_000 })
      expect(await bootSeen(page)).toBe(false)
    })
  }
})
