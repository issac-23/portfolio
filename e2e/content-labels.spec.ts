import { galleryPhotos, photoLabel } from '../data/gallery'
import { isExternal } from '../data/links'
import { channels } from '../data/profile'
import { mediaItems, mediaTypeLabels } from '../data/media'
import { projects, statusLabels } from '../data/projects'
import { expect, test } from './fixtures'
import { mockSpotifyQuiet } from './helpers/spotify'

/**
 * The plain view words statuses, media types and photo names from the same
 * tables in data/ that the DSi apps read, so they cannot drift from the data.
 */

test.beforeEach(async ({ page }) => {
  await mockSpotifyQuiet(page)
  await page.goto('/?view=plain')
})

test('project statuses read as the data table words them', async ({ page }) => {
  await expect(page.locator('.dsi-plain-badge')).toHaveText(projects.map(p => statusLabels[p.status]))
})

test('media types read as the data table words them', async ({ page }) => {
  for (const m of mediaItems) {
    await expect(page.locator('.dsi-plain-shelf li', { hasText: m.title }).locator('.dsi-plain-meta')).toContainText(
      `${mediaTypeLabels[m.type]} by ${m.creator}`,
    )
  }
})

test('only web channels open in a new tab', async ({ page }) => {
  for (const c of channels) {
    const link = page.locator('.dsi-plain-contact').getByRole('link', { name: c.handle })
    await expect(link).toHaveAttribute('href', c.href)
    if (isExternal(c.href)) await expect(link).toHaveAttribute('target', '_blank')
    else await expect(link).not.toHaveAttribute('target', /.*/)
  }
})

test('gallery photos are named from the data', async ({ page }) => {
  expect(await page.locator('.dsi-plain-photos img').evaluateAll(imgs => imgs.map(i => i.getAttribute('alt')))).toEqual(
    galleryPhotos.map(photoLabel),
  )
})
