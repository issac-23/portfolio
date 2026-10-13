import { channels, profile } from '../data/profile'
import { galleryPhotos } from '../data/gallery'
import { mediaItems } from '../data/media'
import { projects } from '../data/projects'
import { expect, test } from './fixtures'

/**
 * Plain view: the same content as the DSi, as an ordinary document. Checked
 * against the data files directly, so nothing the DSi shows can go missing
 * from it unnoticed.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/api/spotify/now-playing', r =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ isPlaying: false, recentTracks: [] }) }),
  )
  await page.goto('/?view=plain')
})

test('renders without the shell, as one document with one h1', async ({ page }) => {
  await expect(page.locator('.dsi-device, .dsi-screen, .dsi-rail')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(profile.name)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['About', 'Projects', 'Photos', 'Listening', 'Shelf', 'Contact'])
})

test('holds everything the DSi does', async ({ page }) => {
  for (const s of profile.stats) await expect(page.locator('.dsi-plain-stats')).toContainText(s.value)
  for (const p of projects) {
    await expect(page.getByRole('heading', { level: 3, name: new RegExp(p.title) })).toBeVisible()
    if (p.url) await expect(page.getByRole('link', { name: `Open ${p.title}` })).toHaveAttribute('href', p.url)
  }
  for (const ph of galleryPhotos) await expect(page.getByAltText(ph.alt ?? 'Gallery photo').first()).toBeAttached()
  for (const m of mediaItems) await expect(page.getByRole('link', { name: m.title })).toHaveAttribute('href', m.url)
  for (const c of channels) {
    await expect(page.locator('.dsi-plain-contact').getByRole('link', { name: c.handle })).toHaveAttribute('href', c.href)
  }
  await expect(page.getByRole('link', { name: 'Resume (PDF)' })).toHaveAttribute('href', '/resume.pdf')
})

test('scrolls like a page, because it is one', async ({ page }) => {
  const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)
  expect(scrolls).toBe(true)
  await page.mouse.wheel(0, 600)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})
