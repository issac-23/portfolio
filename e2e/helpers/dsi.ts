import { expect, type Page } from '@playwright/test'

/** Apps in rail order, by the accessible name each slot carries. */
export const APPS = [
  'Profile',
  'Projects',
  'Nintendo DSi Camera',
  'Nintendo DSi Sound',
  'Shelf',
  'Contact',
  'Resume',
  'System Settings',
] as const

export const mod = (n: number, m: number) => ((n % m) + m) % m

/**
 * Whole-pixel positioning cannot land exactly on a half-pixel centre, which
 * an odd viewport width produces, so 1px is the most precise it can be.
 */
export const CENTRE_TOLERANCE = 1

const SETTLE_TIMEOUT = 10_000

export interface RailState {
  /** How many slots are visually selected. Must always be exactly one. */
  selCount: number
  /** The app the middle copy reports as current, which is what a screen reader hears. */
  current: string | null
  /** Slots exposed to assistive tech. Must be one copy's worth, not three. */
  exposed: number
  /** Selected icon's horizontal distance from the viewport's centre, in px. */
  offBy: number
  /** Whether the rail runs off both edges, which is what makes it read as a carousel. */
  clipsBoth: boolean
  focus: string | null
  focusHidden: boolean
  scrollLeft: number
  name: string | null
  lit: number
  pageScrolls: boolean
}

export function railState(page: Page): Promise<RailState> {
  return page.evaluate(() => {
    const view = document.querySelector('.dsi-viewport')!.getBoundingClientRect()
    const rail = document.querySelector('.dsi-rail')!.getBoundingClientRect()
    const sel = [...document.querySelectorAll('.dsi-slot[data-sel]')]
    const ico = sel[0]?.querySelector('.dsi-ico')?.getBoundingClientRect()
    const ae = document.activeElement
    const de = document.documentElement
    return {
      selCount: sel.length,
      current: document.querySelector('.dsi-slot[aria-current="true"]')?.getAttribute('aria-label') ?? null,
      exposed: document.querySelectorAll('.dsi-slot:not([aria-hidden])').length,
      offBy: ico ? Math.round(ico.left + ico.width / 2 - (view.left + view.width / 2)) : Number.NaN,
      clipsBoth: rail.left < view.left - 1 && rail.right > view.right + 1,
      focus: ae?.getAttribute('aria-label') ?? null,
      focusHidden: ae?.getAttribute('aria-hidden') === 'true',
      scrollLeft: document.querySelector('.dsi-viewport')!.scrollLeft,
      name: document.querySelector('.dsi-namebox b')?.textContent ?? null,
      lit: [...document.querySelectorAll('.dsi-track i')].findIndex(i => i.hasAttribute('data-on')),
      pageScrolls: de.scrollHeight > de.clientHeight + 1,
    }
  })
}

/**
 * Opens the DSi menu and waits until it can actually be used.
 *
 * Interacting straight after goto() races hydration: a key pressed before
 * React attaches its listeners is simply lost. And under parallel load,
 * hydration alone can take longer than an assertion's 5s, which used to read
 * as "rail did not centre" when the rail was fine, just late.
 *
 * So wait for the rail's own ready marker, with room for a slow start, and
 * only then hold it to the strict centring check.
 */
export async function openMenu(page: Page) {
  await page.goto('/')
  await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: 20_000 })
  await expectSettledOn(page, APPS[0])
}

/**
 * Waits for the rail to settle on `app`, then checks everything that has to
 * hold whenever it is at rest: one selection, one copy exposed, centred,
 * running off both edges, and no page scroll.
 */
export async function expectSettledOn(page: Page, app: string) {
  // The rail may not exist yet: coming back from an app it remounts behind
  // the white flash, so wait for it before reading anything off it.
  await page.locator('.dsi-rail[data-ready]').waitFor({ state: 'attached', timeout: SETTLE_TIMEOUT })
  // 10s, not the default 5. Settling takes about 0.3s. The extra time only
  // absorbs a renderer starved by parallel workers, which paints late but
  // lands in the right place. A real mis-centre never recovers, so it still
  // fails, just later.
  await expect.poll(async () => (await railState(page)).current, { timeout: SETTLE_TIMEOUT }).toBe(app)
  try {
    await expect
      .poll(async () => Math.abs((await railState(page)).offBy), { timeout: SETTLE_TIMEOUT })
      .toBeLessThanOrEqual(CENTRE_TOLERANCE)
  } catch (err) {
    // A bare "5000ms exceeded" says nothing about why. Capture what the
    // centring maths was working from at the moment it gave up.
    const why = await page.evaluate(() => {
      const view = document.querySelector('.dsi-viewport') as HTMLElement
      const rail = document.querySelector('.dsi-rail') as HTMLElement
      const sel = document.querySelector('.dsi-slot[data-sel]') as HTMLElement
      const slots = [...rail.children] as HTMLElement[]
      return {
        viewClientWidth: view.clientWidth,
        viewRectWidth: view.getBoundingClientRect().width,
        selIndex: slots.indexOf(sel),
        selOffsetLeft: sel.offsetLeft,
        selOffsetWidth: sel.offsetWidth,
        expectedX: Math.round(view.clientWidth / 2 - (sel.offsetLeft + sel.offsetWidth / 2)),
        transform: rail.style.transform,
        transition: rail.style.transition,
        computed: getComputedStyle(rail).transform,
        docScrollbar: document.documentElement.clientWidth !== window.innerWidth,
      }
    })
    throw new Error(`rail did not centre on ${app}: ${JSON.stringify(why)}\n${(err as Error).message}`)
  }

  const s = await railState(page)
  expect(s.selCount, 'exactly one slot is selected').toBe(1)
  expect(s.exposed, 'only one copy is exposed to assistive tech').toBe(APPS.length)
  expect(s.name, 'name box shows the selected app').toBe(app)
  expect(s.clipsBoth, 'rail runs off both edges').toBe(true)
  expect(s.pageScrolls, 'page itself never scrolls').toBe(false)
  return s
}

/** What each screen's launch effects layer holds. Empty means no leftovers. */
export const effectsEmpty = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll('.dsi-fx')].map(l => l.childElementCount))

/** Starts `app` from a cold menu by walking the rail to it. */
export async function openApp(page: Page, app: (typeof APPS)[number]) {
  await openMenu(page)
  const steps = APPS.indexOf(app)
  for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowRight')
  await expectSettledOn(page, app)
  await page.keyboard.press('Enter')
  await page.locator('.dsi-app-lower').waitFor()
  await expect.poll(() => effectsEmpty(page)).toEqual([0, 0])
}
