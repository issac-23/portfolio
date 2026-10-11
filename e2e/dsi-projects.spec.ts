import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { expectSettledOn, openMenu } from './helpers/dsi'

/**
 * Starting an app from the rail, and the first app that opens: Projects, the
 * game card select. Card titles are the ones in data/projects.ts.
 */

const CARDS = ['DCF Calculator', 'tally']

const cards = (page: Page) => page.getByRole('list', { name: 'Game cards' }).getByRole('button')

/**
 * Records what the launch draws while it runs, so a test can assert on an
 * animation that is over by the time anything else could look.
 */
async function watchEffects(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __fx: { maxIcons: number[]; added: number } }
    w.__fx = { maxIcons: [0, 0], added: 0 }
    new MutationObserver(records => {
      const layers = [...document.querySelectorAll('.dsi-fx')]
      for (const r of records) if (layers.includes(r.target as Element)) w.__fx.added += r.addedNodes.length
      layers.forEach((l, i) => {
        w.__fx.maxIcons[i] = Math.max(w.__fx.maxIcons[i] ?? 0, l.querySelectorAll('.dsi-fx-icon').length)
      })
    }).observe(document, { childList: true, subtree: true })
  })
}

const effects = (page: Page) =>
  page.evaluate(() => (window as unknown as { __fx: { maxIcons: number[]; added: number } }).__fx)

/** The rail's two screens' effects layers hold nothing once a transition ends. */
async function expectNoLeftovers(page: Page) {
  await expect
    .poll(() => page.evaluate(() => [...document.querySelectorAll('.dsi-fx')].map(l => l.childElementCount)))
    .toEqual([0, 0])
}

async function launchProjects(page: Page) {
  await openMenu(page)
  await page.keyboard.press('ArrowRight')
  await expectSettledOn(page, 'Projects')
  await page.keyboard.press('Enter')
  await expect(cards(page)).toHaveCount(CARDS.length)
  await expectNoLeftovers(page)
}

test('Enter with nothing focused starts the selected app', async ({ page }) => {
  await launchProjects(page)
  await expect(page.getByRole('heading', { level: 2, name: CARDS[0] })).toBeVisible()
  await expect(cards(page).first()).toBeFocused()
  await expect(cards(page).first()).toHaveAttribute('aria-pressed', 'true')
})

test('tapping another app selects it, tapping the selected one starts it', async ({ page }) => {
  await openMenu(page)
  const projects = page.getByRole('button', { name: 'Projects', exact: true })
  await projects.click()
  await expectSettledOn(page, 'Projects')
  await expect(cards(page)).toHaveCount(0)

  await projects.click()
  await expect(cards(page)).toHaveCount(CARDS.length)
})

test('apps that do not open yet stay on the menu', async ({ page }) => {
  await openMenu(page)
  await page.keyboard.press('Enter')
  // Long enough for a launch to have got well under way if one had started.
  await page.waitForTimeout(800)
  await expectSettledOn(page, 'Profile')
  await expect(cards(page)).toHaveCount(0)
})

test('the launch grows over both screens at once and leaves nothing behind', async ({ page }) => {
  await watchEffects(page)
  await launchProjects(page)
  const fx = await effects(page)
  expect(fx.maxIcons, 'an icon copy was drawn on each screen').toEqual([1, 1])
})

test('reduced motion swaps straight to the app with no effects', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await watchEffects(page)
  await launchProjects(page)
  expect((await effects(page)).added).toBe(0)
})

test('up and down move through the cards and the top screen follows', async ({ page }) => {
  await launchProjects(page)
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('heading', { level: 2, name: CARDS[1] })).toBeVisible()
  await expect(cards(page).nth(1)).toBeFocused()
  await expect(cards(page).nth(1)).toHaveAttribute('aria-pressed', 'true')

  // Stops at the ends rather than wrapping; it is a list, not the rail.
  await page.keyboard.press('ArrowDown')
  await expect(cards(page).nth(1)).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('heading', { level: 2, name: CARDS[0] })).toBeVisible()
})

test('Open and GitHub point at the selected card, in a new tab', async ({ page }) => {
  await launchProjects(page)
  const open = page.getByRole('link', { name: `Open ${CARDS[0]} (new tab)` })
  await expect(open).toHaveAttribute('href', 'https://dcf-calculator-issac.streamlit.app')
  await expect(open).toHaveAttribute('target', '_blank')
  await expect(page.getByRole('link', { name: `${CARDS[0]} on GitHub (new tab)` })).toHaveAttribute(
    'href',
    'https://github.com/issac-23/dcf-calculator',
  )

  await cards(page).nth(1).click()
  await expect(page.getByRole('link', { name: `Open ${CARDS[1]} (new tab)` })).toHaveAttribute(
    'href',
    'https://tally-issac.vercel.app/',
  )
})

test('the list scrolls inside the lower screen, never the page', async ({ page }) => {
  await launchProjects(page)
  // Two cards fit on every screen size, so make them tall enough to overflow.
  await page.addStyleTag({ content: '.dsi-card { min-height: 160px; }' })
  const list = page.getByRole('list', { name: 'Game cards' })
  await list.hover()
  await page.mouse.wheel(0, 300)

  // The screen's body is what scrolls, not the list inside it.
  await expect.poll(() => list.evaluate(el => el.closest('.dsi-app-body')!.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

for (const how of ['the Back button', 'Escape'] as const) {
  test(`${how} returns home with the rail still centred on Projects`, async ({ page }) => {
    await watchEffects(page)
    await launchProjects(page)

    if (how === 'Escape') await page.keyboard.press('Escape')
    else await page.getByRole('button', { name: 'Back' }).click()

    await expectSettledOn(page, 'Projects')
    await expect(page.getByRole('button', { name: 'Projects', exact: true })).toBeFocused()
    await expectNoLeftovers(page)
  })
}
