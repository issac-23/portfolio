import { mediaItems, mediaTypeLabels } from '../data/media'
import { projects, statusLabels } from '../data/projects'
import { expect, test } from './fixtures'
import { mockSpotifyQuiet } from './helpers/spotify'

/**
 * The classic site and the DSi's plain view word statuses and media types
 * from the same table in data/, so they cannot drift apart again (the classic
 * page once said "In Progress" where everything else said "In progress").
 */

test.beforeEach(({ page }) => mockSpotifyQuiet(page))

test('project statuses read the same on the classic page and in the plain view', async ({ page }) => {
  const expected = projects.map(p => statusLabels[p.status])

  await page.goto('/classic')
  await expect(page.locator('#projects span.rounded-full').filter({ hasText: /^(Live|In progress|Concept)$/ })).toHaveText(expected)

  await page.goto('/?view=plain')
  await expect(page.locator('.dsi-plain-badge')).toHaveText(expected)
})

test('media types read the same on the classic page and in the plain view', async ({ page }) => {
  await page.goto('/classic')
  for (const m of mediaItems) {
    const row = page.locator('#media a', { hasText: m.title })
    await expect(row.locator('span.rounded-full')).toHaveText(new RegExp(`${mediaTypeLabels[m.type].one}$`))
  }
  const chips = page.getByRole('group', { name: 'Filter media by type' }).getByRole('button')
  await expect(chips).toHaveText(['All', ...[...new Set(mediaItems.map(m => m.type))].map(t => mediaTypeLabels[t].many)])

  await page.goto('/?view=plain')
  for (const m of mediaItems) {
    await expect(page.locator('.dsi-plain-shelf li', { hasText: m.title }).locator('.dsi-plain-meta')).toContainText(
      `${mediaTypeLabels[m.type].one} by ${m.creator}`,
    )
  }
})
